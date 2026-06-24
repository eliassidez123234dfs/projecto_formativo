from __future__ import annotations

from decimal import Decimal
from io import BytesIO

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.products.models import Product, ProductAudit, ProductImage, Variant
from apps.users.models import Usuario


def build_test_image(name: str = 'test.png', size: tuple[int, int] = (400, 400), color: str = 'white'):
    buffer = BytesIO()
    image = Image.new('RGB', size, color=color)
    image.save(buffer, format='PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


def _create_admin():
    return Usuario.objects.create(
        usuario="admin", correo="admin@test.com",
        contrasena="dummy", estado="Activo", rol="Administrador", email_verificado=True,
    )


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# ─── Existing Model Tests (preserved) ───────────────────────────────────────


class ProductModelTests(TestCase):
    def test_product_requires_valid_minimum_fields(self):
        product = Product(name='Camiseta Premium', description='Desc', base_price='25.00')
        product.full_clean()
        product.save()
        self.assertEqual(product.name, 'Camiseta Premium')
        self.assertFalse(product.can_be_published)

    def test_product_rejects_invalid_price(self):
        product = Product(name='Camiseta Barata', description='Desc', base_price='0')
        with self.assertRaises(ValidationError):
            product.full_clean()

    def test_variant_limits_and_uniqueness(self):
        product = Product.objects.create(name='Producto Base', description='Desc', base_price='35.00')
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
        product = Product.objects.create(name='Producto Imagen', description='Desc', base_price='40.00')
        image = ProductImage(product=product, image=build_test_image())
        image.full_clean()
        image.save()
        self.assertTrue(product.has_main_image)
        self.assertTrue(product.can_be_published is False)


# ─── New Model Tests ────────────────────────────────────────────────────────


class ProductModelExtendedTests(TestCase):
    def test_product_str(self):
        p = Product.objects.create(name="Test Product", description="Desc", base_price="25.00")
        self.assertEqual(str(p), "Test Product")

    def test_product_defaults(self):
        p = Product.objects.create(name="Defaults", description="Desc", base_price="10.00")
        self.assertFalse(p.is_active)
        self.assertFalse(p.is_approved)

    def test_product_ordering(self):
        p1 = Product.objects.create(name="First", description="Desc", base_price="10.00")
        p2 = Product.objects.create(name="Second", description="Desc", base_price="20.00")
        qs = Product.objects.all()
        self.assertEqual(qs.first(), p2)

    def test_main_image_property_no_images(self):
        p = Product.objects.create(name="No Images", description="Desc", base_price="10.00")
        self.assertIsNone(p.main_image)

    def test_main_image_property_with_images(self):
        p = Product.objects.create(name="With Images", description="Desc", base_price="10.00")
        img = ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png", is_main=True)
        self.assertEqual(p.main_image, img)

    def test_has_main_image_false(self):
        p = Product.objects.create(name="No Main", description="Desc", base_price="10.00")
        self.assertFalse(p.has_main_image)

    def test_has_main_image_true(self):
        p = Product.objects.create(name="Has Main", description="Desc", base_price="10.00")
        ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png", is_main=True)
        self.assertTrue(p.has_main_image)

    def test_has_valid_variant_false(self):
        p = Product.objects.create(name="No Stock", description="Desc", base_price="10.00")
        self.assertFalse(p.has_valid_variant)

    def test_has_valid_variant_true(self):
        p = Product.objects.create(name="Has Stock", description="Desc", base_price="10.00")
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        self.assertTrue(p.has_valid_variant)

    def test_can_be_published_both_required(self):
        p = Product.objects.create(name="Publish Test", description="Desc", base_price="10.00")
        self.assertFalse(p.can_be_published)
        ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png", is_main=True)
        self.assertFalse(p.can_be_published)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        self.assertTrue(p.can_be_published)

    def test_checklist_keys(self):
        p = Product.objects.create(name="Checklist", description="Desc", base_price="10.00")
        checklist = p.checklist
        self.assertIn("name", checklist)
        self.assertIn("description", checklist)
        self.assertIn("main_image", checklist)
        self.assertIn("variant_with_stock", checklist)
        self.assertIn("ready_to_publish", checklist)

    def test_empty_name_validation(self):
        p = Product(name="", description="Desc", base_price="10.00")
        with self.assertRaises(ValidationError):
            p.full_clean()

    def test_empty_description_validation(self):
        p = Product(name="Test", description="", base_price="10.00")
        with self.assertRaises(ValidationError):
            p.full_clean()

    def test_name_too_long(self):
        p = Product(name="A" * 101, description="Desc", base_price="10.00")
        with self.assertRaises(ValidationError):
            p.full_clean()

    def test_description_too_long(self):
        p = Product(name="Test", description="A" * 501, base_price="10.00")
        with self.assertRaises(ValidationError):
            p.full_clean()

    def test_negative_price(self):
        p = Product(name="Negative", description="Desc", base_price="-10.00")
        with self.assertRaises(ValidationError):
            p.full_clean()

    def test_has_active_order_items_no_orders(self):
        p = Product.objects.create(name="No Orders", description="Desc", base_price="10.00")
        self.assertFalse(p.has_active_order_items)


class VariantModelExtendedTests(TestCase):
    def test_variant_str(self):
        p = Product.objects.create(name="Str Test", description="Desc", base_price="10.00")
        v = Variant.objects.create(product=p, size="L", color="Rojo", stock=3)
        self.assertIn("Str Test", str(v))
        self.assertIn("L", str(v))
        self.assertIn("Rojo", str(v))

    def test_variant_default_stock(self):
        p = Product.objects.create(name="Default Stock", description="Desc", base_price="10.00")
        v = Variant.objects.create(product=p, size="S", color="Azul")
        self.assertEqual(v.stock, 0)

    def test_variant_negative_stock(self):
        p = Product.objects.create(name="Neg Stock", description="Desc", base_price="10.00")
        v = Variant(product=p, size="S", color="Azul", stock=-1)
        with self.assertRaises(ValidationError):
            v.full_clean()

    def test_variant_empty_size(self):
        p = Product.objects.create(name="Empty Size", description="Desc", base_price="10.00")
        v = Variant(product=p, size="", color="Azul", stock=1)
        with self.assertRaises(ValidationError):
            v.full_clean()

    def test_variant_empty_color(self):
        p = Product.objects.create(name="Empty Color", description="Desc", base_price="10.00")
        v = Variant(product=p, size="M", color="", stock=1)
        with self.assertRaises(ValidationError):
            v.full_clean()

    def test_variant_max_colors(self):
        p = Product.objects.create(name="Max Colors", description="Desc", base_price="10.00")
        colors = ["Rojo", "Azul", "Verde", "Negro", "Blanco", "Gris", "Amarillo", "Naranja", "Morado", "Rosa"]
        for i, color in enumerate(colors):
            Variant.objects.create(product=p, size="M", color=color, stock=1)
        v = Variant(product=p, size="M", color="Marrón", stock=1)
        with self.assertRaises(ValidationError):
            v.full_clean()

    def test_variant_ordering(self):
        p = Product.objects.create(name="Order Test", description="Desc", base_price="10.00")
        v1 = Variant.objects.create(product=p, size="M", color="Azul", stock=1)
        v2 = Variant.objects.create(product=p, size="S", color="Rojo", stock=1)
        qs = Variant.objects.filter(product=p)
        self.assertEqual(list(qs), [v1, v2])

    def test_variant_unique_constraint(self):
        p = Product.objects.create(name="Unique", description="Desc", base_price="10.00")
        Variant.objects.create(product=p, size="M", color="Negro", stock=1)
        with self.assertRaises(Exception):
            Variant.objects.create(product=p, size="M", color="Negro", stock=1)


class ProductImageModelExtendedTests(TestCase):
    def test_image_str(self):
        p = Product.objects.create(name="Img Str", description="Desc", base_price="10.00")
        img = ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png", order=1)
        self.assertIn("Img Str", str(img))

    def test_image_url_cloudinary_priority(self):
        p = Product.objects.create(name="URL Test", description="Desc", base_price="10.00")
        img = ProductImage.objects.create(
            product=p, cloudinary_url="https://cldn.com/img.png",
            image=build_test_image(), is_main=True,
        )
        self.assertEqual(img.image_url, "https://cldn.com/img.png")

    def test_image_url_fallback(self):
        p = Product.objects.create(name="URL Fallback", description="Desc", base_price="10.00")
        img = ProductImage.objects.create(product=p, image=build_test_image(), is_main=True)
        self.assertIsNotNone(img.image_url)

    def test_image_no_source_validation(self):
        p = Product.objects.create(name="No Source", description="Desc", base_price="10.00")
        img = ProductImage(product=p)
        with self.assertRaises(ValidationError):
            img.full_clean()

    def test_image_max_per_product(self):
        p = Product.objects.create(name="Max Img", description="Desc", base_price="10.00")
        for i in range(5):
            ProductImage.objects.create(product=p, cloudinary_url=f"https://cldn.com/img{i}.png")
        img = ProductImage(product=p, cloudinary_url="https://cldn.com/toomany.png")
        with self.assertRaises(ValidationError):
            img.full_clean()

    def test_image_auto_set_main(self):
        p = Product.objects.create(name="Auto Main", description="Desc", base_price="10.00")
        img = ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png")
        self.assertTrue(img.is_main)

    def test_image_auto_increment_order(self):
        p = Product.objects.create(name="Auto Order", description="Desc", base_price="10.00")
        img1 = ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img1.png")
        img2 = ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img2.png")
        self.assertEqual(img1.order, 1)
        self.assertEqual(img2.order, 2)

    def test_image_invalid_format(self):
        p = Product.objects.create(name="Bad Format", description="Desc", base_price="10.00")
        bad_file = SimpleUploadedFile("test.gif", b"fakegifcontent", content_type="image/gif")
        img = ProductImage(product=p, image=bad_file)
        with self.assertRaises(ValidationError):
            img.full_clean()

    def test_main_image_exclusive(self):
        p = Product.objects.create(name="Exclusive Main", description="Desc", base_price="10.00")
        img1 = ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img1.png", is_main=True)
        img2 = ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img2.png", is_main=True)
        img1.refresh_from_db()
        img2.refresh_from_db()
        self.assertFalse(img1.is_main)
        self.assertTrue(img2.is_main)


# ─── API Tests ──────────────────────────────────────────────────────────────


class ProductAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_list_products(self):
        Product.objects.create(name="API Test", description="Desc", base_price="25.00")
        url = reverse("product-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)

    def test_create_product(self):
        url = reverse("product-list")
        data = {"name": "New Product", "description": "New desc", "base_price": "30.00"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "New Product")

    def test_create_product_invalid_price(self):
        url = reverse("product-list")
        data = {"name": "Bad Price", "description": "Desc", "base_price": "0"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_product_empty_name(self):
        url = reverse("product-list")
        data = {"name": "", "description": "Desc", "base_price": "10.00"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_product(self):
        p = Product.objects.create(name="Retrieve Me", description="Desc", base_price="25.00")
        url = reverse("product-detail", args=[p.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Retrieve Me")

    def test_retrieve_nonexistent_product(self):
        url = reverse("product-detail", args=[9999])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_product(self):
        p = Product.objects.create(name="Update Me", description="Desc", base_price="25.00")
        url = reverse("product-detail", args=[p.id])
        response = self.client.patch(url, {"name": "Updated"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertEqual(p.name, "Updated")

    def test_delete_product(self):
        p = Product.objects.create(name="Delete Me", description="Desc", base_price="25.00")
        url = reverse("product-detail", args=[p.id])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Product.objects.filter(id=p.id).exists())

    def test_list_with_search(self):
        Product.objects.create(name="Red Shoes", description="Desc", base_price="25.00")
        Product.objects.create(name="Blue Hat", description="Desc", base_price="15.00")
        url = reverse("product-list")
        response = self.client.get(url, {"search": "Red"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_list_with_is_active_filter(self):
        Product.objects.create(name="Active", description="Desc", base_price="10.00", is_active=True)
        Product.objects.create(name="Inactive", description="Desc", base_price="10.00")
        url = reverse("product-list")
        response = self.client.get(url, {"is_active": "true"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for r in response.data["results"]:
            self.assertTrue(r["is_active"])

    def test_list_with_price_filter(self):
        Product.objects.create(name="Cheap", description="Desc", base_price="5.00")
        Product.objects.create(name="Expensive", description="Desc", base_price="50.00")
        url = reverse("product-list")
        response = self.client.get(url, {"min_price": "10", "max_price": "100"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)


class ProductVariantAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(name="Variant Product", description="Desc", base_price="25.00")

    def test_add_variant(self):
        url = reverse("product-add-variant", args=[self.product.id])
        data = {"size": "M", "color": "Negro", "stock": 10}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["size"], "M")
        self.assertEqual(response.data["color"], "Negro")

    def test_add_variant_missing_size(self):
        url = reverse("product-add-variant", args=[self.product.id])
        data = {"color": "Negro", "stock": 10}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_variant_duplicate(self):
        Variant.objects.create(product=self.product, size="M", color="Negro", stock=5)
        url = reverse("product-add-variant", args=[self.product.id])
        data = {"size": "M", "color": "Negro", "stock": 3}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_variant_negative_stock(self):
        url = reverse("product-add-variant", args=[self.product.id])
        data = {"size": "M", "color": "Negro", "stock": -1}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ProductImageAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(name="Img Product", description="Desc", base_price="25.00")

    def test_add_image_cloudinary_url(self):
        url = reverse("product-add-image", args=[self.product.id])
        data = {"cloudinary_url": "https://cldn.com/img.png", "is_main": True}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["cloudinary_url"], "https://cldn.com/img.png")

    def test_add_image_no_source(self):
        url = reverse("product-add-image", args=[self.product.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_image(self):
        img = ProductImage.objects.create(product=self.product, cloudinary_url="https://cldn.com/img.png")
        url = reverse("product-manage-image", args=[self.product.id, img.id])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_update_image_order(self):
        img = ProductImage.objects.create(product=self.product, cloudinary_url="https://cldn.com/img.png")
        url = reverse("product-manage-image", args=[self.product.id, img.id])
        response = self.client.patch(url, {"order": 5}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class ProductPublishWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_publish_fails_without_image(self):
        p = Product.objects.create(name="Publish Fail", description="Desc", base_price="25.00")
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("product-publish", args=[p.id])
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publish_fails_without_variant(self):
        p = Product.objects.create(name="Publish Fail2", description="Desc", base_price="25.00")
        ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png", is_main=True)
        url = reverse("product-publish", args=[p.id])
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_publish_success(self):
        p = Product.objects.create(name="Publish Success", description="Desc", base_price="25.00")
        ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png", is_main=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("product-publish", args=[p.id])
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertTrue(p.is_active)
        self.assertTrue(p.is_approved)

    def test_publish_creates_audit(self):
        p = Product.objects.create(name="Publish Audit", description="Desc", base_price="25.00")
        ProductImage.objects.create(product=p, cloudinary_url="https://cldn.com/img.png", is_main=True)
        Variant.objects.create(product=p, size="M", color="Negro", stock=5)
        url = reverse("product-publish", args=[p.id])
        self.client.post(url, format="json")
        audits = ProductAudit.objects.filter(product=p, action=ProductAudit.ACTION_PUBLISHED)
        self.assertEqual(audits.count(), 1)

    def test_checklist_endpoint(self):
        p = Product.objects.create(name="Checklist EP", description="Desc", base_price="25.00")
        url = reverse("product-checklist", args=[p.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("ready_to_publish", response.data)

    def test_toggle_active(self):
        p = Product.objects.create(name="Toggle", description="Desc", base_price="25.00")
        url = reverse("product-toggle-active", args=[p.id])
        response = self.client.patch(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        p.refresh_from_db()
        self.assertTrue(p.is_active)


class ProductSearchAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.p1 = Product.objects.create(name="Camiseta Roja", description="Camiseta de algodon", base_price="25.00", is_active=True, is_approved=True)
        self.p2 = Product.objects.create(name="Gorra Azul", description="Gorra de beisbol", base_price="15.00", is_active=True, is_approved=True)
        Variant.objects.create(product=self.p1, size="M", color="Rojo", stock=10)
        Variant.objects.create(product=self.p2, size="L", color="Azul", stock=5)

    def test_search_by_name(self):
        url = reverse("product-search")
        response = self.client.get(url, {"search": "Camiseta"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_search_by_variant_size(self):
        url = reverse("product-search")
        response = self.client.get(url, {"search": "L"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_search_with_has_stock_filter(self):
        url = reverse("product-search")
        response = self.client.get(url, {"has_stock": "true"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 2)

    def test_search_with_is_active_filter(self):
        Product.objects.create(name="Inactive Product", description="Desc", base_price="10.00")
        url = reverse("product-search")
        response = self.client.get(url, {"is_active": "true"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for r in response.data["results"]:
            self.assertTrue(r["is_active"])

    def test_search_no_results(self):
        url = reverse("product-search")
        response = self.client.get(url, {"search": "zzzznonexistent"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 0)


class ProductAuditTests(TestCase):
    def test_create_audit(self):
        p = Product.objects.create(name="Audit", description="Desc", base_price="25.00")
        ProductAudit.objects.create(product=p, action=ProductAudit.ACTION_CREATED, actor="test")
        audits = ProductAudit.objects.filter(product=p)
        self.assertEqual(audits.count(), 1)

    def test_audit_str(self):
        p = Product.objects.create(name="Audit Str", description="Desc", base_price="25.00")
        a = ProductAudit.objects.create(product=p, action=ProductAudit.ACTION_CREATED, actor="test")
        self.assertIn("Audit Str", str(a))

    def test_audit_actions_choices(self):
        p = Product.objects.create(name="Audit Actions", description="Desc", base_price="25.00")
        for action in [ProductAudit.ACTION_CREATED, ProductAudit.ACTION_UPDATED, ProductAudit.ACTION_PUBLISHED]:
            ProductAudit.objects.create(product=p, action=action, actor="test")
        self.assertEqual(ProductAudit.objects.filter(product=p).count(), 3)

    def test_audit_ordering(self):
        p = Product.objects.create(name="Audit Order", description="Desc", base_price="25.00")
        a1 = ProductAudit.objects.create(product=p, action=ProductAudit.ACTION_CREATED, actor="test")
        a2 = ProductAudit.objects.create(product=p, action=ProductAudit.ACTION_UPDATED, actor="test")
        audits = ProductAudit.objects.filter(product=p)
        self.assertEqual(audits.first(), a2)

    def test_audits_endpoint(self):
        p = Product.objects.create(name="Audit EP", description="Desc", base_price="25.00")
        ProductAudit.objects.create(product=p, action=ProductAudit.ACTION_CREATED, actor="test")
        url = reverse("product-audits", args=[p.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)


class ProductAddToCartAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.product = Product.objects.create(name="Cart Product", description="Desc", base_price="25.00", is_active=True, is_approved=True)
        self.variant = Variant.objects.create(product=self.product, size="M", color="Negro", stock=10)

    def test_add_to_cart_anonymous(self):
        url = reverse("product-add-to-cart")
        data = {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 2}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("cart_items", response.data)

    def test_add_to_cart_exceeds_stock(self):
        url = reverse("product-add-to-cart")
        data = {"product_id": self.product.id, "variant_id": self.variant.id, "quantity": 99}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_to_cart_invalid_product(self):
        url = reverse("product-add-to-cart")
        data = {"product_id": 9999, "variant_id": 9999, "quantity": 1}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
