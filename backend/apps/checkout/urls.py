from django.urls import path

from .views import checkout_confirm, checkout_summary, download_order_invoice_pdf, create_wompi_payment

urlpatterns = [
    path('summary/', checkout_summary, name='checkout-summary'),
    path('confirm/', checkout_confirm, name='checkout-confirm'),
    path('orders/<int:order_id>/pay/', create_wompi_payment, name='checkout-wompi-pay'),
    path('orders/<int:order_id>/invoice-pdf/', download_order_invoice_pdf, name='checkout-order-invoice-pdf'),
]

