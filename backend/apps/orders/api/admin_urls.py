from django.urls import path
from .admin import AdminOrderViewSet

admin_list = AdminOrderViewSet.as_view({'get': 'list'})
admin_detail = AdminOrderViewSet.as_view({'get': 'retrieve'})

urlpatterns = [
    path('', admin_list, name='admin-order-list'),
    path('<int:pk>/', admin_detail, name='admin-order-detail'),
]
