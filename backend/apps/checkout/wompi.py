from __future__ import annotations

import hashlib
import hmac
import json
import logging
from decimal import Decimal

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def _get_base_url() -> str:
    return settings.WOMPI_API_URL


def _get_private_key() -> str:
    return settings.WOMPRI_PRIVATE_KEY


def _get_integrity_key() -> str:
    return settings.WOMPI_INTEGRITY_KEY


def get_public_key() -> str:
    return settings.WOMPI_PUBLIC_KEY


def generate_signature(reference: str, amount_in_cents: int, currency: str = 'COP') -> str:
    integrity_key = _get_integrity_key()
    raw = f'{reference}{amount_in_cents}{currency}{integrity_key}'
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def get_acceptance_token() -> str | None:
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
    try:
        headers = {'Authorization': f'Bearer {_get_private_key()}'}
        url = f'{_get_base_url()}/v1/transactions/{transaction_id}'
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.error('Error obteniendo transaccion %s: %s', transaction_id, exc)
        return None
