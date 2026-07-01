from __future__ import annotations

# =============================================================================
# WOMPI - Adaptador para la pasarela de pago Wompi (Colombia)
# =============================================================================
# PATRÓN: Adapter (Wrapper)
# Proporciona una interfaz Python unificada sobre la API REST de Wompi.
# Aísla al resto de la aplicación de los detalles de la API externa,
# permitiendo cambiar de pasarela sin modificar las vistas.
# =============================================================================
# SEGURIDAD:
# 1. Firma de integridad (generate_signature):
#    SHA-256(reference + amount_in_cents + currency + integrity_key)
#    Garantiza que los datos enviados a Wompi no sean alterados por
#    terceros (man-in-the-middle) durante la redirección del usuario.
# 2. Verificación HMAC de webhooks (verify_webhook_signature):
#    SHA-256(raw_body) comparado con header X-Signature
#    Valida criptográficamente que la notificación proviene de Wompi.
# =============================================================================

import hashlib
import hmac
import json
import logging
from decimal import Decimal

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_base_url() -> str:
    """Return the Wompi API base URL from settings."""
    return settings.WOMPI_API_URL


def _get_private_key() -> str:
    """Return the Wompi private/secret key from settings."""
    return settings.WOMPI_PRIVATE_KEY


def _get_integrity_key() -> str:
    """Return the Wompi integrity key for signature generation from settings."""
    return settings.WOMPI_INTEGRITY_KEY


def get_public_key() -> str:
    """Return the Wompi public key from settings."""
    return settings.WOMPI_PUBLIC_KEY


def generate_signature(reference: str, amount_in_cents: int, currency: str = 'COP') -> str:
    """Genera firma de integridad SHA-256 para transacciones Wompi.
    
    La firma se construye concatenando:
    reference + amount_in_cents + currency + integrity_key
    y aplicando SHA-256 sobre el resultado.
    
    Wompi valida esta firma para garantizar que los datos del pago
    no fueron modificados por terceros (man-in-the-middle).
    """
    integrity_key = _get_integrity_key()
    raw = f'{reference}{amount_in_cents}{currency}{integrity_key}'
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def get_acceptance_token() -> str | None:
    """Obtiene el acceptance_token desde el endpoint de merchants de Wompi.
    
    Este token es requerido por Wompi para cumplimiento normativo
    (aceptación de términos y condiciones por parte del comercio).
    Se obtiene dinámicamente del endpoint público del merchant.
    """
    try:
        url = f'{_get_base_url()}/v1/merchants/{_get_public_key()}'
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        return data['data']['presigned_acceptance']['acceptance_token']
    except Exception as exc:
        logger.error('Error obteniendo acceptance token de Wompi: %s', exc)
        return None


def create_transaction(
    amount: Decimal,
    reference: str,
    customer_email: str,
    redirect_url: str,
    customer_full_name: str | None = None,
    customer_phone: str | None = None,
    currency: str = 'COP',
) -> dict | None:
    """Crea una transacción de pago en la API de Wompi.
    
    FLUJO:
    1. Convierte monto a centavos (amount * 100)
    2. Genera firma de integridad SHA-256
    3. Obtiene acceptance_token del merchant
    4. Construye payload con datos de pago y cliente
    5. Envía POST autenticado a /v1/transactions
    6. Retorna respuesta JSON de Wompi o None si falla
    """
    try:
        amount_in_cents = int(amount * 100)
        signature = generate_signature(reference, amount_in_cents, currency)
        acceptance_token = get_acceptance_token()

        if not acceptance_token:
            logger.error('No se pudo obtener acceptance_token de Wompi')
            return None

        payload = {
            'amount_in_cents': amount_in_cents,
            'currency': currency,
            'reference': reference,
            'customer_email': customer_email,
            'signature': signature,
            'redirect_url': redirect_url,
            'payment_method': {
                'type': 'CARD',
                'user_type': 'N',
                'token': None,
            },
        }

        if acceptance_token:
            payload['acceptance_token'] = acceptance_token

        if customer_full_name:
            payload.setdefault('customer_data', {})['full_name'] = customer_full_name
        if customer_phone:
            payload.setdefault('customer_data', {})['phone_number'] = customer_phone

        headers = {
            'Authorization': f'Bearer {_get_private_key()}',
            'Content-Type': 'application/json',
        }

        url = f'{_get_base_url()}/v1/transactions'
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        resp.raise_for_status()

        result = resp.json()
        logger.info('Transaccion Wompi creada: ref=%s id=%s', reference, result.get('data', {}).get('id'))
        return result

    except requests.RequestException as exc:
        logger.error('Error creando transaccion en Wompi: %s', exc)
        response_data = getattr(exc.response, 'text', None)
        if response_data:
            logger.error('Respuesta Wompi: %s', response_data)
        return None


def verify_webhook_signature(request_body: bytes, signature_header: str | None) -> bool:
    """Verifica la firma HMAC-SHA256 de un webhook de Wompi.
    
    Calcula SHA-256 del body crudo (bytes) y compara con el header
    X-Signature usando hmac.compare_digest para prevenir
    timing attacks. Retorna False si la firma no coincide o falta.
    """
    if not signature_header:
        logger.warning('Webhook sin firma, rechazando')
        return False
    try:
        raw = request_body.decode('utf-8')
        expected = hashlib.sha256(raw.encode('utf-8')).hexdigest()
        return hmac.compare_digest(signature_header, expected)
    except Exception as exc:
        logger.error('Error verificando firma webhook: %s', exc)
        return False


def get_transaction(transaction_id: str) -> dict | None:
    """Obtiene detalles de una transacción desde la API de Wompi por su ID.
    
    Útil para consultar el estado de un pago cuando no se recibe webhook
    o como verificación adicional desde el frontend.
    """
    try:
        headers = {'Authorization': f'Bearer {_get_private_key()}'}
        url = f'{_get_base_url()}/v1/transactions/{transaction_id}'
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.error('Error obteniendo transaccion %s: %s', transaction_id, exc)
        return None
