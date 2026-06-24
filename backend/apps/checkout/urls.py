from django.urls import path

from .views import (
    checkout_init,
    checkout_summary,
    create_payment,
    payment_status,
    wompi_webhook,
)

urlpatterns = [
    path('summary/', checkout_summary, name='checkout-summary'),
    path('init/', checkout_init, name='checkout-init'),
    path('create-payment/', create_payment, name='checkout-create-payment'),
    path('payment-status/', payment_status, name='checkout-payment-status'),
    path('webhook/', wompi_webhook, name='checkout-webhook'),
]
