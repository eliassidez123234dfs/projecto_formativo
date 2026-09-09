import os
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.users.models import Usuario


class Command(BaseCommand):
    help = (
        "Asegura que el usuario administrador exista y esté activo. "
        "Lee credenciales de variables de entorno: "
        "ADMIN_USUARIO, ADMIN_CORREO, ADMIN_PASSWORD"
    )

    def handle(self, *args, **options):
        admin_usuario = os.environ.get('ADMIN_USUARIO', '')
        admin_correo = os.environ.get('ADMIN_CORREO', '')
        admin_password = os.environ.get('ADMIN_PASSWORD', '')

        if not all([admin_usuario, admin_correo, admin_password]):
            self.stderr.write(self.style.WARNING(
                'Variables de entorno ADMIN_USUARIO, ADMIN_CORREO y ADMIN_PASSWORD '
                'no están configuradas. Saltando creación de admin.'
            ))
            return

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"Verificando usuario administrador: {admin_correo}")
        self.stdout.write(f"{'='*60}\n")

        try:
            usuario = Usuario.objects.get(correo=admin_correo)
            self.stdout.write(self.style.WARNING(f"Usuario encontrado: {usuario.usuario} (ID: {usuario.id})"))
            self.stdout.write(f"  Estado actual: {usuario.estado}")
            self.stdout.write(f"  Rol: {usuario.rol}")
            self.stdout.write(f"  Email verificado: {usuario.email_verificado}")
            self.stdout.write(f"  Superuser: {usuario.is_superuser}")

            cambios = False
            if usuario.estado != "Activo":
                usuario.estado = "Activo"
                cambios = True
                self.stdout.write(self.style.SUCCESS("  -> Estado cambiado a Activo"))
            if usuario.rol != "Administrador":
                usuario.rol = "Administrador"
                cambios = True
                self.stdout.write(self.style.SUCCESS("  -> Rol cambiado a Administrador"))
            if not usuario.email_verificado:
                usuario.email_verificado = True
                cambios = True
                self.stdout.write(self.style.SUCCESS("  -> Email verificado"))
            if not usuario.is_superuser:
                usuario.is_superuser = True
                cambios = True
                self.stdout.write(self.style.SUCCESS("  -> Superuser activado"))

            if cambios:
                usuario.save()
                self.stdout.write(self.style.SUCCESS("\nCambios aplicados exitosamente."))
            else:
                self.stdout.write(self.style.SUCCESS("\nEl usuario ya está correctamente configurado."))

        except Usuario.DoesNotExist:
            self.stdout.write(self.style.WARNING("Usuario no encontrado. Creando..."))
            Usuario.objects.create(
                usuario=admin_usuario,
                correo=admin_correo,
                contrasena=make_password(admin_password),
                estado="Activo",
                rol="Administrador",
                email_verificado=True,
                is_superuser=True,
                fecha_registro=timezone.now(),
            )
            self.stdout.write(self.style.SUCCESS("Usuario administrador creado exitosamente."))
        except Exception as exc:
            self.stderr.write(self.style.WARNING(f"No se pudo verificar/crear admin: {exc}"))
            self.stderr.write(self.style.WARNING("La BD puede no estar disponible. Continuando..."))
            return

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"Credenciales:")
        self.stdout.write(f"  Correo:      {admin_correo}")
        self.stdout.write(f"{'='*60}\n")
