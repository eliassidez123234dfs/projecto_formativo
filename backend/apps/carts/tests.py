from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.carts.models import Cart, CartItem
from apps.orders.models import Order
from apps.products.models import Product, Variant
from apps.users.models import Usuario


def _create_user(usuario="cartuser", correo="cart@test.com", **kwargs):
    defaults = dict(usuario=usuario, correo=correo, contrasena="dummy", estado="Activo", email_verificado=True)
    defaults.update(kwargs)
    return Usuario.objects.create(**defaults)


def _create_admin():
    return Usuario.objects.create(
        usuario="cartadmin", correo="cartadmin@test.com",
        contrasena="dummy", estado="Activo", rol="Administrador", email_verificado=True,
    )


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


def _create_product(name="Cart Product", **kwargs):
    defaults = dict(name=name, description="Desc", base_price="25000.00", is_active=True, is_approved=True)
    defaults.update(kwargs)
    return Product.objects.create(**defaults)


# ─── Model Tests ────────────────────────────────────────────────────────────


class CartModelTests(TestCase):
    def test_create_cart_session(self):
        c = Cart.objects.create(session_key="session-key-1")
        self.assertEqual(c.session_key, "session-key-1")
        self.assertIsNone(c.user)
        self.assertIsNone(c.order)

    def test_cart_str(self):
        c = Cart.objects.create(session_key="test-key")
        self.assertIn("test-key", str(c))

    def test_cart_total_items_empty(self):
        c = Cart.objects.create(session_key="empty")
        self.assertEqual(c.total_items, 0)

    def test_cart_total_amount_empty(self):
        c = Cart.objects.create(session_key="empty2")
        self.assertEqual(c.total_amount, Decimal("0.00"))

    def test_cart_total_items_with_items(self):
        c = Cart.objects.create(session_key="with-items")
        p = _create_product()
        v1 = Variant.objects.create(product=p, size="M", color="Negro", stock=10)
        v2 = Variant.objects.create(product=p, size="L", color="Blanco", stock=5)
        CartItem.objects.create(cart=c, product=p, variant=v1, quantity=3, unit_price="25.00")
        CartItem.objects.create(cart=c, product=p, variant=v2, quantity=2, unit_price="25.00")
        self.assertEqual(c.total_items, 5)

    def test_cart_total_amount_with_items(self):
        c = Cart.objects.create(session_key="with-amount")
        p = _create_product()
        v1 = Variant.objects.create(product=p, size="M", color="Negro", stock=10)
        v2 = Variant.objects.create(product=p, size="L", color="Blanco", stock=5)
        CartItem.objects.create(cart=c, product=p, variant=v1, quantity=2, unit_price="25.00")
        CartItem.objects.create(cart=c, product=p, variant=v2, quantity=1, unit_price="30.00")
        self.assertEqual(c.total_amount, Decimal("80.00"))

    def test_cart_unique_session_key(self):
        Cart.objects.create(session_key="unique-key")
        with self.assertRaises(Exception):
            Cart.objects.create(session_key="unique-key")


class CartItemModelTests(TestCase):
    def setUp(self):
        self.cart = Cart.objects.create(session_key="item-test")
        self.product = _create_product()
        self.variant = Variant.objects.create(product=self.product, size="M", color="Negro", stock=10)

    def test_create_cart_item(self):
        item = CartItem.objects.create(
            cart=self.cart, product=self.product, variant=self.variant,
            quantity=2, unit_price="25.00",
        )
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal("25.00"))

    def test_cart_item_str(self):
        item = CartItem.objects.create(
            cart=self.cart, product=self.product, variant=self.variant,
            quantity=3, unit_price="25.00",
        )
        self.assertIn("Cart Product", str(item))
        self.assertIn("3", str(item))

    def test_subtotal_calculation(self):
        item = CartItem.objects.create(
            cart=self.cart, product=self.product, variant=self.variant,
            quantity=4, unit_price="25.00",
        )
        self.assertEqual(item.subtotal, Decimal("100.00"))

    def test_unique_constraint(self):
        CartItem.objects.create(
            cart=self.cart, product=self.product, variant=self.variant,
            quantity=1, unit_price="25.00",
        )
        with self.assertRaises(Exception):
            CartItem.objects.create(
                cart=self.cart, product=self.product, variant=self.variant,
                quantity=1, unit_price="25.00",
            )

    def test_quantity_minimum(self):
        item = CartItem(cart=self.cart, product=self.product, variant=self.variant, quantity=0, unit_price="25.00")
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_quantity_exceeds_stock(self):
        item = CartItem(cart=self.cart, product=self.product, variant=self.variant, quantity=20, unit_price="25.00")
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_inactive_product_raises_validation(self):
        inactive = _create_product(name="Inactive Prod", is_active=False)
        v = Variant.objects.create(product=inactive, size="M", color="Negro", stock=5)
        item = CartItem(cart=self.cart, product=inactive, variant=v, quantity=1, unit_price="10.00")
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_unapproved_product_raises_validation(self):
        unapproved = _create_product(name="Unapproved Prod", is_approved=False)
        v = Variant.objects.create(product=unapproved, size="M", color="Negro", stock=5)
        item = CartItem(cart=self.cart, product=unapproved, variant=v, quantity=1, unit_price="10.00")
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_variant_not_belonging_to_product(self):
        other_product = _create_product(name="Other")
        other_variant = Variant.objects.create(product=other_product, size="L", color="Azul", stock=5)
        item = CartItem(cart=self.cart, product=self.product, variant=other_variant, quantity=1, unit_price="10.00")
        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_auto_set_unit_price(self):
        item = CartItem(cart=self.cart, product=self.product, variant=self.variant, quantity=1)
        item.save()
        self.assertEqual(item.unit_price, self.product.base_price)

    def test_cascade_delete_with_cart(self):
        item = CartItem.objects.create(
            cart=self.cart, product=self.product, variant=self.variant,
            quantity=1, unit_price="25.00",
        )
        item_id = item.id
        self.cart.delete()
        self.assertFalse(CartItem.objects.filter(id=item_id).exists())


# ─── API Tests ──────────────────────────────────────────────────────────────


class CartAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = _create_product()
        self.variant = Variant.objects.create(product=self.product, size="M", color="Negro", stock=10)

    def test_get_cart_empty(self):
        url = reverse("cart-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)

    def test_add_to_cart(self):
        url = reverse("cart-add")
        data = {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 2}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["quantity"], 2)

    def test_add_to_cart_increment_quantity(self):
        url = reverse("cart-add")
        for _ in range(2):
            self.client.post(url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 1}, format="json")
        cart = Cart.objects.first()
        item = CartItem.objects.first()
        self.assertEqual(item.quantity, 2)

    def test_add_to_cart_exceeds_stock(self):
        url = reverse("cart-add")
        data = {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 99}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_to_cart_invalid_product(self):
        url = reverse("cart-add")
        data = {"product_id": 9999, "variant_id": 9999, "quantity": 1}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_to_cart_inactive_product(self):
        inactive = _create_product(name="Inactive", is_active=False)
        v = Variant.objects.create(product=inactive, size="M", color="Negro", stock=5)
        url = reverse("cart-add")
        data = {"product_id": inactive.id, "variant_id": v.id, "quantity": 1}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_quantity(self):
        url = reverse("cart-add")
        self.client.post(url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 1}, format="json")
        item = CartItem.objects.first()
        url = reverse("cart-update-quantity", args=[item.id])
        response = self.client.patch(url, {"quantity": 5}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item.refresh_from_db()
        self.assertEqual(item.quantity, 5)

    def test_update_quantity_to_zero(self):
        url = reverse("cart-add")
        self.client.post(url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 1}, format="json")
        item = CartItem.objects.first()
        url = reverse("cart-update-quantity", args=[item.id])
        response = self.client.patch(url, {"quantity": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_quantity_exceeds_stock(self):
        url = reverse("cart-add")
        self.client.post(url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 1}, format="json")
        item = CartItem.objects.first()
        url = reverse("cart-update-quantity", args=[item.id])
        response = self.client.patch(url, {"quantity": 99}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_remove_item(self):
        url = reverse("cart-add")
        self.client.post(url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 1}, format="json")
        item = CartItem.objects.first()
        url = reverse("cart-remove-item", args=[item.id])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CartItem.objects.filter(id=item.id).exists())

    def test_remove_nonexistent_item(self):
        url = reverse("cart-remove-item", args=[9999])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_clear_cart(self):
        url = reverse("cart-add")
        self.client.post(url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 1}, format="json")
        url = reverse("cart-clear")
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        cart = Cart.objects.first()
        self.assertEqual(cart.items.count(), 0)

    def test_cart_persistence_across_requests(self):
        session = self.client.session
        session.save()
        session_key = session.session_key
        add_url = reverse("cart-add")
        self.client.post(add_url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 2}, format="json")
        list_url = reverse("cart-list")
        response = self.client.get(list_url, format="json")
        self.assertEqual(response.data["total_items"], 2)

    def test_authenticated_user_cart(self):
        user = _create_user()
        tokens = _get_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        add_url = reverse("cart-add")
        self.client.post(add_url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 3}, format="json")
        list_url = reverse("cart-list")
        response = self.client.get(list_url, format="json")
        self.assertEqual(response.data["total_items"], 3)


class CartMergeTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = _create_product()
        self.variant = Variant.objects.create(product=self.product, size="M", color="Negro", stock=20)
        self.user = _create_user()

    def test_cart_merges_on_login(self):
        add_url = reverse("cart-add")
        self.client.post(add_url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 2}, format="json")
        session_key = self.client.session.session_key
        self.assertIsNotNone(session_key)
        tokens = _get_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        list_url = reverse("cart-list")
        response = self.client.get(list_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_items"], 2)

    def test_cart_merge_combines_duplicate_items(self):
        user_cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=user_cart, product=self.product, variant=self.variant, quantity=1, unit_price="25.00")
        add_url = reverse("cart-add")
        self.client.post(add_url, {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 2}, format="json")
        tokens = _get_tokens(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        list_url = reverse("cart-list")
        response = self.client.get(list_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AdminCartAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _create_admin()
        tokens = _get_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_admin_list_carts(self):
        Cart.objects.create(session_key="admin-list-test")
        url = reverse("admin-cart-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_admin_retrieve_cart(self):
        c = Cart.objects.create(session_key="admin-retrieve-test")
        url = reverse("admin-cart-detail", args=[c.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)

    def test_admin_cart_regular_user_forbidden(self):
        client2 = APIClient()
        user = _create_user(usuario="regularuser")
        tokens = _get_tokens(user)
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("admin-cart-list")
        response = client2.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cart_status_update(self):
        c = Cart.objects.create(session_key="status-update-test")
        p = _create_product()
        v = Variant.objects.create(product=p, size="M", color="Negro", stock=10)
        CartItem.objects.create(cart=c, product=p, variant=v, quantity=2, unit_price="25.00")
        url = reverse("admin-cart-status", args=[c.id])
        response = self.client.patch(url, {"status": "pendiente"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        c.refresh_from_db()
        self.assertIsNotNone(c.order)
        self.assertEqual(c.order.status, "pendiente")

    def test_admin_cart_status_invalid(self):
        c = Cart.objects.create(session_key="invalid-status")
        url = reverse("admin-cart-status", args=[c.id])
        response = self.client.patch(url, {"status": "invalidstatus"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_cart_status_empty_cart(self):
        c = Cart.objects.create(session_key="empty-cart")
        url = reverse("admin-cart-status", args=[c.id])
        response = self.client.patch(url, {"status": "pendiente"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
