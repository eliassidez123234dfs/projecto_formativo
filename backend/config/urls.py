from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse

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

def api_root(request):
    """API Root - Lista todos los endpoints disponibles"""
    return JsonResponse({
        'message': 'Proyecto Formativo API',
        'version': '1.0.0',
        'endpoints': {
            'products': '/api/products/',
            'catalog': '/api/catalog/',
            'cart': '/api/cart/',
            'checkout': '/api/checkout/',
            'orders': '/api/orders/',
            'admin': '/admin/'
        },
        'documentation': 'https://github.com/tu-repo/projecto_formativo'
    })

def home_redirect(request):
    """Redirigir a la documentación o frontend"""
    return JsonResponse({
        'message': 'Proyecto Formativo - Tienda de Ropa Virtual con Estampados 3D',
        'frontend': 'http://localhost:5173',
        'admin': '/admin/',
        'api': '/api/',
        'endpoints': {
            'products': '/api/products/',
            'catalog': '/api/catalog/',
            'cart': '/api/cart/'
        }
    })

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
    path('', home_redirect, name='home'),
    path('api/', api_root, name='api_root'),
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