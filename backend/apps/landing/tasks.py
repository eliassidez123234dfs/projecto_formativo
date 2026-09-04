"""
Tareas asíncronas del módulo de landing/contacto.

Estas tareas se ejecutan en workers de Celery, fuera del hilo
principal de Django. Esto evita que el envío de correos bloquee
la respuesta HTTP al usuario.

OWASP A04:2021 — Inyección Segura:
  Las tareas async procesan input del usuario en un contexto aislado,
  reduciendo la superficie de ataque del endpoint de request.

OWASP A05:2021 — Seguridad de Configuración:
  Las tareas usan la misma configuración de Django (settings.py)
  pero ejecutan en un proceso separado con permisos reducidos.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_contact_notification_async(self, contacto_id: int, nombre: str, correo: str, asunto: str, mensaje: str, fecha_envio: str):
    """Envía notificación de contacto al admin de forma asíncrona.

    Args:
        contacto_id: ID del contacto creado (para logging).
        nombre: Nombre del remitente.
        correo: Correo del remitente.
        asunto: Asunto del mensaje.
        mensaje: Cuerpo del mensaje.
        fecha_envio: Fecha de envío en formato ISO.
    """
    from apps.users.services.email_service import EmailService

    try:
        subject = f'Nuevo mensaje de contacto: {asunto or "Sin asunto"}'
        body = (
            f'Has recibido un nuevo mensaje desde el formulario de contacto.\n\n'
            f'Nombre: {nombre}\n'
            f'Correo: {correo}\n'
            f'Asunto: {asunto or "N/A"}\n'
            f'Mensaje:\n{mensaje}\n\n'
            f'Fecha: {fecha_envio}'
        )
        from django.conf import settings
        EmailService._send(subject, body, [settings.DEFAULT_FROM_EMAIL])
        logger.info('Email de contacto enviado: id=%s', contacto_id)
    except Exception as exc:
        logger.exception('Error enviando email de contacto id=%s: %s', contacto_id, exc)
        raise self.retry(exc=exc)
