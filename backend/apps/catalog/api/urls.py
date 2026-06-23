from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewset import CatalogViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'', CatalogViewSet, basename='catalog')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
]
