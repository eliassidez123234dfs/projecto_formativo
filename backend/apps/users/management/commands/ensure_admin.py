from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.users.models import Usuario


ADMIN_DATA = {
    "usuario": "hurtado_elias",
    "correo": "hurtadoelias025@gmail.com",
    "contrasena": "RedAdmin_2026_xQ7m_4",
    "rol": "Administrador",
    "estado": "Activo",
    "email_verificado": True,
    "is_superuser": True,
}


class Command(BaseCommand):
    help = "Asegura que el usuario administrador exista y esté activo"

    def handle(self, *args, **options):
        correo = ADMIN_DATA["correo"]
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"Verificando usuario administrador: {correo}")
        self.stdout.write(f"{'='*60}\n")

        try:
            usuario = Usuario.objects.get(correo=correo)
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
                usuario=ADMIN_DATA["usuario"],
                correo=correo,
                contrasena=make_password(ADMIN_DATA["contrasena"]),
                estado=ADMIN_DATA["estado"],
                rol=ADMIN_DATA["rol"],
                email_verificado=ADMIN_DATA["email_verificado"],
                is_superuser=ADMIN_DATA["is_superuser"],
                fecha_registro=timezone.now(),
            )
            self.stdout.write(self.style.SUCCESS("Usuario administrador creado exitosamente."))

        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"Credenciales:")
        self.stdout.write(f"  Correo:      {correo}")
        self.stdout.write(f"  Contrasena:  {ADMIN_DATA['contrasena']}")
        self.stdout.write(f"{'='*60}\n")
