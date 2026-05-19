from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

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
from apps.landing.api.viewset import ContactoViewSet

# Crear router
router = DefaultRouter()

# Rutas usuarios
router.register(r'auth', RegistroViewSet, basename='auth')
router.register(r'login', LoginViewSet, basename='login')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'admin/usuarios', AdminUsuarioViewSet, basename='admin-usuario')

# Landing
router.register(r'contacto', ContactoViewSet, basename='contacto')

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # API Router
    path('api/', include(router.urls)),

    # JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Productos
    path('api/products/', include('apps.products.api.urls')),

    # Catálogo
    path('api/catalog/', include('apps.catalog.api.urls')),

    # Carrito
    path('api/cart/', include('apps.carts.api.urls')),

    # Órdenes
    path('api/checkout/', include('apps.checkout.urls')),
    path('api/orders/', include('apps.orders.urls')),
]

# Media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)