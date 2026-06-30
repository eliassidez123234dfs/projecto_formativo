"""
Servicio centralizado de envío de correos electrónicos.

Elimina la duplicación de lógica de email que existía en:
- apps/users/api/viewset.py      (3 métodos)
- apps/users/api/admin_viewset.py (3 métodos)
- apps/landing/api/viewset.py    (1 método)

Todas las vistas deben importar y usar este servicio en lugar de
llamar a send_mail directamente.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

logger = logging.getLogger(__name__)


class EmailService:
    """Servicio único para el envío de todos los correos del sistema."""

    @staticmethod
    def _send(subject, message, recipient_list, fail_silently=False):
        """
        Envía un correo electrónico.
        
        Args:
            subject: Asunto del correo.
            message: Cuerpo del mensaje en texto plano.
            recipient_list: Lista de direcciones de correo destino.
            fail_silently: Si True, no lanza excepción ante errores de envío.
        
        Returns:
            True si el envío fue exitoso, False en caso contrario.
        """
        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                recipient_list,
                fail_silently=fail_silently,
            )
            return True
        except Exception as exc:
            logger.exception('Error al enviar email a %s: %s', recipient_list, exc)
            return False

    @staticmethod
    def send_verification_email(usuario, token):
        """
        Envía el correo de verificación de cuenta con un enlace.
        
        Args:
            usuario: Instancia del modelo Usuario.
            token: Token de verificación (instancia de Token_Verificacion).
        """
        enlace = f"{settings.FRONTEND_URL}/login?token={token.token}"
        subject = 'Red Estampación — Verifica tu correo electrónico'
        message = (
            f'Hola {usuario.usuario},\n\n'
            f'Gracias por registrarte en Red Estampación.\n\n'
            f'Para verificar tu cuenta, haz clic en el siguiente enlace:\n'
            f'{enlace}\n\n'
            f'Si no solicitaste este registro, ignora este mensaje.\n\n'
            f'— Equipo Red Estampación'
        )
        return EmailService._send(subject, message, [usuario.correo])

    @staticmethod
    def send_password_reset_email(usuario, token):
        """
        Envía el correo para restablecer la contraseña.
        
        Args:
            usuario: Instancia del modelo Usuario.
            token: Token de recuperación (instancia de Token_Verificacion).
        """
        enlace = f"{settings.FRONTEND_URL}/reset-password?token={token.token}"
        subject = 'Red Estampación — Restablecimiento de contraseña'
        message = (
            f'Hola {usuario.usuario},\n\n'
            f'Hemos recibido una solicitud para restablecer tu contraseña.\n\n'
            f'Para crear una nueva contraseña, haz clic en el siguiente enlace:\n'
            f'{enlace}\n\n'
            f'Este enlace expira en 1 hora.\n\n'
            f'Si no solicitaste este cambio, ignora este mensaje.\n\n'
            f'— Equipo Red Estampación'
        )
        return EmailService._send(subject, message, [usuario.correo])

    @staticmethod
    def send_welcome_email(usuario, temp_password=None):
        """
        Envía el correo de bienvenida a un usuario creado por un administrador.
        
        Args:
            usuario: Instancia del modelo Usuario.
            temp_password: Contraseña temporal (opcional, por seguridad se
                          recomienda enviar solo un enlace de restablecimiento).
        """
        subject = 'Red Estampación — Tu cuenta ha sido creada'
        message = (
            f'Hola {usuario.usuario},\n\n'
            f'Tu cuenta en Red Estampación ha sido creada exitosamente.\n\n'
            f'Tu usuario es: {usuario.usuario}\n\n'
            f'Para iniciar sesión, visita:\n'
            f'{settings.FRONTEND_URL}/login\n\n'
            f'— Equipo Red Estampación'
        )
        return EmailService._send(subject, message, [usuario.correo])

    @staticmethod
    def send_admin_reset_email(usuario, temp_password):
        """
        Envía un correo con contraseña temporal generada por un administrador.
        
        Args:
            usuario: Instancia del modelo Usuario.
            temp_password: Contraseña temporal en texto plano.
        """
        subject = 'Red Estampación — Restablecimiento de contraseña'
        message = (
            f'Hola {usuario.usuario},\n\n'
            f'Tu contraseña ha sido restablecida por un administrador.\n\n'
            f'Tu nueva contraseña temporal es:\n'
            f'{temp_password}\n\n'
            f'Te recomendamos cambiarla después de iniciar sesión.\n'
            f'{settings.FRONTEND_URL}/login\n\n'
            f'— Equipo Red Estampación'
        )
        return EmailService._send(subject, message, [usuario.correo])

    @staticmethod
    def send_contact_notification(contacto):
        """
        Notifica al administrador sobre un nuevo mensaje de contacto.
        
        Args:
            contacto: Instancia del modelo Contacto.
        """
        subject = f'Nuevo mensaje de contacto: {contacto.asunto or "Sin asunto"}'
        message = (
            f'Has recibido un nuevo mensaje desde el formulario de contacto.\n\n'
            f'Nombre: {contacto.nombre}\n'
            f'Correo: {contacto.correo}\n'
            f'Asunto: {contacto.asunto or "N/A"}\n'
            f'Mensaje:\n{contacto.mensaje}\n\n'
            f'Fecha: {contacto.fecha_envio.strftime("%d/%m/%Y %H:%M")}'
        )
        return EmailService._send(subject, message, [settings.DEFAULT_FROM_EMAIL])
