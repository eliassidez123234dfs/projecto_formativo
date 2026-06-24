from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewset import ProductViewSet, ReviewViewSet

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='product')
router.register(r'reviews', ReviewViewSet, basename='review')

urlpatterns = [
    path('', include(router.urls)),
]
