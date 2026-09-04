from django.urls import path
from .viewset import AdminCartViewSet

urlpatterns = [
    path('', AdminCartViewSet.as_view({'get': 'list'}), name='admin-cart-list'),
    path('<int:pk>/', AdminCartViewSet.as_view({'get': 'retrieve'}), name='admin-cart-detail'),
]
