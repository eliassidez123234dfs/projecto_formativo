# gunicorn.conf.py — Configuración de Gunicorn para producción
# Uso: gunicorn config.wsgi:application -c gunicorn.conf.py

import os

# Server socket
bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
backlog = 2048

# Workers
workers = int(os.environ.get('WEB_CONCURRENCY', 2))
worker_class = 'sync'
worker_connections = 1000
timeout = 120
keepalive = 5

# Logging
accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info').lower()

# Process naming
proc_name = 'red-backend'

# Server mechanics
preload_app = True
daemon = False
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None

# Security
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190
