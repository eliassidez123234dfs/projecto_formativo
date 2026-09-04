# Data migration: backfill color_hex/color_nombre y normaliza precios a la regla COP.

from decimal import Decimal

from django.db import migrations

DEFAULT_COLOR_HEX = '#6B7280'
CURRENCY_MIN = Decimal('50')
CURRENCY_STEP = Decimal('50')

COLOR_MAP = {
    'rojo': '#DC2626', 'rojo_oscuro': '#991B1B', 'rojo_claro': '#FCA5A5',
    'azul': '#2563EB', 'azul_oscuro': '#1E3A5F', 'azul_claro': '#93C5FD',
    'verde': '#16A34A', 'verde_oscuro': '#166534', 'verde_claro': '#86EFAC',
    'negro': '#111827', 'gris': '#6B7280', 'gris_claro': '#D1D5DB',
    'blanco': '#FFFFFF', 'crema': '#FEF3C7', 'beige': '#F5F5DC',
    'amarillo': '#EAB308', 'naranja': '#EA580C', 'morado': '#9333EA',
    'rosa': '#EC4899', 'cafe': '#78350F', 'dorado': '#D97706',
    'plateado': '#9CA3AF', 'marino': '#1E3A5F', 'vino': '#7F1D1D',
}


def cop_normalize(value):
    value = Decimal(value)
    value = max(value, CURRENCY_MIN)
    return (value / CURRENCY_STEP).to_integral_value(rounding='ROUND_CEILING') * CURRENCY_STEP


def backfill(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    Variant = apps.get_model('products', 'Variant')

    for product in Product.objects.all():
        normalized = cop_normalize(product.base_price)
        if product.base_price != normalized:
            product.base_price = normalized
            product.save(update_fields=['base_price'])

        for variant in Variant.objects.filter(product=product):
            key = (variant.color or '').lower().replace(' ', '_')
            variant.color_hex = COLOR_MAP.get(key, DEFAULT_COLOR_HEX)
            if not variant.color_nombre:
                variant.color_nombre = variant.color
            if variant.price_variant is not None:
                price_norm = cop_normalize(variant.price_variant)
                if variant.price_variant != price_norm:
                    variant.price_variant = price_norm
            variant.save(update_fields=['color_hex', 'color_nombre', 'price_variant'])


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_product_approved_at_product_approved_by_and_more'),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
