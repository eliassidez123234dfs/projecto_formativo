"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse

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

urlpatterns = [
    path('', home_redirect, name='home'),
    path('api/', api_root, name='api_root'),
    path('admin/', admin.site.urls),
    path('api/products/', include('apps.products.api.urls')),
    path('api/catalog/', include('apps.catalog.api.urls')),
    path('api/cart/', include('apps.carts.api.urls')),
    path('api/checkout/', include('apps.checkout.urls')),
    path('api/orders/', include('apps.orders.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
