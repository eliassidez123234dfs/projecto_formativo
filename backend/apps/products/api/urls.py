from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewset import ProductViewSet

router = DefaultRouter()
router.register(r'', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
]
