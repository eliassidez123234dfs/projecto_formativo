from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils import timezone

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
from apps.users.api.serializers import UsuarioSerializer

# Crear router
router = DefaultRouter()

# Rutas usuarios
router.register(r'auth', RegistroViewSet, basename='auth')
router.register(r'login', LoginViewSet, basename='login')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'admin/usuarios', AdminUsuarioViewSet, basename='admin-usuario')
router.register(r'admin/stats', AdminStatsViewSet, basename='admin-stats')

# Landing
router.register(r'contacto', ContactoViewSet, basename='contacto')


def health_check(request):
    """Endpoint de salud para Render. Verifica PostgreSQL y MongoDB."""
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


from rest_framework.decorators import api_view, permission_classes as perm_decorator, authentication_classes as auth_decorator
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json


@api_view(['GET'])
@perm_decorator([IsAuthenticated])
def me_view(request):
    """Endpoint /api/me/ — retorna los datos del usuario autenticado.
    Usado por restoreSession() en el frontend para obtener el perfil
    después de renovar el access token."""
    serializer = UsuarioSerializer(request.user)
    return JsonResponse(serializer.data)


@csrf_exempt
@api_view(['POST'])
@auth_decorator([])
@perm_decorator([AllowAny])
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
    try:
        data = json.loads(request.body) if hasattr(request, 'body') else request.data
    except (json.JSONDecodeError, AttributeError):
        data = request.data

    if not isinstance(data, dict):
        return JsonResponse({'error': 'Cuerpo de la petición inválido.'}, status=400)

    product_id = data.get('productId')
    variant_id = data.get('variantId')

    if not product_id or not variant_id:
        return JsonResponse({'error': 'productId y variantId son requeridos.'}, status=400)

    try:
        from apps.products.models import Product, Variant
        product = Product.objects.get(pk=int(product_id))
        if not product.is_active or not product.is_approved:
            return JsonResponse({'error': 'El producto no está disponible.'}, status=400)
        variant = Variant.objects.get(pk=int(variant_id), product=product)
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
        'size': variant.size,
        'color': variant.color,
        'colorHex': variant.color_hex or data.get('colorHex') or '#6B7280',
        # Timestamp de creación para expirar la sesión del editor.
        'createdAt': timezone.now().isoformat(),
    }
    request.session['editor_3d'] = editor_data
    request.session.save()

    return JsonResponse({'ok': True})


@csrf_exempt
@api_view(['GET'])
@auth_decorator([])
@perm_decorator([AllowAny])
def editor_session_get(request):
    """Recupera los datos del editor 3D desde la sesión del backend.

    Devuelve SOLO los campos necesarios para el flujo de guardado del
    diseño. La sesión expira después de EDITOR_SESSION_MAX_AGE minutos
    para evitar reutilizar datos obsoletos.
    """
    EDITOR_SESSION_MAX_AGE_MINUTES = 60
    editor_data = request.session.get('editor_3d')
    if not editor_data:
        return JsonResponse({'error': 'No hay datos de editor en la sesión'}, status=404)

    created_at = editor_data.get('createdAt')
    if created_at:
        try:
            created_dt = timezone.datetime.fromisoformat(created_at)
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

# Vista directa para verificar email desde el link del correo
def verificar_email_directo(request):
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

urlpatterns = [
    # Health check (Render, monitoreo)
    path('api/health/', health_check, name='health-check'),

    # Datos del usuario autenticado (restoreSession en frontend)
    path('api/me/', me_view, name='me'),

    # Sesión del editor 3D (datos sensibles fuera de la URL)
    path('api/editor-session/save/', editor_session_save, name='editor-session-save'),
    path('api/editor-session/', editor_session_get, name='editor-session-get'),

    # Admin
    path('admin/', admin.site.urls),

    # Verificación directa de email desde el link del correo
    path('api/auth/verificar-email/', verificar_email_directo, name='verificar-email-directo'),

    # API Router
    path('api/', include(router.urls)),

    # JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', UsuarioTokenRefreshView.as_view(), name='token_refresh'),

    # Productos
    path('api/products/', include('apps.products.api.urls')),

    # Catálogo
    path('api/catalog/', include('apps.catalog.api.urls')),

    # Modelos 3D
    path('api/models3d/', include('apps.models3d.api.urls')),

    # Carrito
    path('api/cart/', include('apps.carts.api.urls')),

    # Admin carritos
    path('api/admin/carts/', include('apps.carts.api.admin_urls')),

    # Admin órdenes
    path('api/admin/orders/', include('apps.orders.api.admin_urls')),

    # Órdenes
    path('api/checkout/', include('apps.checkout.urls')),
    path('api/orders/', include('apps.orders.api.urls')),

    # Monitoreo / logs de errores del frontend
    path('api/logging/', include('apps.monitoring.urls')),
]

# Media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)