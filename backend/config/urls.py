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
from apps.users.api.serializers import UsuarioSerializer
from apps.users.models import Token_Verificacion
from config.health import health_check

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
    """Endpoint de salud para Render. Verifica PostgreSQL."""
    from django.db import connection
    db_ok = True
    try:
        connection.ensure_connection()
    except Exception:
        db_ok = False

    status_code = 200 if db_ok else 503
    return JsonResponse({
        'status': 'ok' if db_ok else 'degraded',
        'postgres': db_ok,
    }, status=status_code)


from rest_framework.decorators import api_view, permission_classes as perm_decorator
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json


def _editor_origin_allowed(request):
    origin = request.headers.get('Origin')
    return not origin or origin in settings.CORS_ALLOWED_ORIGINS


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
@perm_decorator([IsAuthenticated])
def editor_session_save(request):
    """Guarda datos sensibles del editor 3D en la BD con un token temporal.

    SEGURIDAD:
    - Los datos viajan en el cuerpo de la petición y se guardan en la BD
      con un token UUID de una sola vez (expira en 60 minutos).
    - El editor 3D (origen distinto) lee estos datos usando el token
      pasado por URL, sin depender de cookies cross-site.
    - Validación FUERTE contra la BD: producto activo/aprobado, variante
      perteneciente al producto, cantidad entre 1 y min(999, stock).
    """
    if not _editor_origin_allowed(request):
        return JsonResponse({'error': 'Origen no permitido.'}, status=403)

    try:
        data = json.loads(request.body) if hasattr(request, 'body') else request.data
    except (json.JSONDecodeError, AttributeError):
        data = request.data

    if not isinstance(data, dict):
        return JsonResponse({'error': 'El cuerpo de la petición debe ser un JSON válido.', 'code': 'INVALID_BODY'}, status=400)

    product_id = data.get('productId')
    variant_id = data.get('variantId')

    if not product_id or not variant_id:
        return JsonResponse({'error': 'Se requieren los campos productId y variantId.', 'code': 'MISSING_FIELDS'}, status=400)

    try:
        from apps.products.models import Product, Variant
        product = Product.objects.get(pk=int(product_id))
        if not product.is_active or not product.is_approved:
            return JsonResponse({'error': 'El producto no está disponible para personalización.', 'code': 'PRODUCT_UNAVAILABLE'}, status=400)
        variant = Variant.objects.get(pk=int(variant_id), product=product)
    except (Product.DoesNotExist, Variant.DoesNotExist, TypeError, ValueError):
        return JsonResponse({'error': 'El producto o la variante seleccionada no existen.', 'code': 'INVALID_PRODUCT_VARIANT'}, status=400)

    try:
        quantity = int(data.get('quantity', 1))
    except (TypeError, ValueError):
        quantity = 1
    if quantity < 1 or quantity > 999:
        quantity = 1
    if quantity > variant.stock:
        return JsonResponse(
            {'error': f'El stock de la variante {variant.size} {variant.color} es {variant.stock}. La cantidad solicitada ({quantity}) lo supera.', 'code': 'INSUFFICIENT_STOCK'},
            status=400,
        )

    editor_data = {
        'productId': str(product.id),
        'productName': product.name,
        'variantId': str(variant.id),
        'quantity': quantity,
        'userId': str(request.user.id) if request.user.is_authenticated else None,
        'size': variant.size,
        'color': variant.color,
        'colorHex': variant.color_hex or data.get('colorHex') or '#6B7280',
        'createdAt': timezone.now().isoformat(),
    }

    from apps.models3d.editor_session import EditorSession
    session = EditorSession.objects.create(
        data=editor_data,
        is_admin_session=bool(data.get('isAdmin', False)),
    )

    return JsonResponse({'ok': True, 'token': str(session.token)})


@csrf_exempt
@api_view(['GET'])
@perm_decorator([AllowAny])
def editor_session_get(request):
    """Recupera los datos del editor 3D usando un token temporal.

    El token se pasa como query param ?token=... o header X-Editor-Token.
    La sesión expira después de 60 minutos y se marca como usada al commit.
    """
    EDITOR_SESSION_MAX_AGE_MINUTES = 60

    token_str = request.GET.get('token') or request.headers.get('X-Editor-Token')
    if not token_str:
        return JsonResponse({'error': 'Token de sesión requerido.'}, status=400)

    from apps.models3d.editor_session import EditorSession
    try:
        session = EditorSession.objects.get(token=token_str)
    except (EditorSession.DoesNotExist, ValueError):
        return JsonResponse({'error': 'Sesión del editor no válida.'}, status=404)

    if session.used:
        return JsonResponse({
            'error': 'Esta sesión del editor ya fue utilizada. Si ya guardaste un diseño, revisá el producto en el catálogo.',
            'code': 'SESSION_ALREADY_USED',
        }, status=409)

    if session.is_expired(EDITOR_SESSION_MAX_AGE_MINUTES):
        session.delete()
        return JsonResponse({
            'error': 'La sesión del editor ha expirado (60 minutos). Volvé a abrir el editor desde el producto.',
            'code': 'SESSION_EXPIRED',
        }, status=410)

    editor_data = session.data
    return JsonResponse({
        'productId': editor_data.get('productId'),
        'productName': editor_data.get('productName'),
        'variantId': editor_data.get('variantId'),
        'quantity': editor_data.get('quantity', 1),
        'size': editor_data.get('size'),
        'color': editor_data.get('color'),
        'colorHex': editor_data.get('colorHex'),
        'isAdminSession': session.is_admin_session,
    })


@csrf_exempt
@api_view(['POST'])
@perm_decorator([AllowAny])
def editor_session_commit(request):
    """Agrega al carrito la selección validada usando el token temporal.

    El token se pasa como query param ?token=... o header X-Editor-Token.
    La sesión es de un solo uso y los datos se revalidan contra la BD.
    Body opcional: { "image_id": 123 } — imagen del diseño del editor 3D.
    """
    from django.db import transaction
    from apps.carts.models import Cart, CartItem
    from apps.carts.api.serializers import CartItemSerializer
    from apps.products.models import Product, ProductImage, Variant

    if not _editor_origin_allowed(request):
        return JsonResponse({'error': 'Origen no permitido.'}, status=403)

    token_str = request.GET.get('token') or request.headers.get('X-Editor-Token')
    if not token_str:
        return JsonResponse({'error': 'Token de sesión requerido.'}, status=400)

    # Leer image_id del body (opcional)
    image_id = None
    try:
        body = request.data if hasattr(request, 'data') else {}
        image_id = body.get('image_id')
    except Exception:
        pass

    from apps.models3d.editor_session import EditorSession
    try:
        session = EditorSession.objects.get(token=token_str, used=False)
    except (EditorSession.DoesNotExist, ValueError):
        return JsonResponse({'error': 'La sesión del editor no existe o ya fue utilizada. Abrí el editor desde el producto.', 'code': 'SESSION_NOT_FOUND'}, status=404)

    if session.is_expired():
        session.delete()
        return JsonResponse({'error': 'La sesión del editor ha expirado (60 minutos). Volvé a abrir el editor desde el producto.', 'code': 'SESSION_EXPIRED'}, status=410)

    editor_data = session.data

    try:
        product = Product.objects.get(
            pk=int(editor_data['productId']), is_active=True, is_approved=True,
        )
        variant = Variant.objects.get(
            pk=int(editor_data['variantId']), product=product,
        )
        quantity = int(editor_data['quantity'])
    except (KeyError, TypeError, ValueError, Product.DoesNotExist, Variant.DoesNotExist):
        session.delete()
        return JsonResponse({'error': 'El producto o la variante del editor ya no están disponibles. Abrí el editor de nuevo.', 'code': 'INVALID_SELECTION'}, status=400)

    if quantity < 1 or quantity > 999 or quantity > variant.stock:
        session.delete()
        return JsonResponse({'error': f'El stock de la variante {variant.size} {variant.color} ya no está disponible ({variant.stock} unidades).', 'code': 'OUT_OF_STOCK'}, status=400)

    # Validar image_id si se proporcionó
    product_image = None
    if image_id:
        try:
            product_image = ProductImage.objects.get(pk=int(image_id), product=product)
        except (ProductImage.DoesNotExist, TypeError, ValueError):
            return JsonResponse({'error': 'La imagen del diseño no fue encontrada.'}, status=404)

    session_key = request.session.session_key
    if not session_key:
        request.session.save()
        session_key = request.session.session_key

    with transaction.atomic():
        cart, _ = Cart.objects.get_or_create(
            session_key=session_key,
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
                'product_image': product_image,
            },
        )
        if not created:
            new_quantity = item.quantity + quantity
            if new_quantity > variant.stock:
                return JsonResponse({'error': 'La cantidad total supera el stock disponible.'}, status=400)
            item.quantity = new_quantity
            item.unit_price = variant.effective_price
            if product_image:
                item.product_image = product_image
            item.save(update_fields=['quantity', 'unit_price', 'product_image', 'updated_at'])

    session.used = True
    session.save(update_fields=['used'])

    return JsonResponse(CartItemSerializer(item, context={'request': request}).data, status=201)


@csrf_exempt
@api_view(['POST'])
@perm_decorator([AllowAny])
def editor_session_link_design(request):
    """Vincula un diseño de Cloudinary al producto usando el token de sesión.

    Body: { "token": "uuid", "cloudinary_url": "https://res.cloudinary.com/..." }

    El token fue creado por el admin al abrir el editor. No se necesita JWT.
    """
    import io
    import requests as http_requests
    from django.core.files.base import ContentFile
    from apps.products.models import Product, ProductImage
    from apps.models3d.editor_session import EditorSession

    data = request.data
    token_str = data.get('token')
    cloudinary_url = data.get('cloudinary_url')

    if not token_str or not cloudinary_url:
        return JsonResponse({'error': 'Se requieren los campos token y cloudinary_url.', 'code': 'MISSING_FIELDS'}, status=400)

    try:
        session = EditorSession.objects.get(token=token_str, used=False)
    except (EditorSession.DoesNotExist, ValueError):
        return JsonResponse({'error': 'La sesión del editor no es válida o ya fue utilizada. Abrí el editor desde el producto.', 'code': 'SESSION_NOT_FOUND'}, status=404)

    if session.is_expired():
        session.delete()
        return JsonResponse({'error': 'La sesión del editor ha expirado (60 minutos). Volvé a abrir el editor desde el producto.', 'code': 'SESSION_EXPIRED'}, status=410)

    product_id = session.data.get('productId')
    if not product_id:
        return JsonResponse({'error': 'La sesión no tiene un producto asociado. Abrí el editor desde la ficha de un producto.', 'code': 'NO_PRODUCT'}, status=400)

    try:
        product = Product.objects.get(pk=int(product_id))
    except (Product.DoesNotExist, TypeError, ValueError):
        return JsonResponse({'error': 'El producto ya no existe en el sistema.', 'code': 'PRODUCT_NOT_FOUND'}, status=404)

    # Descargar imagen desde Cloudinary
    try:
        img_response = http_requests.get(cloudinary_url, timeout=15)
        img_response.raise_for_status()
    except http_requests.Timeout:
        return JsonResponse({'error': 'La descarga de la imagen desde Cloudinary tardó demasiado. Intentá de nuevo.', 'code': 'CLOUDINARY_TIMEOUT'}, status=502)
    except Exception:
        return JsonResponse({'error': 'No se pudo descargar la imagen desde Cloudinary. Verificá que la URL sea válida.', 'code': 'CLOUDINARY_ERROR'}, status=502)

    # Verificar límite de imágenes antes de crear
    existing_count = ProductImage.objects.filter(product=product).count()
    if existing_count >= 5:
        return JsonResponse({
            'error': f'Este producto ya tiene el máximo de imágenes permitidas ({existing_count}/5). Eliminá una antes de agregar otra.',
            'code': 'IMAGE_LIMIT_REACHED',
        }, status=409)

    # Crear ProductImage
    filename = f"design_{product.id}_{timezone.now().strftime('%Y%m%d%H%M%S')}.png"
    img_file = ContentFile(img_response.content, name=filename)

    image = ProductImage(
        product=product,
        image=img_file,
        is_main=(existing_count == 0),
        order=existing_count + 1,
    )
    image.save()

    session.used = True
    session.save(update_fields=['used'])

    return JsonResponse({
        'ok': True,
        'image_id': image.id,
        'image_url': image.image.url if image.image else None,
        'product_id': product.id,
    }, status=201)


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
    path('api/health/', health_check, name='health-check'),
    # Admin
    path('admin/', admin.site.urls),

    # Usuario autenticado
    path('api/me/', me_view, name='me-view'),

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

    # Editor 3D — sesión segura (datos sensibles en cookie, no en URL)
    path('api/editor-session/save/', editor_session_save, name='editor-session-save'),
    path('api/editor-session/', editor_session_get, name='editor-session-get'),
    path('api/editor-session/commit/', editor_session_commit, name='editor-session-commit'),
    path('api/editor-session/link-design/', editor_session_link_design, name='editor-session-link-design'),
]

# Media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)