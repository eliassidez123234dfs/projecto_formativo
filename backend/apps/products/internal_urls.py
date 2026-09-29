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
    # Categorías por ObjectId. Dos vistas distintas porque una lee y la otra
    # reemplaza el conjunto; <str:> porque el producto se identifica por su
    # ObjectId de Mongo (24 hex), no por un entero.
    path(
        'categories/<str:product_ref>/',
        internal_views.products_categories,
        name='internal-products-categories',
    ),
    path(
        'categories/<str:product_ref>/set/',
        internal_views.products_categories_set,
        name='internal-products-categories-set',
    ),
    # Purga en cascada del lado Django: <str:> porque el producto se
    # identifica por su ObjectId de Mongo (24 hex), no por un entero.
    path(
        'dependencies/<str:product_ref>/',
        internal_views.products_dependencies,
        name='internal-products-dependencies',
    ),
]
