"""
Configuración de Celery para RED Estampación.

Celery permite ejecutar tareas pesadas en segundo plano (workers)
sin bloquear el hilo principal de Django:
  - Envío de correos de verificación y recuperación de contraseña.
  - Validación/procesamiento profundo de archivos 3D subidos.
  - Generación de thumbnails y optimización de imágenes.
  - Tareas de auditoría y reportes pesados.

BROKER_URL se lee de la variable de entorno REDIS_URL
(misma instancia Redis que usa Django para caché y sesiones,
pero con un database offset: /1 en lugar de /0).

OWASP A04:2021 — Inyección Segura:
  Las tareas asíncronas procesan input del usuario lejos del
  hilo de request, reduciendo la superficie de ataque.

OWASP A05:2021 — Seguridad de Configuración:
  El broker NO expone puertos externos (solo en docker network).
"""

from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('projecto_formativo')

# Leer configuración desde Django settings con prefijo CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-descubrir tareas en todas las apps instaladas
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Tarea de debug para verificar que Celery funciona."""
    print(f'Request: {self.request!r}')


@app.task(bind=True, ignore_result=True)
def ping(self):
    """Ping simple para monitoreo del worker Celery."""
    return 'pong'
