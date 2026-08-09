from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewset import CatalogViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'', CatalogViewSet, basename='catalog')

urlpatterns = [
    path('', include(router.urls)),
]
