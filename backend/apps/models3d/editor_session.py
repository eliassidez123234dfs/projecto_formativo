import uuid
from django.db import models
from django.utils import timezone


class EditorSession(models.Model):
    """Sesión temporal del editor 3D.

    Almacena los datos validados del producto/variante en la BD
    (en vez de cookies) para que funcionen entre dominios distintos
    (frontend en Vercel → editor en otro Vercel).

    Token: UUID de una sola vez, expira en 60 minutos.
    """
    token = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True)
    data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    used = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Sesión del Editor 3D'
        verbose_name_plural = 'Sesiones del Editor 3D'

    def is_expired(self, minutes=60):
        return timezone.now() - self.created_at > timezone.timedelta(minutes=minutes)

    def __str__(self):
        return f'EditorSession {self.token} ({"usado" if self.used else "pendiente"})'
