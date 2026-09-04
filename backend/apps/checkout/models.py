"""
Módulo de modelos para el proceso de pago (checkout).
Define TransactionLog para el registro de eventos y respuestas crudas
de la pasarela de pago Wompi, con fines de depuración y auditoría forense.
"""

# =============================================================================
# REQUISITOS: RF-039 (transacciones), RF-040 (webhook/auditoría)
# TransactionLog almacena cada notificación del webhook de Wompi,
# permitiendo rastrear cambios de estado y resolver disputas.
# =============================================================================

from django.db import models


class TransactionLog(models.Model):
    """Bitácora de eventos de pago procesados por Wompi.
    
    Cada vez que el webhook de Wompi notifica un cambio de estado
    (APPROVED, DECLINED, REJECTED, ERROR, VOIDED), se registra una
    entrada en esta tabla con la respuesta JSON completa (raw_response)
    para fines de depuración forense y auditoría.
    
    También se registran eventos de seguridad como firmas inválidas
    (INVALID_SIGNATURE) o referencias no encontradas (ORDER_NOT_FOUND)."""
    order = models.ForeignKey('orders.Order', null=True, blank=True, on_delete=models.SET_NULL, related_name='transaction_logs')
    # ── Datos de la transacción ──
    reference_wompi = models.CharField(max_length=255, blank=True, null=True)
    estado = models.CharField(max_length=50)
    valor_pagado = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    evento = models.TextField(blank=True)
    # raw_response: payload JSON completo de Wompi para auditoría.
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference_wompi or "N/A"} - {self.estado}'
