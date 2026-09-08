from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewset import ProductViewSet, ReviewViewSet, ProductImageViewSet, link_design_to_product

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='product')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'images', ProductImageViewSet, basename='product-image')

urlpatterns = [
    path('link-design/', link_design_to_product, name='link-design-to-product'),
    path('', include(router.urls)),
]
