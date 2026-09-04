"""
Pruebas unitarias para la app carts.
Cubre: CRUD de carrito, items, y validaciones de stock.
"""
from django.test import TestCase, Client
from django.contrib.auth.hashers import make_password
from decimal import Decimal
import json

from apps.users.models import Usuario
from apps.products.models import Product, Variant
from apps.carts.models import Cart, CartItem


class CartModelTests(TestCase):
    """Tests para el modelo Cart."""

    def setUp(self):
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
            estado='Activo',
        )
        self.product = Product.objects.create(
            name='Camiseta Test',
            description='Una camiseta de prueba',
            base_price='25000.00',
            is_active=True,
            is_approved=True,
        )
        self.variant = Variant.objects.create(
            product=self.product,
            size='M',
            color='Negro',
            stock=10,
            price_variant='25000.00',
        )

    def test_creacion_carrito_sesion(self):
        cart = Cart.objects.create(session_key='session123')
        self.assertEqual(cart.session_key, 'session123')
        self.assertIsNone(cart.user)

    def test_creacion_carrito_usuario(self):
        cart = Cart.objects.create(user=self.usuario)
        self.assertEqual(cart.user, self.usuario)

    def test_total_items_vacio(self):
        cart = Cart.objects.create(session_key='session123')
        self.assertEqual(cart.total_items, 0)

    def test_total_items_con_items(self):
        cart = Cart.objects.create(session_key='session123')
        CartItem.objects.create(
            cart=cart,
            product=self.product,
            variant=self.variant,
            quantity=3,
            unit_price=self.variant.price_variant,
        )
        self.assertEqual(cart.total_items, 3)

    def test_total_amount(self):
        cart = Cart.objects.create(session_key='session123')
        CartItem.objects.create(
            cart=cart,
            product=self.product,
            variant=self.variant,
            quantity=2,
            unit_price=Decimal('25000.00'),
        )
        self.assertEqual(cart.total_amount, Decimal('50000.00'))


class CartItemModelTests(TestCase):
    """Tests para el modelo CartItem."""

    def setUp(self):
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
            estado='Activo',
        )
        self.product = Product.objects.create(
            name='Camiseta Test',
            description='Una camiseta de prueba',
            base_price='25000.00',
            is_active=True,
            is_approved=True,
        )
        self.variant = Variant.objects.create(
            product=self.product,
            size='M',
            color='Negro',
            stock=10,
            price_variant='25000.00',
        )
        self.cart = Cart.objects.create(user=self.usuario)

    def test_creacion_item(self):
        item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=2,
            unit_price=Decimal('25000.00'),
        )
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.subtotal, Decimal('50000.00'))

    def test_subtotal(self):
        item = CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=3,
            unit_price=Decimal('25000.00'),
        )
        self.assertEqual(item.subtotal, Decimal('75000.00'))

    def test_constraint_unique_cart_product_variant(self):
        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=1,
            unit_price=Decimal('25000.00'),
        )
        # La validación de clean detecta duplicados antes de llegar a la BD
        from django.core.exceptions import ValidationError
        duplicate = CartItem(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=1,
            unit_price=Decimal('25000.00'),
        )
        with self.assertRaises(ValidationError):
            duplicate.full_clean()


class CartViewSetTests(TestCase):
    """Tests para los endpoints de carrito."""

    def setUp(self):
        self.client = Client()
        self.url = '/api/cart/'
        self.product = Product.objects.create(
            name='Camiseta Test',
            description='Una camiseta de prueba',
            base_price='25000.00',
            is_active=True,
            is_approved=True,
        )
        self.variant = Variant.objects.create(
            product=self.product,
            size='M',
            color='Negro',
            stock=10,
            price_variant='25000.00',
        )

    def test_obtener_carrito_vacio(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_agregar_item_al_carrito(self):
        response = self.client.post(
            f'{self.url}add/',
            data=json.dumps({
                'product_id': self.product.id,
                'variant_id': self.variant.id,
                'quantity': 1,
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)

    def test_agregar_item_sin_stock(self):
        self.variant.stock = 0
        self.variant.save()
        response = self.client.post(
            f'{self.url}add/',
            data=json.dumps({
                'product_id': self.product.id,
                'variant_id': self.variant.id,
                'quantity': 1,
            }),
            content_type='application/json',
        )
        self.assertIn(response.status_code, [400, 422])
