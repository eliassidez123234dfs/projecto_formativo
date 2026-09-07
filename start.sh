#!/bin/bash
<<<<<<< HEAD
# Script de inicio para Render - Backend Django
# Ubicación: raíz del proyecto
set -e
=======
# Script de inicio para Render - Despliegue del Backend Django
# Ubicación: raíz del proyecto (nivel de manage.py)

set -e  # Salir si algún comando falla
>>>>>>> origin/main

echo "=== Verificando variables de entorno ==="
if [ -z "$SECRET_KEY" ]; then
    echo "ERROR: SECRET_KEY no está configurada"
    exit 1
fi

echo "=== Instalando dependencias ==="
<<<<<<< HEAD
pip install -r backend/requirements.txt --quiet
=======
pip install -r requirements.txt --quiet
>>>>>>> origin/main

echo "=== Recolectando archivos estáticos ==="
cd backend
python manage.py collectstatic --noinput --clear

echo "=== Ejecutando migraciones ==="
python manage.py migrate --noinput

<<<<<<< HEAD
echo "=== Verificando MongoDB ==="
python manage.py check_mongo || echo "WARN: MongoDB no disponible, continuando..."

=======
>>>>>>> origin/main
echo "=== Iniciando servidor con Gunicorn ==="
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers ${GUNICORN_WORKERS:-4} \
    --worker-class sync \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level ${LOG_LEVEL:-info}
