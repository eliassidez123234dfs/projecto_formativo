"""
Configuración de URLs raíz del proyecto Red Estampación.

Define la estructura de rutas URL del sistema, incluyendo:
  - Router DRF para ViewSets (usuarios, autenticación, admin, contacto).
  - Endpoints manuales (health check, sesión del editor 3D, verificación de email).
  - Inclusión de URLs de módulos: products, catalog, models3d, carts, checkout, orders, monitoring.
  - JWT (obtención y refresh de tokens).
  - Archivos media en desarrollo.

Patrón de diseño: URLDispatcher (Django).
Todas las rutas están bajo el prefijo /api/ excepto /admin/.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone
from datetime import datetime
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.users.api.token_refresh import UsuarioTokenRefreshView

# Importar viewsets
from apps.users.api.viewset import (
    RegistroViewSet,
    LoginViewSet,
    UsuarioViewSet
)

from apps.users.api.admin_viewset import AdminUsuarioViewSet
from apps.users.api.stats_viewset import AdminStatsViewSet
from apps.landing.api.viewset import ContactoViewSet
from apps.users.models import Token_Verificacion
from config.health import health_check

# ═══════════════════════════════════════════════════════════════════════
# Router DRF — Registro de ViewSets principales
# ═══════════════════════════════════════════════════════════════════════
# Cada registro genera automáticamente endpoints REST (list, create, retrieve, etc.)
router = DefaultRouter()

# ── Autenticación y gestión de usuarios ──
router.register(r'auth', RegistroViewSet, basename='auth')
router.register(r'login', LoginViewSet, basename='login')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

# ── Panel de administración (usuarios y estadísticas) ──
router.register(r'admin/usuarios', AdminUsuarioViewSet, basename='admin-usuario')
router.register(r'admin/stats', AdminStatsViewSet, basename='admin-stats')

# ── Formulario de contacto (landing) ──
router.register(r'contacto', ContactoViewSet, basename='contacto')


# ═══════════════════════════════════════════════════════════════════════
# Endpoints manuales — Health Check y Autenticación
# ═══════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════
# Endpoint de salud — Health Check para Render
# ═══════════════════════════════════════════════════════════════════════
def health_check(request):
    """Verifica la conectividad de PostgreSQL y MongoDB. Retorna estado 200 o 503."""
    from django.db import connection
    db_ok = True
    try:
        connection.ensure_connection()
    except Exception:
        db_ok = False

    mongo_ok = False
    try:
        from apps.users.mongodb import ping_mongo
        mongo_ok = ping_mongo()
    except Exception:
        pass

    status_code = 200 if db_ok else 503
    return JsonResponse({
        'status': 'ok' if db_ok else 'degraded',
        'postgres': db_ok,
        'mongo': mongo_ok,
    }, status=status_code)


from rest_framework.decorators import api_view, permission_classes as perm_decorator
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json


# ═══════════════════════════════════════════════════════════════════════
# Endpoint /api/me/ — Datos del usuario autenticado
# ═══════════════════════════════════════════════════════════════════════
def _editor_origin_allowed(request):
    origin = request.headers.get('Origin')
    return not origin or origin in settings.CORS_ALLOWED_ORIGINS


editor_session_signer = TimestampSigner(salt='editor-session-handoff')


def _editor_data_from_token(token):
    if not token:
        return None
    try:
        return editor_session_signer.unsign_object(token, max_age=60 * 60)
    except (BadSignature, SignatureExpired, TypeError, ValueError):
        return None


@api_view(['GET'])
@perm_decorator([IsAuthenticated])
def me_view(request):
    """Retorna los datos del usuario autenticado.
    Usado por restoreSession() en el frontend para obtener el perfil
    después de renovar el access token."""
    serializer = UsuarioSerializer(request.user)
    return JsonResponse(serializer.data)


# ═══════════════════════════════════════════════════════════════════════
# Endpoints del Editor 3D — Sesión segura entre pestañas
# ═══════════════════════════════════════════════════════════════════════
# Patrón: Cookie-based session sharing.
# El editor 3D (React) guarda selección del usuario en la cookie de sesión
# del backend, permitiendo compartir datos entre pestañas del mismo sitio.
# SEGURIDAD: Datos autoritativos (precio, stock) SIEMPRE se validan contra BD.

@csrf_exempt
@api_view(['POST'])
@perm_decorator([IsAuthenticated])
def editor_session_save(request):
    """Guarda datos sensibles del editor 3D en la sesión del backend (cookie).

    SEGURIDAD:
    - NUNCA se pasan por URL productId, variantId, quantity ni rol.
      Los datos viajan en el cuerpo de la petición y se guardan en la
      sesión Django (cookie sessionid, HttpOnly y SameSite).
    - El editor 3D (otra pestaña/origen del mismo sitio) lee estos datos
      mediante GET /api/editor-session/, reutilizando la misma cookie.
    - Sin autenticación JWT: el editor no puede acceder al access token
      en memoria del tab principal. La cookie de sesión es la única
      credencial compartida entre orígenes del mismo sitio.
    - Validación FUERTE contra la BD: producto activo/aprobado, variante
      perteneciente al producto, cantidad entre 1 y min(999, stock).
    - Los valores autoritativos (precio, stock, talla, color) SIEMPRE se
      derivan de la BD, nunca del cliente. La talla/color del payload se
      usa solo como referencia de UI y se descarta si no coincide con la
      variante.
    """
    if not _editor_origin_allowed(request):
        return JsonResponse({'error': 'Origen no permitido.'}, status=403)

    try:
        data = json.loads(request.body) if hasattr(request, 'body') else request.data
    except (json.JSONDecodeError, AttributeError):
        data = request.data

    if not isinstance(data, dict):
        return JsonResponse({'error': 'Cuerpo de la petición inválido.'}, status=400)

    product_id = data.get('productId')
    variant_id = data.get('variantId')

    if not product_id:
        return JsonResponse({'error': 'productId es requerido.'}, status=400)

    try:
        from apps.products.models import Product, Variant
        product = Product.objects.get(pk=int(product_id))
        if not product.is_active or not product.is_approved:
            return JsonResponse({'error': 'El producto no está disponible.'}, status=400)
        if variant_id:
            variant = Variant.objects.get(pk=int(variant_id), product=product)
        else:
            variant = product.variants.first()
            if not variant:
                return JsonResponse({'error': 'El producto no tiene variantes disponibles.'}, status=400)
    except (Product.DoesNotExist, Variant.DoesNotExist, TypeError, ValueError):
        return JsonResponse({'error': 'Producto o variante no válidos.'}, status=400)

    # Cantidad: entero estricto, acotada 1..min(999, stock) — se ignora
    # cualquier valor fuera de rango en lugar de fallar el flujo.
    try:
        quantity = int(data.get('quantity', 1))
    except (TypeError, ValueError):
        quantity = 1
    if quantity < 1 or quantity > 999:
        quantity = 1
    if quantity > variant.stock:
        return JsonResponse(
            {'error': 'La cantidad supera el stock disponible de la variante.'},
            status=400,
        )

    # Datos autoritativos: talla/color SIEMPRE desde la BD, nunca del cliente.
    editor_data = {
        'productId': str(product.id),
        'productName': product.name,
        'variantId': str(variant.id),
        'quantity': quantity,
        'userId': str(request.user.id) if request.user.is_authenticated else None,
        'size': variant.size,
        'color': variant.color,
        'colorHex': variant.color_hex or data.get('colorHex') or '#6B7280',
        # Timestamp de creación para expirar la sesión del editor.
        'createdAt': timezone.now().isoformat(),
    }
    request.session['editor_3d'] = editor_data
    request.session.save()

    return JsonResponse({
        'ok': True,
        'sessionToken': editor_session_signer.sign_object(editor_data),
    })


@csrf_exempt
@api_view(['GET'])
@perm_decorator([AllowAny])
def editor_session_get(request):
    """Recupera los datos del editor 3D desde la sesión del backend.

    Devuelve SOLO los campos necesarios para el flujo de guardado del
    diseño. La sesión expira después de EDITOR_SESSION_MAX_AGE minutos
    para evitar reutilizar datos obsoletos.
    """
    EDITOR_SESSION_MAX_AGE_MINUTES = 60
    editor_data = _editor_data_from_token(request.GET.get('sessionToken'))
    if not editor_data:
        editor_data = request.session.get('editor_3d')
    if not editor_data:
        return JsonResponse({'error': 'No hay datos de editor en la sesión'}, status=404)

    created_at = editor_data.get('createdAt')
    if created_at:
        try:
            created_dt = datetime.fromisoformat(created_at)
            if timezone.is_naive(created_dt):
                created_dt = timezone.make_aware(created_dt, timezone.get_current_timezone())
            if timezone.now() - created_dt > timezone.timedelta(minutes=EDITOR_SESSION_MAX_AGE_MINUTES):
                request.session.pop('editor_3d', None)
                request.session.save()
                return JsonResponse({'error': 'La sesión del editor ha expirado. Abre el editor desde el catálogo.'}, status=410)
        except (ValueError, TypeError):
            request.session.pop('editor_3d', None)
            request.session.save()
            return JsonResponse({'error': 'Sesión del editor inválida. Abre el editor desde el catálogo.'}, status=410)

    return JsonResponse({
        'productId': editor_data.get('productId'),
        'productName': editor_data.get('productName'),
        'variantId': editor_data.get('variantId'),
        'quantity': editor_data.get('quantity', 1),
        'size': editor_data.get('size'),
        'color': editor_data.get('color'),
        'colorHex': editor_data.get('colorHex'),
    })


@csrf_exempt
@api_view(['POST'])
@perm_decorator([AllowAny])
def editor_session_commit(request):
    """Agrega al carrito la selección validada guardada en la sesión.

    El cliente no puede escoger producto, variante ni cantidad en este paso.
    La sesión es de un solo uso y los datos comerciales se vuelven a validar
    contra la base de datos justo antes de modificar el carrito.
    """
    from django.db import transaction
    from apps.carts.models import Cart, CartItem
    from apps.carts.api.serializers import CartItemSerializer
    from apps.products.models import Product, Variant

    if not _editor_origin_allowed(request):
        return JsonResponse({'error': 'Origen no permitido.'}, status=403)

    try:
        design_payload = json.loads(request.body or '{}')
    except (TypeError, json.JSONDecodeError):
        design_payload = {}
    design_preview_url = design_payload.get('designPreviewUrl') or ''
    design_data = design_payload.get('designData') if isinstance(design_payload.get('designData'), dict) else {}

    editor_payload = design_payload.get('sessionToken') or request.GET.get('sessionToken')
    editor_data = _editor_data_from_token(editor_payload)
    if not editor_data:
        editor_data = request.session.get('editor_3d')
    if not editor_data:
        return JsonResponse({'error': 'La sesión del editor no existe o ya fue utilizada.'}, status=404)

    try:
        product = Product.objects.get(
            pk=int(editor_data['productId']), is_active=True, is_approved=True,
        )
        variant = Variant.objects.get(
            pk=int(editor_data['variantId']), product=product,
        )
        quantity = int(editor_data['quantity'])
    except (KeyError, TypeError, ValueError, Product.DoesNotExist, Variant.DoesNotExist):
        request.session.pop('editor_3d', None)
        request.session.save()
        return JsonResponse({'error': 'La selección del editor ya no es válida.'}, status=400)

    if quantity < 1 or quantity > 999 or quantity > variant.stock:
        request.session.pop('editor_3d', None)
        request.session.save()
        return JsonResponse({'error': 'La cantidad ya no está disponible.'}, status=400)

    if not request.session.session_key:
        request.session.save()

    with transaction.atomic():
        cart, _ = Cart.objects.get_or_create(
            session_key=request.session.session_key,
            defaults={'user': request.user if request.user.is_authenticated else None},
        )
        if request.user.is_authenticated and cart.user_id is None:
            cart.user = request.user
            cart.save(update_fields=['user'])

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={
                'quantity': quantity,
                'unit_price': variant.effective_price,
                'design_preview_url': design_preview_url or None,
                'design_data': design_data,
            },
        )
        if not created:
            new_quantity = item.quantity + quantity
            if new_quantity > variant.stock:
                return JsonResponse({'error': 'La cantidad total supera el stock disponible.'}, status=400)
            item.quantity = new_quantity
            item.unit_price = variant.effective_price
            if design_preview_url:
                item.design_preview_url = design_preview_url
            if design_data:
                item.design_data = design_data
            item.save(update_fields=['quantity', 'unit_price', 'design_preview_url', 'design_data', 'updated_at'])

    request.session.pop('editor_3d', None)
    request.session.save()
    return JsonResponse(CartItemSerializer(item, context={'request': request}).data, status=201)


# ═══════════════════════════════════════════════════════════════════════
# Verificación de email desde enlace del correo
# ═══════════════════════════════════════════════════════════════════════

def verificar_email_directo(request):
    """Redirige al frontend tras verificar el email con el token del enlace."""
    token = request.GET.get('token', '')
    if not token:
        return redirect(f"{settings.FRONTEND_URL}/login?error=token-no-encontrado")
    try:
        token_obj = Token_Verificacion.objects.get(
            token=token,
            tipo='Verificacion_Email',
            usado=False
        )
        if timezone.now() > token_obj.fecha_expiracion:
            return redirect(f"{settings.FRONTEND_URL}/login?error=token-expirado")
        usuario = token_obj.usuario
        usuario.email_verificado = True
        usuario.estado = 'Activo'
        usuario.save()
        token_obj.usado = True
        token_obj.save()
        return redirect(f"{settings.FRONTEND_URL}/login?verified=1")
    except Token_Verificacion.DoesNotExist:
        return redirect(f"{settings.FRONTEND_URL}/login?error=token-invalido")

from apps.users.api.serializers import UsuarioSerializer

# ═══════════════════════════════════════════════════════════════════════
# Patrón de URLs — urlpatterns
# ═══════════════════════════════════════════════════════════════════════
urlpatterns = [
    # ── Health check (monitoring) ──
    path('api/health/', health_check, name='health-check'),
    path('api/me/', me_view, name='me-view'),

    # ── Endpoints del Editor 3D (sesión segura entre pestañas) ──
    path('api/editor-session/save/', editor_session_save, name='editor-session-save'),
    path('api/editor-session/', editor_session_get, name='editor-session-get'),
    path('api/editor-session/commit/', editor_session_commit, name='editor-session-commit'),

    # ── Panel de administración Django ──
    path('admin/', admin.site.urls),

    # ── Verificación de email (enlace directo desde el correo) ──
    path('api/auth/verificar-email/', verificar_email_directo, name='verificar-email-directo'),

    # ── Router DRF (usuarios, auth, admin, contacto) ──
    path('api/', include(router.urls)),

    # ── JWT: obtención y refresh de tokens ──
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', UsuarioTokenRefreshView.as_view(), name='token_refresh'),

    # ── Módulos de negocio (cada app incluye sus propias URLs) ──
    path('api/products/', include('apps.products.api.urls')),
    path('api/catalog/', include('apps.catalog.api.urls')),
    path('api/models3d/', include('apps.models3d.api.urls')),
    path('api/cart/', include('apps.carts.api.urls')),

    # ── URLs de administración (carritos, órdenes) ──
    path('api/admin/carts/', include('apps.carts.api.admin_urls')),
    path('api/admin/orders/', include('apps.orders.api.admin_urls')),

    # ── Checkout y órdenes ──
    path('api/checkout/', include('apps.checkout.urls')),
    path('api/orders/', include('apps.orders.api.urls')),

    # ── Monitoreo / logs de errores del frontend ──
    path('api/logging/', include('apps.monitoring.urls')),
]

# ── Archivos media en desarrollo (imágenes, uploads) ──
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
