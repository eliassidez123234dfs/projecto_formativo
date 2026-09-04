from django.urls import path

from .views import checkout_confirm, checkout_summary

urlpatterns = [
    path('summary/', checkout_summary, name='checkout-summary'),
    path('confirm/', checkout_confirm, name='checkout-confirm'),
]
