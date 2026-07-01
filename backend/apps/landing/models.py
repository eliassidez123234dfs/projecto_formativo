"""
Módulo de modelos para la landing page.
Define Contacto para gestionar los mensajes enviados desde el formulario
de contacto, incluyendo trazabilidad IP y estado de lectura.
"""

from django.db import models
from django.core.validators import EmailValidator


class Contacto(models.Model):
    """Mensaje enviado desde el formulario de contacto (RI-030, RF-031).
    
    Almacena consultas de usuarios no autenticados. Incluye trazabilidad
    de IP para rate limiting (RN-031: máx 3/h por IP) y estado de lectura
    para gestión administrativa. Los administradores reciben notificación
    por email al crearse (RF-032, RN-032).
    """

    # ── Datos del remitente ──
    id = models.AutoField(primary_key=True, verbose_name='ID del mensaje')
    nombre = models.CharField(max_length=100, null=False, verbose_name='Nombre completo')
    correo = models.EmailField(null=False, validators=[EmailValidator()], verbose_name='Correo electrónico')
    asunto = models.CharField(max_length=150, null=True, blank=True, verbose_name='Asunto')
    mensaje = models.TextField(null=False, verbose_name='Mensaje')
    
    # ── Trazabilidad (para rate limiting y auditoría) ──
    ip_origen = models.CharField(max_length=45, null=True, blank=True, verbose_name='Dirección IP de origen')
    fecha_envio = models.DateTimeField(auto_now_add=True, verbose_name='Fecha de envío')
    
    # ── Estado de lectura (gestión administrativa) ──
    leido = models.BooleanField(default=False, verbose_name='¿Leído?')
    fecha_lectura = models.DateTimeField(null=True, blank=True, verbose_name='Fecha de lectura')
    
    class Meta:
        db_table = 'contactos'
        indexes = [
            models.Index(fields=['correo']),
            models.Index(fields=['fecha_envio']),
            models.Index(fields=['leido']),
        ]
    
    def __str__(self):
        return f"{self.nombre} - {self.asunto or 'Sin asunto'}"
