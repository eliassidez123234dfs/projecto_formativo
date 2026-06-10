#!/bin/sh
set -e

# Ejecutar migraciones y recolectar archivos estáticos antes de iniciar el servidor.
python manage.py migrate --noinput
python manage.py collectstatic --noinput

exec "$@"
