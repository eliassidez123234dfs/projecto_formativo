import os

from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password

from apps.users.models import Usuario


class Command(BaseCommand):
    help = 'Crea usuarios de prueba: admin (no superuser) y admin superuser'

    def handle(self, *args, **options):
        admin_pass = os.environ.get('SEED_ADMIN_PASSWORD', 'Admin123!')
        super_pass = os.environ.get('SEED_SUPER_PASSWORD', 'SuperAdmin123!')
        admin_email = os.environ.get('SEED_ADMIN_EMAIL', 'admin@redestampacion.com')
        super_email = os.environ.get('SEED_SUPER_EMAIL', 'superadmin@redestampacion.com')

        if not Usuario.objects.filter(usuario='admin_red').exists():
            Usuario.objects.create(
                usuario='admin_red',
                correo=admin_email,
                contrasena=make_password(admin_pass),
                rol='Administrador',
                estado='Activo',
                email_verificado=True,
                is_superuser=False,
            )
            self.stdout.write(self.style.SUCCESS(f'Creado admin_red ({admin_email})'))
        else:
            self.stdout.write('admin_red ya existe')

        if not Usuario.objects.filter(usuario='superadmin').exists():
            Usuario.objects.create(
                usuario='superadmin',
                correo=super_email,
                contrasena=make_password(super_pass),
                rol='Administrador',
                estado='Activo',
                email_verificado=True,
                is_superuser=True,
            )
            self.stdout.write(self.style.SUCCESS(f'Creado superadmin ({super_email})'))
        else:
            self.stdout.write('superadmin ya existe')

        self.stdout.write(self.style.SUCCESS('Usuarios de prueba creados exitosamente'))
