from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Ejecuta todos los seed: usuarios + productos"

    def add_arguments(self, parser):
        parser.add_argument('--skip-users', action='store_true')
        parser.add_argument(
            '--clean-products', action='store_true',
            help='Eliminar productos existentes antes de sembrar productos',
        )
        parser.add_argument('--skip-images', action='store_true')
        parser.add_argument('--skip-variants', action='store_true')

    def handle(self, *args, **options):
        if not options['skip_users']:
            self.stdout.write(self.style.NOTICE("=== SEED USUARIOS ==="))
            call_command("seed_users")

        self.stdout.write(self.style.NOTICE("\n=== SEED PRODUCTOS ==="))
        call_command(
            "seed_products",
            clean=options['clean_products'],
            skip_images=options['skip_images'],
            skip_variants=options['skip_variants'],
        )

        self.stdout.write(self.style.SUCCESS("\nSeed completado. Todo listo para probar."))
