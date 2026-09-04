from __future__ import annotations

import hashlib
import json
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.carts.models import Cart, CartItem
from apps.orders.models import Order, OrderItem
from apps.products.models import Product, Variant
from apps.users.models import Usuario


def _create_user(usuario="checkoutuser", correo="checkout@test.com"):
    return Usuario.objects.create(
        usuario=usuario, correo=correo,
        contrasena="dummy", estado="Activo", email_verificado=True,
    )


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def _setup_cart(quantity=2, stock=10):
    product = Product.objects.create(name="Checkout Product", description="Desc", base_price="25000.00", is_active=True, is_approved=True)
    variant = Variant.objects.create(product=product, size="M", color="Negro", stock=stock)
    cart = Cart.objects.create(session_key="checkout-test-session")
    CartItem.objects.create(cart=cart, product=product, variant=variant, quantity=quantity, unit_price="25.00")
    return cart, product, variant


# â”€â”€â”€ Serializer Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class ShippingSerializerTests(TestCase):
    def test_valid_shipping_data(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "juan@example.com",
            "shipping_phone": "123456789",
            "shipping_address": "Calle 123, Ciudad",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_empty_name(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "",
            "shipping_email": "juan@example.com",
            "shipping_phone": "123456789",
            "shipping_address": "Calle 123",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_short_name(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "AB",
            "shipping_email": "juan@example.com",
            "shipping_phone": "123456789",
            "shipping_address": "Calle 123",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_invalid_email(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "not-an-email",
            "shipping_phone": "123456789",
            "shipping_address": "Calle 123",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_invalid_phone_letters(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "juan@example.com",
            "shipping_phone": "abc123",
            "shipping_address": "Calle 123",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_short_phone(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "juan@example.com",
            "shipping_phone": "123",
            "shipping_address": "Calle 123",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_long_phone(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "juan@example.com",
            "shipping_phone": "1" * 20,
            "shipping_address": "Calle 123",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_short_address(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "juan@example.com",
            "shipping_phone": "123456789",
            "shipping_address": "AB",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_empty_city(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "juan@example.com",
            "shipping_phone": "123456789",
            "shipping_address": "Calle 123",
            "shipping_city": "",
            "shipping_zipcode": "110111",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_empty_zipcode(self):
        from .serializers import ShippingSerializer
        data = {
            "shipping_name": "Juan Perez",
            "shipping_email": "juan@example.com",
            "shipping_phone": "123456789",
            "shipping_address": "Calle 123",
            "shipping_city": "Bogota",
            "shipping_zipcode": "",
        }
        serializer = ShippingSerializer(data=data)
        self.assertFalse(serializer.is_valid())


# â”€â”€â”€ Wompi Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class WompiSignatureTests(TestCase):
    def test_generate_signature(self):
        from .wompi import generate_signature
        sig = generate_signature("ORD-000001", 250000, "COP")
        self.assertIsNotNone(sig)
        self.assertEqual(len(sig), 64)

    def test_verify_webhook_signature_valid(self):
        from .wompi import verify_webhook_signature
        body = b'{"event": "transaction.updated", "data": {"id": "tx-001"}}'
        expected = hashlib.sha256(body).hexdigest()
        self.assertTrue(verify_webhook_signature(body, expected))

    def test_verify_webhook_signature_invalid(self):
        from .wompi import verify_webhook_signature
        body = b'{"event": "transaction.updated"}'
        self.assertFalse(verify_webhook_signature(body, "invalidsignature"))

    def test_verify_webhook_no_signature(self):
        from .wompi import verify_webhook_signature
        body = b'{"test": "data"}'
        self.assertFalse(verify_webhook_signature(body, None))

    def test_get_public_key(self):
        from .wompi import get_public_key
        from django.conf import settings
        self.assertEqual(get_public_key(), settings.WOMPI_PUBLIC_KEY)


class WompiAPITests(TestCase):
    @patch("apps.checkout.wompi.requests.get")
    def test_get_acceptance_token_failure(self, mock_get):
        mock_get.side_effect = Exception("Network error")
        from .wompi import get_acceptance_token
        result = get_acceptance_token()
        self.assertIsNone(result)

    @patch("apps.checkout.wompi.requests.post")
    @patch("apps.checkout.wompi.get_acceptance_token")
    def test_create_transaction_failure(self, mock_token, mock_post):
        mock_token.return_value = None
        from .wompi import create_transaction
        result = create_transaction(Decimal("25000"), "ORD-001", "test@test.com", "http://localhost")
        self.assertIsNone(result)

    @patch("apps.checkout.wompi.requests.get")
    def test_get_transaction_failure(self, mock_get):
        import requests as req
        mock_get.side_effect = req.ConnectionError("Network error")
        from .wompi import get_transaction
        result = get_transaction("tx-001")
        self.assertIsNone(result)


# â”€â”€â”€ Checkout Flow Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class CheckoutSummaryTests(TestCase):
    def test_checkout_summary_empty_cart(self):
        client = APIClient()
        session = client.session
        session.save()
        Cart.objects.create(session_key=session.session_key)
        url = reverse("checkout-summary")
        response = client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 0)

    def test_checkout_summary_with_items(self):
        client = APIClient()
        session = client.session
        session.save()
        cart = Cart.objects.create(session_key=session.session_key)
        p = Product.objects.create(name="Summary Prod", description="Desc", base_price="25000.00", is_active=True, is_approved=True)
        v = Variant.objects.create(product=p, size="M", color="Negro", stock=10)
        CartItem.objects.create(cart=cart, product=p, variant=v, quantity=3, unit_price="25.00")
        url = reverse("checkout-summary")
        response = client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 3)
        self.assertEqual(response.data["total_amount"], "75.00")


class CheckoutInitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        session = self.client.session
        session.save()
        self.cart = Cart.objects.create(session_key=session.session_key)
        self.product = Product.objects.create(name="Init Prod", description="Desc", base_price="25000.00", is_active=True, is_approved=True)
        self.variant = Variant.objects.create(product=self.product, size="M", color="Negro", stock=10)
        CartItem.objects.create(cart=self.cart, product=self.product, variant=self.variant, quantity=2, unit_price="25.00")

    def test_checkout_init_success(self):
        url = reverse("checkout-init")
        data = {
            "shipping_name": "Maria Lopez",
            "shipping_email": "maria@example.com",
            "shipping_phone": "3001234567",
            "shipping_address": "Carrera 10 #20-30",
            "shipping_city": "Medellin",
            "shipping_zipcode": "050001",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("order_id", response.data)
        self.assertIn("order_number", response.data)
        self.assertTrue(Order.objects.filter(id=response.data["order_id"]).exists())

    def test_checkout_init_empty_cart(self):
        self.cart.items.all().delete()
        url = reverse("checkout-init")
        data = {
            "shipping_name": "Maria Lopez",
            "shipping_email": "maria@example.com",
            "shipping_phone": "3001234567",
            "shipping_address": "Carrera 10 #20-30",
            "shipping_city": "Medellin",
            "shipping_zipcode": "050001",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_init_insufficient_stock(self):
        self.variant.stock = 1
        self.variant.save()
        url = reverse("checkout-init")
        data = {
            "shipping_name": "Maria Lopez",
            "shipping_email": "maria@example.com",
            "shipping_phone": "3001234567",
            "shipping_address": "Carrera 10 #20-30",
            "shipping_city": "Medellin",
            "shipping_zipcode": "050001",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_init_invalid_shipping(self):
        url = reverse("checkout-init")
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_checkout_init_reduces_stock(self):
        original_stock = self.variant.stock
        url = reverse("checkout-init")
        data = {
            "shipping_name": "Maria Lopez",
            "shipping_email": "maria@example.com",
            "shipping_phone": "3001234567",
            "shipping_address": "Carrera 10 #20-30",
            "shipping_city": "Medellin",
            "shipping_zipcode": "050001",
        }
        self.client.post(url, data, format="json")
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, original_stock - 2)

    def test_checkout_init_clears_cart_items(self):
        url = reverse("checkout-init")
        data = {
            "shipping_name": "Maria Lopez",
            "shipping_email": "maria@example.com",
            "shipping_phone": "3001234567",
            "shipping_address": "Carrera 10 #20-30",
            "shipping_city": "Medellin",
            "shipping_zipcode": "050001",
        }
        self.client.post(url, data, format="json")
        self.cart.refresh_from_db()
        self.assertEqual(self.cart.items.count(), 0)


class CreatePaymentTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = Order.objects.create(
            customer_name="Test User", customer_email="test@test.com",
            status=Order.STATUS_PENDING, total=Decimal("50.00"),
            shipping_name="Test User", shipping_email="test@test.com",
            shipping_phone="3001234567", shipping_address="Calle 1",
            shipping_city="City", shipping_zipcode="00000",
        )

    @patch("apps.checkout.views.create_transaction")
    def test_create_payment_success(self, mock_tx):
        mock_tx.return_value = {
            "data": {
                "id": "tx-001",
                "reference": self.order.order_number,
                "status": "PENDING",
                "redirect_url": "https://checkout.wompi.co/tx-001",
            }
        }
        url = reverse("checkout-create-payment")
        response = self.client.post(url, {"order_id": self.order.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("transaction_id", response.data)
        self.assertIn("redirect_url", response.data)
        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.payment_transaction_id)

    def test_create_payment_nonexistent_order(self):
        url = reverse("checkout-create-payment")
        response = self.client.post(url, {"order_id": 9999}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_payment_already_paid(self):
        self.order.status = Order.STATUS_PAID
        self.order.save()
        url = reverse("checkout-create-payment")
        response = self.client.post(url, {"order_id": self.order.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.checkout.views.create_transaction")
    def test_create_payment_wompi_failure(self, mock_tx):
        mock_tx.return_value = None
        url = reverse("checkout-create-payment")
        response = self.client.post(url, {"order_id": self.order.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)

    def test_create_payment_zero_total(self):
        self.order.total = Decimal("0.00")
        self.order.save()
        url = reverse("checkout-create-payment")
        response = self.client.post(url, {"order_id": self.order.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PaymentStatusTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = Order.objects.create(
            customer_name="Test User", customer_email="test@test.com",
            status=Order.STATUS_PENDING, total=Decimal("50.00"),
        )

    def test_payment_status_by_order_number(self):
        url = reverse("checkout-payment-status")
        response = self.client.get(url, {"reference": self.order.order_number}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["order_number"], self.order.order_number)

    def test_payment_status_nonexistent(self):
        url = reverse("checkout-payment-status")
        response = self.client.get(url, {"reference": "NONEXISTENT"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_payment_status_missing_reference(self):
        url = reverse("checkout-payment-status")
        response = self.client.get(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class WompiWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.order = Order.objects.create(
            customer_name="Webhook User", customer_email="webhook@test.com",
            status=Order.STATUS_PENDING, total=Decimal("50.00"),
        )
        self.product = Product.objects.create(name="Webhook Prod", description="Desc", base_price="25000.00")
        self.variant = Variant.objects.create(product=self.product, size="M", color="Negro", stock=10)
        OrderItem.objects.create(order=self.order, product=self.product, variant=self.variant, quantity=2, unit_price="25.00")

    @override_settings(WOMPI_WEBHOOK_SECRET="")
    def test_webhook_approved(self):
        url = reverse("checkout-webhook")
        payload = {
            "event": "transaction.updated",
            "data": {
                "transaction": {
                    "id": "tx-webhook-001",
                    "reference": self.order.order_number,
                    "status": "APPROVED",
                }
            },
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.STATUS_PAID)
        self.assertEqual(self.order.payment_wompi_status, "APPROVED")

    @override_settings(WOMPI_WEBHOOK_SECRET="")
    def test_webhook_declined_restores_stock(self):
        original_stock = self.variant.stock
        url = reverse("checkout-webhook")
        payload = {
            "event": "transaction.updated",
            "data": {
                "transaction": {
                    "id": "tx-webhook-002",
                    "reference": self.order.order_number,
                    "status": "DECLINED",
                    "status_message": "Card declined",
                }
            },
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.STATUS_CANCELLED)
        self.variant.refresh_from_db()
        self.assertEqual(self.variant.stock, original_stock + 2)

    @override_settings(WOMPI_WEBHOOK_SECRET="")
    def test_webhook_already_paid(self):
        self.order.status = Order.STATUS_PAID
        self.order.save()
        url = reverse("checkout-webhook")
        payload = {
            "event": "transaction.updated",
            "data": {
                "transaction": {
                    "id": "tx-webhook-003",
                    "reference": self.order.order_number,
                    "status": "APPROVED",
                }
            },
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "already_processed")

    @override_settings(WOMPI_WEBHOOK_SECRET="")
    def test_webhook_order_not_found(self):
        url = reverse("checkout-webhook")
        payload = {
            "event": "transaction.updated",
            "data": {
                "transaction": {
                    "id": "tx-webhook-004",
                    "reference": "NONEXISTENT-ORDER",
                    "status": "APPROVED",
                }
            },
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(WOMPI_WEBHOOK_SECRET="")
    def test_webhook_invalid_json(self):
        url = reverse("checkout-webhook")
        response = self.client.post(url, "not json", content_type="application/json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(WOMPI_WEBHOOK_SECRET="test_secret")
    def test_webhook_invalid_signature(self):
        url = reverse("checkout-webhook")
        payload = {
            "event": "transaction.updated",
            "data": {
                "transaction": {
                    "id": "tx-005",
                    "reference": self.order.order_number,
                    "status": "APPROVED",
                }
            },
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(WOMPI_WEBHOOK_SECRET="")
    def test_webhook_missing_reference(self):
        url = reverse("checkout-webhook")
        payload = {
            "event": "transaction.updated",
            "data": {
                "transaction": {"id": "tx-006", "status": "APPROVED"}
            },
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
