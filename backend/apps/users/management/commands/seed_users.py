import secrets
import string
from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone

from apps.users.models import Usuario


def _generar_contrasena():
    """Genera una contraseña aleatoria que cumple RN-001."""
    especial = '!@#$%^&*()'
    contrasena = (
        secrets.choice(string.ascii_uppercase)
        + secrets.choice(string.digits)
        + secrets.choice(especial)
        + ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(5))
    )
    lista = list(contrasena)
    secrets.SystemRandom().shuffle(lista)
    return ''.join(lista)


USERS = [
    {
        "usuario": "admin",
        "correo": "admin@redestampacion.com",
        "rol": "Administrador",
        "estado": "Activo",
        "email_verificado": True,
        "is_superuser": True,
    },
    {
        "usuario": "juanperez",
        "correo": "juan@example.com",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "mariagarcia",
        "correo": "maria@example.com",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "carloslopez",
        "correo": "carlos@example.com",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "ana martinez",
        "correo": "ana@example.com",
        "rol": "Usuario",
        "estado": "Activo",
        "email_verificado": True,
    },
    {
        "usuario": "pedroramirez",
        "correo": "pedro@example.com",
        "rol": "Usuario",
        "estado": "Inactivo",
        "email_verificado": False,
    },
]


class Command(BaseCommand):
    help = "Crea usuarios de prueba (admin + clientes). Genera contraseñas aleatorias."

    def handle(self, *args, **options):
        created_list = []

        for udata in USERS:
            contrasena = _generar_contrasena()
            user, created = Usuario.objects.get_or_create(
                correo=udata["correo"],
                defaults={
                    "usuario": udata["usuario"],
                    "contrasena": make_password(contrasena),
                    "rol": udata["rol"],
                    "estado": udata["estado"],
                    "email_verificado": udata["email_verificado"],
                    "is_superuser": udata.get("is_superuser", False),
                    "fecha_registro": timezone.now(),
                },
            )
            if created:
                created_list.append((udata["usuario"], udata["correo"], contrasena, udata["rol"]))

        self.stdout.write(self.style.SUCCESS(f"\nUsuarios creados: {len(created_list)}"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"{'Usuario':<20} {'Correo':<30} {'Contraseña':<15} {'Rol':<15}")
        self.stdout.write("-" * 80)
        for username, email, password, role in created_list:
            self.stdout.write(f"{username:<20} {email:<30} {password:<15} {role:<15}")
        self.stdout.write("=" * 60)
        self.stdout.write(self.style.WARNING("GUARDA ESTAS CREDENCIALES PARA INICIAR SESIÓN"))
