"""
URLs internas de productos (servicio-a-servicio).

Se montan desde config/urls.py bajo /api/internal/products/ y exigen el
header `X-Internal-Token`. NO forman parte de la API pública del frontend.
"""
from django.urls import path

from . import internal_views

urlpatterns = [
    path('health/', internal_views.products_health, name='internal-products-health'),
    path('stats/', internal_views.products_stats, name='internal-products-stats'),
    path('recent/', internal_views.products_recent, name='internal-products-recent'),
    path('exists/', internal_views.products_exists, name='internal-products-exists'),
]
