from django.core.management.base import BaseCommand
from apps.products.models import Product, Variant
import random
from decimal import Decimal


class Command(BaseCommand):
    help = 'Crea 30 productos de prueba con variantes'

    def handle(self, *args, **options):
        sizes = ['S', 'M', 'L', 'XL']
        colors = ['Rojo', 'Azul', 'Negro', 'Blanco']

        created_count = 0
        for i in range(1, 31):
            name = f'Producto de prueba #{i}'
            description = f'Descripción de ejemplo para {name}.'
            price = Decimal(f'{random.uniform(10, 100):.2f}')

            product, created = Product.objects.get_or_create(
                name=name,
                defaults={
                    'description': description,
                    'base_price': price,
                    'is_active': True,
                    'is_approved': True,
                }
            )

            # Añadir un par de variantes (si ya existen, se omiten)
            for size in sizes[:2]:
                for color in colors[:2]:
                    Variant.objects.get_or_create(
                        product=product,
                        size=size,
                        color=color,
                        defaults={'stock': random.randint(0, 50)}
                    )

            if created:
                created_count += 1

        self.stdout.write(self.style.SUCCESS(f'Productos creados: {created_count} (hasta 30)'))
