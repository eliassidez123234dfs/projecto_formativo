# =============================================================================
#  ARCHIVO: asgi.py
#  PROPÓSITO: Punto de entrada ASGI para el proyecto "Red Estampación".
#             ASGI (Asynchronous Server Gateway Interface) es el sucesor
#             de WSGI que soporta protocolos asíncronos y WebSockets.
#             Actualmente se usa en modo síncrono (get_asgi_application),
#             pero está preparado para migrar a canales asíncronos si
#             el proyecto requiere notificaciones en tiempo real.
#
#  FLUJO:
#  1. Define DJANGO_SETTINGS_MODULE apuntando a config.settings.
#  2. Obtiene la aplicación ASGI mediante get_asgi_application().
#  3. La variable 'application' es el callable que el servidor ASGI
#     (Daphne, Uvicorn) invoca para cada petición o evento.
# =============================================================================

"""
ASGI config for config project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

# ── Configurar el módulo de settings ──
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# ── Crear la aplicación ASGI ──
# get_asgi_application() retorna un callable ASGI compatible con servidores
# asíncronos. Soporta HTTP síncrono y está listo para WebSockets.
application = get_asgi_application()
