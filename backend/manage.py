#!/usr/bin/env python
# =============================================================================
#  ARCHIVO: manage.py
#  PROPÓSITO: Utilidad de línea de comandos de Django para el proyecto
#             "Red Estampación". Es el punto de entrada para todos los
#             comandos administrativos: runserver, migrate, makemigrations,
#             createsuperuser, shell, test, etc.
#
#  FLUJO:
#  1. Configura DJANGO_SETTINGS_MODULE = 'config.settings'.
#  2. Importa execute_from_command_line desde django.core.management.
#  3. Si Django no está instalado, lanza un ImportError con mensaje claro.
#  4. Ejecuta el comando recibido por argumentos (sys.argv).
#
#  USO:
#    python manage.py <comando> [opciones]
#    Ej: python manage.py runserver, python manage.py migrate
# =============================================================================

"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    # ── Configurar el módulo de settings ──
    # Indica a Django qué archivo de configuración cargar.
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        # ── Importar el gestor de comandos de Django ──
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # ── Error: Django no instalado ──
        # Mensaje descriptivo si falta Django o el entorno virtual.
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    # ── Ejecutar el comando solicitado ──
    # Toma los argumentos de sys.argv (ej: runserver, migrate, shell).
    execute_from_command_line(sys.argv)


# ── Punto de entrada ──
# Solo ejecuta main() si el archivo se invoca directamente (no al importarlo).
if __name__ == '__main__':
    main()
