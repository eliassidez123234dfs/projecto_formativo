from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import Model3DViewSet, Model3DImageViewSet
from .cloudinary_views import CloudinaryResourceAPIView, CloudinaryDeleteAPIView

router = DefaultRouter()
router.register(r'models', Model3DViewSet, basename='model3d')
router.register(r'images', Model3DImageViewSet, basename='model3d-image')

app_name = 'models3d'

urlpatterns = [
    path('', include(router.urls)),
    path('cloudinary/', CloudinaryResourceAPIView.as_view(), name='cloudinary-list'),
    path('cloudinary/delete/', CloudinaryDeleteAPIView.as_view(), name='cloudinary-delete'),
]
