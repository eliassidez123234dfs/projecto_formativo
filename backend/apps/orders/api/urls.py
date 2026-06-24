from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .viewsets import OrderViewSet
from .invoice_viewset import InvoiceViewSet

router = DefaultRouter()
router.register(r'', OrderViewSet, basename='order')
router.register(r'invoices', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', include(router.urls)),
]
