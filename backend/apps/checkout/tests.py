"""
Pruebas unitarias para la app checkout.
Cubre: resumen de checkout y confirmación de orden.
"""
from django.test import TestCase, Client
from django.contrib.auth.hashers import make_password
from decimal import Decimal
import json

from apps.users.models import Usuario
from apps.products.models import Product, Variant
from apps.carts.models import Cart, CartItem
from apps.orders.models import Order


class CheckoutTests(TestCase):
    """Tests para endpoints de checkout."""

    def setUp(self):
        self.client = Client()
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
        # Crear sesión y carrito directamente
        session = self.client.session
        session.save()
        self.session_key = session.session_key
        self.cart = Cart.objects.create(session_key=self.session_key)

    def test_checkout_summary_vacio(self):
        response = self.client.get('/api/checkout/summary/')
        self.assertEqual(response.status_code, 200)

    def test_checkout_summary_con_items(self):
        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=2,
            unit_price=Decimal('25000.00'),
        )
        response = self.client.get('/api/checkout/summary/')
        self.assertEqual(response.status_code, 200)

    def test_checkout_confirm_crea_orden(self):
        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=2,
            unit_price=Decimal('25000.00'),
        )
        response = self.client.post(
            '/api/checkout/confirm/',
            data=json.dumps({
                'customer_name': 'Juan Pérez',
                'customer_email': 'juan@test.com',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Order.objects.filter(customer_email='juan@test.com').exists())

    def test_checkout_confirm_descuenta_stock(self):
        CartItem.objects.create(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=3,
            unit_price=Decimal('25000.00'),
        )
        self.client.post(
            '/api/checkout/confirm/',
            data=json.dumps({
                'customer_name': 'Juan Pérez',
                'customer_email': 'juan@test.com',
            }),
            content_type='application/json',
        )
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, 7)

    def test_checkout_confirm_sin_stock_suficiente(self):
        self.variant.stock = 1
        self.variant.save()
        # Crear item con cantidad mayor al stock
        item = CartItem(
            cart=self.cart,
            product=self.product,
            variant=self.variant,
            quantity=3,
            unit_price=Decimal('25000.00'),
        )
        # La validación de clean rechaza quantity > stock, así que guardamos directamente
        CartItem.objects.filter(cart=self.cart).delete()
        CartItem.objects.bulk_create([
            CartItem(cart=self.cart, product=self.product, variant=self.variant, quantity=3, unit_price=Decimal('25000.00'))
        ])
        response = self.client.post(
            '/api/checkout/confirm/',
            data=json.dumps({
                'customer_name': 'Juan Pérez',
                'customer_email': 'juan@test.com',
            }),
            content_type='application/json',
        )
        self.assertIn(response.status_code, [400, 422])

    def test_checkout_vacio_rechazado(self):
        response = self.client.post(
            '/api/checkout/confirm/',
            data=json.dumps({
                'customer_name': 'Juan Pérez',
                'customer_email': 'juan@test.com',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
