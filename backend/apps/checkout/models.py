from django.db import models


class TransactionLog(models.Model):
    order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL, related_name='transaction_logs')
    reference_wompi = models.CharField(max_length=255, blank=True, null=True)
    estado = models.CharField(max_length=50)
    valor_pagado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    evento = models.TextField(blank=True)
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference_wompi or "N/A"} - {self.estado}'
