"""
Backfill del snapshot de OrderItem (product_name / product_price).

Rellena las líneas de pedido existentes que tengan FK de producto pero
snapshot vacío, para que el hard delete del catálogo no pierda histórico.
"""
from django.core.management.base import BaseCommand

from apps.orders.models import OrderItem


class Command(BaseCommand):
    help = 'Rellena product_name/product_price en OrderItem desde el producto asociado.'

    def handle(self, *args, **options):
        qs = OrderItem.objects.filter(product__isnull=False).filter(
            product_name=''
        ) | OrderItem.objects.filter(product__isnull=False, product_price__isnull=True)
        # Deduplicar
        seen = set()
        updated = 0
        for item in OrderItem.objects.filter(product__isnull=False).iterator():
            if item.product_name and item.product_price is not None:
                continue
            if item.pk in seen:
                continue
            seen.add(item.pk)
            fields = []
            if not item.product_name:
                item.product_name = item.product.name
                fields.append('product_name')
            if item.product_price is None:
                item.product_price = item.product.base_price
                fields.append('product_price')
            if fields:
                item.save(update_fields=fields)
                updated += 1

        self.stdout.write(self.style.SUCCESS(
            f'Backfill completado: {updated} OrderItem(s) actualizados.'
        ))
