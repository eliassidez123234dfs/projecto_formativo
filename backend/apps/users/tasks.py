"""
Tareas asíncronas del módulo de usuarios.

Envío de correos delegado a workers de Celery para no bloquear
la respuesta HTTP. Las tareas tienen reintentos automáticos
(max_retries=3, retry_delay=60s) para tolerancia a fallos de red.

OWASP A04:2021 — Inyección Segura:
  El procesamiento de tokens y envío de correos se ejecuta
  en un contexto aislado del request HTTP.

OWASP A05:2021 — Seguridad de Configuración:
  Los workers heredan la configuración de settings.py pero
  ejecutan en procesos separados con permisos reducidos.
"""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_async(self, usuario_id: int, token: str):
    """Envía correo de recuperación de contraseña de forma asíncrona.

    Args:
        usuario_id: ID del usuario (para buscar correo).
        token: Token de recuperación (para incluir en el enlace).
    """
    from apps.users.models import Usuario
    from apps.users.services.email_service import EmailService

    try:
        usuario = Usuario.objects.get(id=usuario_id)
        # Buscar el token más reciente de tipo Recuperacion_Password
        from apps.users.models import Token_Verificacion
        token_obj = Token_Verificacion.objects.filter(
            usuario=usuario, tipo='Recuperacion_Password'
        ).order_by('-created_at').first()

        if token_obj:
            EmailService.send_password_reset_email(usuario, token_obj)
            logger.info('Email de recuperación enviado: usuario=%s', usuario_id)
        else:
            logger.warning('Token de recuperación no encontrado: usuario=%s', usuario_id)
    except Usuario.DoesNotExist:
        logger.error('Usuario no encontrado para email async: id=%s', usuario_id)
    except Exception as exc:
        logger.exception('Error enviando email de recuperación usuario=%s: %s', usuario_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email_async(self, usuario_id: int):
    """Envía correo de bienvenida de forma asíncrona.

    Args:
        usuario_id: ID del usuario recién creado.
    """
    from apps.users.models import Usuario
    from apps.users.services.email_service import EmailService

    try:
        usuario = Usuario.objects.get(id=usuario_id)
        EmailService.send_welcome_email(usuario)
        logger.info('Email de bienvenida enviado: usuario=%s', usuario_id)
    except Usuario.DoesNotExist:
        logger.error('Usuario no encontrado para email de bienvenida: id=%s', usuario_id)
    except Exception as exc:
        logger.exception('Error enviando email de bienvenida usuario=%s: %s', usuario_id, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_admin_reset_email_async(self, usuario_id: int, contrasena_temporal: str):
    """Envía correo de reset admin de forma asíncrona.

    Args:
        usuario_id: ID del usuario.
        contrasena_temporal: Contraseña temporal generada.
    """
    from apps.users.models import Usuario
    from apps.users.services.email_service import EmailService

    try:
        usuario = Usuario.objects.get(id=usuario_id)
        EmailService.send_admin_reset_email(usuario, contrasena_temporal)
        logger.info('Email de reset admin enviado: usuario=%s', usuario_id)
    except Usuario.DoesNotExist:
        logger.error('Usuario no encontrado para email de reset admin: id=%s', usuario_id)
    except Exception as exc:
        logger.exception('Error enviando email de reset admin usuario=%s: %s', usuario_id, exc)
        raise self.retry(exc=exc)
