from __future__ import annotations

from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.test import TestCase
from PIL import Image

from apps.products.models import Product, ProductImage, Variant


def build_test_image(name: str = 'test.png', size: tuple[int, int] = (400, 400), color: str = 'white'):
    buffer = BytesIO()
    image = Image.new('RGB', size, color=color)
    image.save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


class ProductModelTests(TestCase):
    def test_product_requires_valid_minimum_fields(self):
        product = Product(name='Camiseta Premium', description='Desc', base_price='25000')
        product.full_clean()
        product.save()

        self.assertEqual(product.name, 'Camiseta Premium')
        self.assertFalse(product.can_be_published)

    def test_product_rejects_invalid_price(self):
        product = Product(name='Camiseta Barata', description='Desc', base_price=0)
        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_variant_limits_and_uniqueness(self):
        product = Product.objects.create(name='Producto Base', description='Desc', base_price='35000')

        Variant.objects.create(product=product, size='S', color='Negro', stock=5)
        Variant.objects.create(product=product, size='M', color='Negro', stock=5)
        Variant.objects.create(product=product, size='L', color='Negro', stock=5)
        Variant.objects.create(product=product, size='XL', color='Negro', stock=5)

        too_many_sizes = Variant(product=product, size='XXL', color='Negro', stock=1)
        with self.assertRaises(ValidationError):
            too_many_sizes.full_clean()

        duplicate = Variant(product=product, size='S', color='Negro', stock=1)
        with self.assertRaises(ValidationError):
            duplicate.full_clean()

    def test_image_requires_main_safe_format_and_resolution(self):
        product = Product.objects.create(name='Producto Imagen', description='Desc', base_price='40000')
        image = ProductImage(product=product, image=build_test_image())
        image.full_clean()
        image.save()

        self.assertTrue(product.has_main_image)
        self.assertTrue(product.can_be_published is False)
