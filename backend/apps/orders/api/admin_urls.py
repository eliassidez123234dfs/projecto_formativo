from django.urls import path
from .admin_viewsets import AdminOrderViewSet

urlpatterns = [
    path('', AdminOrderViewSet.as_view({'get': 'list'}), name='admin-order-list'),
    path('<int:pk>/', AdminOrderViewSet.as_view({'get': 'retrieve'}), name='admin-order-detail'),
    path('<int:pk>/status/', AdminOrderViewSet.as_view({'patch': 'status'}), name='admin-order-status'),
    path('<int:pk>/reprocess/', AdminOrderViewSet.as_view({'post': 'reprocess'}), name='admin-order-reprocess'),
]
