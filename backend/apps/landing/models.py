"""
Modelos de datos para la app de landing page.
Define Contacto para mensajes del formulario de contacto.
"""

from django.db import models
from django.core.validators import EmailValidator


class Contacto(models.Model):
    """Modelo para gestionar mensajes de contacto de la landing page (RI-030)"""
    
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, null=False)
    correo = models.EmailField(null=False, validators=[EmailValidator()])
    asunto = models.CharField(max_length=150, null=True, blank=True)
    mensaje = models.TextField(null=False)
    ip_origen = models.CharField(max_length=45, null=True, blank=True)
    fecha_envio = models.DateTimeField(auto_now_add=True)
    leido = models.BooleanField(default=False)
    fecha_lectura = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'contactos'
        indexes = [
            models.Index(fields=['correo']),
            models.Index(fields=['fecha_envio']),
            models.Index(fields=['leido']),
        ]
    
    def __str__(self):
        return f"{self.nombre} - {self.asunto or 'Sin asunto'}"
