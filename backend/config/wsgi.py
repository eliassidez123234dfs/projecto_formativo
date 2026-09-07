# =============================================================================
#  ARCHIVO: wsgi.py
#  PROPÓSITO: Punto de entrada WSGI para el proyecto "Red Estampación".
#             WSGI (Web Server Gateway Interface) es el estándar de Python
#             para servir aplicaciones web. Este archivo es utilizado por
#             servidores de producción como Gunicorn, uWSGI o Render para
#             ejecutar la aplicación Django.
#
#  FLUJO:
#  1. Configura la variable de entorno DJANGO_SETTINGS_MODULE para que
#     Django sepa qué archivo de configuración usar (config.settings).
#  2. Obtiene la aplicación WSGI mediante get_wsgi_application(), que
#     carga toda la configuración y el árbol de middleware de Django.
#  3. La variable 'application' es el callable que el servidor web invoca
#     para cada petición HTTP entrante.
# =============================================================================

"""
WSGI config for config project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

# ── Configurar el módulo de settings ──
# Indica a Django qué archivo de configuración cargar (config/settings.py).
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# ── Crear la aplicación WSGI ──
# get_wsgi_application() inicializa Django y retorna un callable WSGI.
# El servidor web (Gunicorn/Render) usa esta variable para servir la app.
application = get_wsgi_application()
