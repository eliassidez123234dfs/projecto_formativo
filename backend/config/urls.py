from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.utils import timezone

import config.admin_site  # noqa: F401 - configura has_permission del admin

from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)

# Importar viewsets
from apps.users.api.viewset import (
    RegistroViewSet,
    LoginViewSet,
    UsuarioViewSet
)

from apps.users.api.admin_viewset import AdminUsuarioViewSet
from apps.users.api.stats_viewset import AdminStatsViewSet
from apps.users.api.mongo_views import (
    SavedDesignViewSet,
    AuditLogViewSet,
    CartSessionViewSet,
    CommunityTemplateViewSet,
)
from apps.landing.api.viewset import ContactoViewSet
from apps.users.models import Token_Verificacion

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

# MongoDB — Diseños 3D guardados
router.register(r'designs', SavedDesignViewSet, basename='saved-design')
# MongoDB — Logs de auditoría (event sourcing)
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
# MongoDB — Carritos persistentes
router.register(r'cart-sessions', CartSessionViewSet, basename='cart-session')
# MongoDB — Plantillas de la comunidad
router.register(r'templates', CommunityTemplateViewSet, basename='community-template')

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

# Health check para Render
def health_check(request):
    return JsonResponse({'status': 'ok', 'timestamp': timezone.now().isoformat()})

urlpatterns = [
    # Health check
    path('api/health/', health_check, name='health-check'),

    # Admin (solo superusuarios)
    path('admin/', admin.site.urls),

    # VerificaciÃ³n directa de email desde el link del correo
    path('api/auth/verificar-email/', verificar_email_directo, name='verificar-email-directo'),

    # API Router
    path('api/', include(router.urls)),

    # JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Productos
    path('api/products/', include('apps.products.api.urls')),

    # CatÃ¡logo
    path('api/catalog/', include('apps.catalog.api.urls')),

    # Modelos 3D
    path('api/models3d/', include('apps.models3d.api.urls')),

    # Carrito
    path('api/cart/', include('apps.carts.api.urls')),

    # Admin carritos
    path('api/admin/carts/', include('apps.carts.api.admin_urls')),

    # Ã“rdenes
    path('api/checkout/', include('apps.checkout.urls')),
    path('api/orders/', include('apps.orders.api.urls')),
    path('api/admin/orders/', include('apps.orders.api.admin_urls')),
]

# Media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
