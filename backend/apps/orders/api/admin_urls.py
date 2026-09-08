from django.urls import path
from .admin_viewsets import AdminOrderViewSet

admin_list = AdminOrderViewSet.as_view({'get': 'list'})
admin_detail = AdminOrderViewSet.as_view({
    'get': 'retrieve',
    'patch': 'status',
})
admin_approve = AdminOrderViewSet.as_view({'post': 'approve'})
admin_reprocess = AdminOrderViewSet.as_view({'post': 'reprocess'})
admin_factura_pdf = AdminOrderViewSet.as_view({'get': 'factura_pdf'})

urlpatterns = [
    path('', admin_list, name='admin-order-list'),
    path('<int:pk>/', admin_detail, name='admin-order-detail'),
    path('<int:pk>/approve/', admin_approve, name='admin-order-approve'),
    path('<int:pk>/reprocess/', admin_reprocess, name='admin-order-reprocess'),
    path('<int:pk>/factura_pdf/', admin_factura_pdf, name='admin-order-factura-pdf'),
]
