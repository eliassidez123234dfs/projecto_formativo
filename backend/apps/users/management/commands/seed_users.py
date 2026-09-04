from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.users.models import Usuario

USERS = [
    {
        "usuario": "admin",
        "correo": "admin@redestampacion.com",
        "contrasena": "Admin123!",
        "rol": "Administrador",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "juanperez",
        "correo": "juan@example.com",
        "contrasena": "Cliente1!",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "mariagarcia",
        "correo": "maria@example.com",
        "contrasena": "Cliente2!",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "carloslopez",
        "correo": "carlos@example.com",
        "contrasena": "Cliente3!",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "ana martinez",
        "correo": "ana@example.com",
        "contrasena": "Cliente4!",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "pedroramirez",
        "correo": "pedro@example.com",
        "contrasena": "Cliente5!",
        "rol": "Usuario",
        "estado": "Inactivo",
        "email_verificado": False,
    },
]


class Command(BaseCommand):
    help = "Crea usuarios de prueba (admin + clientes)"

    def handle(self, *args, **options):
        created_list = []

        for udata in USERS:
            user, created = Usuario.objects.get_or_create(
                correo=udata["correo"],
                defaults={
                    "usuario": udata["usuario"],
                    "contrasena": make_password(udata["contrasena"]),
                    "rol": udata["rol"],
                    "estado": udata["estado"],
                    "email_verificado": udata["email_verificado"],
                    "fecha_registro": timezone.now(),
                },
            )
            if created:
                created_list.append((udata["usuario"], udata["correo"], udata["contrasena"], udata["rol"]))

        self.stdout.write(self.style.SUCCESS(f"\nUsuarios creados: {len(created_list)}"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"{'Usuario':<20} {'Correo':<30} {'Contraseña':<15} {'Rol':<15}")
        self.stdout.write("-" * 80)
        for username, email, password, role in created_list:
            self.stdout.write(f"{username:<20} {email:<30} {password:<15} {role:<15}")
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.WARNING("GUARDA ESTAS CREDENCIALES PARA INICIAR SESIÓN"))
