from __future__ import annotations

from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.orders.models import Order, OrderItem
from apps.products.models import Product, Variant
from apps.users.models import Usuario


def _create_admin():
    return Usuario.objects.create(
        usuario="ordersadmin", correo="ordersadmin@test.com",
        contrasena="dummy", estado="Activo", rol="Administrador", email_verificado=True,
    )


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def _create_order(status=Order.STATUS_PENDING, total="50.00", **kwargs):
    defaults = dict(
        customer_name="Test User", customer_email="test@test.com",
        status=status, total=Decimal(total),
        shipping_name="Test User", shipping_email="test@test.com",
        shipping_phone="3001234567", shipping_address="Calle 1",
        shipping_city="City", shipping_zipcode="00000",
    )
    defaults.update(kwargs)
    return Order.objects.create(**defaults)


# ─── Model Tests ────────────────────────────────────────────────────────────


class OrderModelTests(TestCase):
    def test_create_order(self):
        order = _create_order()
        self.assertIsNotNone(order.order_number)
        self.assertTrue(order.order_number.startswith("ORD-"))
        self.assertEqual(order.status, Order.STATUS_PENDING)

    def test_order_str_with_number(self):
        order = _create_order()
        expected = f"Orden #{order.order_number}"
        self.assertEqual(str(order), expected)

    def test_order_str_without_number(self):
        order = Order(customer_name="No Number", customer_email="test@test.com")
        self.assertIn("nueva", str(order))

    def test_order_number_generated_on_save(self):
        order = Order.objects.create(customer_name="Gen Number", customer_email="gen@test.com")
        self.assertIsNotNone(order.order_number)
        self.assertIn(str(order.id), order.order_number)

    def test_is_active_order_pending(self):
        order = _create_order(status=Order.STATUS_PENDING)
        self.assertTrue(order.is_active_order)

    def test_is_active_order_paid(self):
        order = _create_order(status=Order.STATUS_PAID)
        self.assertTrue(order.is_active_order)

    def test_is_active_order_shipped(self):
        order = _create_order(status=Order.STATUS_SHIPPED)
        self.assertTrue(order.is_active_order)

    def test_is_active_order_delivered(self):
        order = _create_order(status=Order.STATUS_DELIVERED)
        self.assertFalse(order.is_active_order)

    def test_is_active_order_cancelled(self):
        order = _create_order(status=Order.STATUS_CANCELLED)
        self.assertFalse(order.is_active_order)

    def test_order_default_total(self):
        order = Order.objects.create(customer_name="Default Total", customer_email="total@test.com")
        self.assertEqual(order.total, Decimal("0.00"))

    def test_order_ordering_newest_first(self):
        o1 = _create_order()
        o2 = _create_order()
        qs = Order.objects.all()
        self.assertEqual(qs.first(), o2)

    def test_order_optional_fields_null(self):
        order = Order.objects.create(customer_name="Test", customer_email="t@t.com")
        self.assertIsNone(order.user)
        self.assertIsNone(order.shipping_zipcode)
        self.assertIsNone(order.payment_transaction_id)
        self.assertIsNone(order.payment_confirmed_at)

    def test_order_str_with_custom_number(self):
        order = _create_order()
        order.order_number = "CUSTOM-001"
        order.save()
        self.assertIn("CUSTOM-001", str(order))

    def test_status_choices_are_valid(self):
        for status_choice, _ in Order.STATUS_CHOICES:
            order = _create_order(status=status_choice)
            self.assertEqual(order.status, status_choice)
            order.delete()

    def test_order_total_decimal_precision(self):
        order = _create_order(total="99.99")
        self.assertEqual(order.total, Decimal("99.99"))

    def test_order_status_display(self):
        order = _create_order(status=Order.STATUS_PAID)
        self.assertEqual(order.get_status_display(), "Pagado")


class OrderItemModelTests(TestCase):
    def setUp(self):
        self.order = _create_order()
        self.product = Product.objects.create(name="Order Item Prod", description="Desc", base_price="25.00")
        self.variant = Variant.objects.create(product=self.product, size="M", color="Negro", stock=10)

    def test_create_order_item(self):
        item = OrderItem.objects.create(
            order=self.order, product=self.product,
            variant=self.variant, quantity=2, unit_price=Decimal("25.00"),
        )
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal("25.00"))

    def test_order_item_str(self):
        item = OrderItem.objects.create(
            order=self.order, product=self.product,
            variant=self.variant, quantity=3, unit_price="25.00",
        )
        self.assertIn("Order Item Prod", str(item))
        self.assertIn("3", str(item))

    def test_order_item_default_quantity(self):
        item = OrderItem.objects.create(
            order=self.order, product=self.product,
            variant=self.variant, unit_price="25.00",
        )
        self.assertEqual(item.quantity, 1)

    def test_order_item_protect_on_product_delete(self):
        item = OrderItem.objects.create(
            order=self.order, product=self.product,
            variant=self.variant, quantity=1, unit_price="25.00",
        )
        with self.assertRaises(Exception):
            self.product.delete()

    def test_order_item_protect_on_variant_delete(self):
        item = OrderItem.objects.create(
            order=self.order, product=self.product,
            variant=self.variant, quantity=1, unit_price="25.00",
        )
        with self.assertRaises(Exception):
            self.variant.delete()

    def test_order_item_cascade_on_order_delete(self):
        item = OrderItem.objects.create(
            order=self.order, product=self.product,
            variant=self.variant, quantity=1, unit_price="25.00",
        )
        item_id = item.id
        self.order.delete()
        self.assertFalse(OrderItem.objects.filter(id=item_id).exists())

    def test_multiple_items_per_order(self):
        v2 = Variant.objects.create(product=self.product, size="L", color="Azul", stock=5)
        OrderItem.objects.create(order=self.order, product=self.product, variant=self.variant, quantity=1, unit_price="25.00")
        OrderItem.objects.create(order=self.order, product=self.product, variant=v2, quantity=2, unit_price="30.00")
        self.assertEqual(self.order.items.count(), 2)


# ─── Order API Tests ────────────────────────────────────────────────────────


class OrderAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_order_via_api(self):
        url = reverse("order-list")
        data = {
            "customer_name": "API User",
            "customer_email": "api@test.com",
            "shipping_name": "API User",
            "shipping_email": "api@test.com",
            "shipping_phone": "3001234567",
            "shipping_address": "Calle 100",
            "shipping_city": "Bogota",
            "shipping_zipcode": "110111",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("order_number", response.data)

    def test_create_order_with_camelcase_fields(self):
        url = reverse("order-list")
        data = {
            "customer_name": "Camel User",
            "customer_email": "camel@test.com",
            "imageUrl": "https://cldn.com/img.png",
            "cloudinaryPublicId": "test/public/id",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["image_url"], "https://cldn.com/img.png")

    def test_list_orders(self):
        _create_order()
        url = reverse("order-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_retrieve_order(self):
        order = _create_order()
        url = reverse("order-detail", args=[order.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["order_number"], order.order_number)

    def test_retrieve_nonexistent_order(self):
        url = reverse("order-detail", args=[9999])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_order(self):
        order = _create_order()
        url = reverse("order-detail", args=[order.id])
        response = self.client.patch(url, {"notes": "Updated notes"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.notes, "Updated notes")

    def test_delete_order(self):
        order = _create_order()
        url = reverse("order-detail", args=[order.id])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


class AdminOrderAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _create_admin()
        tokens = _get_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_admin_list_orders(self):
        _create_order()
        url = reverse("admin-order-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_admin_list_orders_filter_by_user(self):
        user = Usuario.objects.create(usuario="filteruser", correo="filter@test.com", contrasena="dummy")
        _create_order()
        Order.objects.create(user=user, customer_name="Filtered", customer_email="f@test.com", status=Order.STATUS_PENDING, total=Decimal("10.00"))
        url = reverse("admin-order-list")
        response = self.client.get(url, {"user_id": user.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for r in response.data["results"]:
            self.assertEqual(r["customer_name"], "Filtered")

    def test_admin_retrieve_order_detail(self):
        order = _create_order()
        p = Product.objects.create(name="Admin Detail", description="Desc", base_price="25.00")
        v = Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        OrderItem.objects.create(order=order, product=p, variant=v, quantity=2, unit_price="25.00")
        url = reverse("admin-order-detail", args=[order.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)

    def test_admin_order_status_update(self):
        order = _create_order()
        url = reverse("admin-order-status", args=[order.id])
        response = self.client.patch(url, {"status": "enviado"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, "enviado")

    def test_admin_order_status_invalid(self):
        order = _create_order()
        url = reverse("admin-order-status", args=[order.id])
        response = self.client.patch(url, {"status": "invalidstatus"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_order_status_missing(self):
        order = _create_order()
        url = reverse("admin-order-status", args=[order.id])
        response = self.client.patch(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_modify_paid_order(self):
        order = _create_order(status=Order.STATUS_PAID)
        url = reverse("admin-order-status", args=[order.id])
        response = self.client.patch(url, {"status": "enviado"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cannot_modify_cancelled_order(self):
        order = _create_order(status=Order.STATUS_CANCELLED)
        url = reverse("admin-order-status", args=[order.id])
        response = self.client.patch(url, {"status": "pendiente"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_reprocess_cancelled_order(self):
        order = _create_order(status=Order.STATUS_CANCELLED)
        url = reverse("admin-order-reprocess", args=[order.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.STATUS_PENDING)

    def test_admin_reprocess_non_cancelled(self):
        order = _create_order(status=Order.STATUS_PENDING)
        url = reverse("admin-order-reprocess", args=[order.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_regular_user_forbidden(self):
        client2 = APIClient()
        user = Usuario.objects.create(usuario="regular", correo="regular@test.com", contrasena="dummy")
        tokens = _get_tokens(user)
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("admin-order-list")
        response = client2.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class OrderStatusTransitionTests(TestCase):
    def test_pending_to_paid(self):
        order = _create_order(status=Order.STATUS_PENDING)
        order.status = Order.STATUS_PAID
        order.save()
        self.assertEqual(order.status, Order.STATUS_PAID)

    def test_paid_to_shipped(self):
        order = _create_order(status=Order.STATUS_PAID)
        order.status = Order.STATUS_SHIPPED
        order.save()
        self.assertEqual(order.status, Order.STATUS_SHIPPED)

    def test_shipped_to_delivered(self):
        order = _create_order(status=Order.STATUS_SHIPPED)
        order.status = Order.STATUS_DELIVERED
        order.save()
        self.assertEqual(order.status, Order.STATUS_DELIVERED)

    def test_pending_to_cancelled(self):
        order = _create_order(status=Order.STATUS_PENDING)
        order.status = Order.STATUS_CANCELLED
        order.save()
        self.assertEqual(order.status, Order.STATUS_CANCELLED)

    def test_paid_to_cancelled(self):
        order = _create_order(status=Order.STATUS_PAID)
        order.status = Order.STATUS_CANCELLED
        order.save()
        self.assertEqual(order.status, Order.STATUS_CANCELLED)
