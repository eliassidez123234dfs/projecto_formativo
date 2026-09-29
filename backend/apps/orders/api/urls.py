from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewsets import OrderViewSet
from .invoice_viewset import InvoiceViewSet
from .interservice import check_product_orders

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='order')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    # Inter-servicio (Spring → Django): consulta de órdenes por producto
    path('check-product/<int:product_id>/', check_product_orders, name='check-product-orders'),
    path('', include(router.urls)),
]
