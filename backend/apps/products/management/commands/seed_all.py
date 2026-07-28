from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Ejecuta todos los seed: usuarios + productos"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("=== SEED USUARIOS ==="))
        call_command("seed_users")

        self.stdout.write(self.style.NOTICE("\n=== SEED PRODUCTOS ==="))
        call_command("seed_products")

        self.stdout.write(self.style.SUCCESS("\nSeed completado. Todo listo para probar."))
