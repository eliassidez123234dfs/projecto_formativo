"""
Management command: check_mongo
Verifica la conectividad con MongoDB y reporta el estado.
Uso: python manage.py check_mongo
"""
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Verifica la conexión a MongoDB y muestra el estado'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Verificando MongoDB...'))

        if not settings.MONGODB_URI:
            self.stdout.write(self.style.WARNING(
                'MONGODB_URI no está configurada. '
                'MongoDB está deshabilitado (USE_MONGODB=False o sin URI).'
            ))
            return

        self.stdout.write(f'  URI: {settings.MONGODB_URI[:40]}...')
        self.stdout.write(f'  Base de datos: {settings.MONGODB_NAME}')

        try:
            from apps.users.mongodb import get_mongo_client, ping_mongo, close_mongo_connection

            client = get_mongo_client()
            if client is None:
                self.stdout.write(self.style.ERROR(
                    '  No se pudo crear el cliente MongoDB. '
                    'Verifica que la URI sea válida y que el servidor esté accesible.'
                ))
                return

            if ping_mongo():
                self.stdout.write(self.style.SUCCESS(
                    '  MongoDB está conectado y operativo.'
                ))
                # Mostrar información del servidor
                try:
                    info = client.server_info()
                    self.stdout.write(f'  Versión: {info.get("version", "desconocida")}')
                except Exception:
                    pass
            else:
                self.stdout.write(self.style.ERROR(
                    '  MongoDB no responde al ping. '
                    'Verifica la conexión de red y las credenciales.'
                ))

            close_mongo_connection()

        except ImportError as e:
            self.stdout.write(self.style.ERROR(
                f'  pymongo no está instalado: {e}. '
                'Ejecuta: pip install pymongo dnspython'
            ))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'  Error inesperado: {e}'))
