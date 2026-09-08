from django.urls import path
from .admin import AdminOrderViewSet

admin_list = AdminOrderViewSet.as_view({'get': 'list'})
admin_detail = AdminOrderViewSet.as_view({'get': 'retrieve'})
admin_factura_pdf = AdminOrderViewSet.as_view({'get': 'factura_pdf'})

urlpatterns = [
    path('', admin_list, name='admin-order-list'),
    path('<int:pk>/', admin_detail, name='admin-order-detail'),
    path('<int:pk>/factura_pdf/', admin_factura_pdf, name='admin-order-factura-pdf'),
]

