from __future__ import annotations

from django.core.exceptions import ValidationError
from unittest.mock import patch

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.models3d.api.cloudinary_views import CloudinaryResourceAPIView
from apps.models3d.models import Model3D, Model3DImage
from apps.users.models import Usuario

NS = "models3d:"


def _create_user():
    return Usuario.objects.create(
        usuario="models3duser", correo="models3d@test.com",
        contrasena="dummy", estado="Activo", email_verificado=True,
    )


def _create_admin():
    return Usuario.objects.create(
        usuario="models3dadmin", correo="models3dadm@test.com",
        contrasena="dummy", estado="Activo", rol="Administrador", email_verificado=True,
    )


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# ÔöÇÔöÇÔöÇ Model Tests ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ


class Model3DModelTests(TestCase):
    def test_create_model3d(self):
        m = Model3D.objects.create(
            name="Test Model",
            description="A 3D model",
            cloudinary_url="https://res.cloudinary.com/test/model.glb",
            file_type="glb",
        )
        self.assertEqual(m.name, "Test Model")
        self.assertEqual(m.cloudinary_url, "https://res.cloudinary.com/test/model.glb")
        self.assertEqual(m.file_type, "glb")
        self.assertTrue(m.is_active)
        self.assertFalse(m.is_approved)

    def test_model3d_str(self):
        m = Model3D.objects.create(
            name="My Model",
            cloudinary_url="https://res.cloudinary.com/test/model2.glb",
        )
        self.assertEqual(str(m), "My Model")

    def test_model3d_unique_name(self):
        Model3D.objects.create(name="Unique", cloudinary_url="https://cldn.com/m1.glb")
        with self.assertRaises(Exception):
            Model3D.objects.create(name="Unique", cloudinary_url="https://cldn.com/m2.glb")

    def test_model3d_empty_name_validation(self):
        m = Model3D(name="", cloudinary_url="https://cldn.com/m.glb")
        with self.assertRaises(ValidationError):
            m.full_clean()

    def test_model3d_long_name_validation(self):
        m = Model3D(name="A" * 256, cloudinary_url="https://cldn.com/m.glb")
        with self.assertRaises(ValidationError):
            m.full_clean()

    def test_model3d_missing_url_validation(self):
        m = Model3D(name="No URL")
        with self.assertRaises(ValidationError):
            m.full_clean()

    def test_model3d_ordering(self):
        m1 = Model3D.objects.create(name="First", cloudinary_url="https://cldn.com/m1.glb")
        m2 = Model3D.objects.create(name="Second", cloudinary_url="https://cldn.com/m2.glb")
        qs = Model3D.objects.all()
        self.assertEqual(qs.first(), m2)

    def test_model3d_file_type_default(self):
        m = Model3D.objects.create(name="Default Type", cloudinary_url="https://cldn.com/m.glb")
        self.assertEqual(m.file_type, "glb")

    def test_model3d_file_size_null(self):
        m = Model3D.objects.create(name="Null Size", cloudinary_url="https://cldn.com/m.glb")
        self.assertIsNone(m.file_size)

    def test_model3d_cloudinary_public_id_null(self):
        m = Model3D.objects.create(name="Null Public ID", cloudinary_url="https://cldn.com/m.glb")
        self.assertIsNone(m.cloudinary_public_id)

    def test_model3d_all_file_type_choices(self):
        for ft, _ in Model3D._meta.get_field("file_type").choices:
            m = Model3D.objects.create(name=f"Type {ft}", cloudinary_url=f"https://cldn.com/m.{ft}", file_type=ft)
            self.assertEqual(m.file_type, ft)
            m.delete()


class Model3DImageModelTests(TestCase):
    def setUp(self):
        self.model3d = Model3D.objects.create(
            name="Parent Model",
            cloudinary_url="https://res.cloudinary.com/test/parent.glb",
        )

    def test_create_preview_image(self):
        img = Model3DImage.objects.create(
            model_3d=self.model3d,
            cloudinary_url="https://res.cloudinary.com/test/preview.png",
            order=1,
        )
        self.assertEqual(img.cloudinary_url, "https://res.cloudinary.com/test/preview.png")
        self.assertEqual(img.model_3d, self.model3d)

    def test_preview_image_str(self):
        img = Model3DImage.objects.create(
            model_3d=self.model3d,
            cloudinary_url="https://cldn.com/preview.png",
        )
        self.assertIn("Parent Model", str(img))
        self.assertIn("preview", str(img))

    def test_preview_image_defaults(self):
        img = Model3DImage.objects.create(
            model_3d=self.model3d,
            cloudinary_url="https://cldn.com/preview.png",
        )
        self.assertFalse(img.is_main)
        self.assertEqual(img.order, 1)

    def test_preview_image_unique_order_constraint(self):
        Model3DImage.objects.create(model_3d=self.model3d, cloudinary_url="https://cldn.com/p1.png", order=1)
        with self.assertRaises(Exception):
            Model3DImage.objects.create(model_3d=self.model3d, cloudinary_url="https://cldn.com/p2.png", order=1)

    def test_cascade_delete_with_model3d(self):
        img = Model3DImage.objects.create(
            model_3d=self.model3d, cloudinary_url="https://cldn.com/p1.png",
        )
        img_id = img.id
        self.model3d.delete()
        self.assertFalse(Model3DImage.objects.filter(id=img_id).exists())


# ÔöÇÔöÇÔöÇ API Tests ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ


class Model3DAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_list_models(self):
        Model3D.objects.create(name="API Model", cloudinary_url="https://cldn.com/api.glb")
        url = reverse(NS + "model3d-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_create_model(self):
        url = reverse(NS + "model3d-list")
        data = {
            "name": "Created via API",
            "cloudinary_url": "https://cldn.com/created.glb",
            "file_type": "glb",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Created via API")

    def test_create_model_missing_name(self):
        url = reverse(NS + "model3d-list")
        data = {"cloudinary_url": "https://cldn.com/no-name.glb"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_model_missing_url(self):
        url = reverse(NS + "model3d-list")
        data = {"name": "No URL"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_retrieve_model(self):
        m = Model3D.objects.create(name="Retrievable", cloudinary_url="https://cldn.com/ret.glb")
        url = reverse(NS + "model3d-detail", args=[m.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["name"], "Retrievable")

    def test_retrieve_nonexistent(self):
        url = reverse(NS + "model3d-detail", args=[9999])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_model(self):
        user = _create_user()
        tokens = _get_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        m = Model3D.objects.create(name="Updatable", cloudinary_url="https://cldn.com/upd.glb")
        url = reverse(NS + "model3d-detail", args=[m.id])
        response = self.client.patch(url, {"description": "Updated desc"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        m.refresh_from_db()
        self.assertEqual(m.description, "Updated desc")

    def test_delete_model_requires_auth(self):
        m = Model3D.objects.create(name="Deletable", cloudinary_url="https://cldn.com/del.glb")
        url = reverse(NS + "model3d-detail", args=[m.id])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_model_authenticated(self):
        user = _create_user()
        tokens = _get_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        m = Model3D.objects.create(name="Auth Delete", cloudinary_url="https://cldn.com/auth-del.glb")
        url = reverse(NS + "model3d-detail", args=[m.id])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_active_endpoint(self):
        Model3D.objects.create(name="Active1", cloudinary_url="https://cldn.com/a1.glb", is_active=True)
        Model3D.objects.create(name="Inactive1", cloudinary_url="https://cldn.com/i1.glb", is_active=False)
        url = reverse(NS + "model3d-active")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for m in response.data:
            self.assertTrue(m["is_active"])

    def test_approved_endpoint(self):
        Model3D.objects.create(name="Approved1", cloudinary_url="https://cldn.com/ap1.glb", is_approved=True, is_active=True)
        Model3D.objects.create(name="NotApproved", cloudinary_url="https://cldn.com/na.glb", is_approved=False, is_active=True)
        url = reverse(NS + "model3d-approved")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for m in response.data:
            self.assertTrue(m["is_approved"])
            self.assertTrue(m["is_active"])


class Model3DImageAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.model = Model3D.objects.create(name="Img Test", cloudinary_url="https://cldn.com/img-test.glb")
        self.user = Usuario.objects.create(
            usuario="models3duser", correo="m3d@test.com",
            contrasena="dummy", estado="Activo", email_verificado=True,
        )

    def test_list_preview_images(self):
        Model3DImage.objects.create(model_3d=self.model, cloudinary_url="https://cldn.com/preview.png")
        url = reverse(NS + "model3d-preview-images", args=[self.model.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_add_preview_image(self):
        self.client.force_authenticate(user=self.user)
        url = reverse(NS + "model3d-add-preview-image", args=[self.model.id])
        data = {"cloudinary_url": "https://cldn.com/new-preview.png"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["cloudinary_url"], "https://cldn.com/new-preview.png")

    def test_add_preview_image_invalid(self):
        self.client.force_authenticate(user=self.user)
        url = reverse(NS + "model3d-add-preview-image", args=[self.model.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CloudinaryResourceAPIViewTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = Usuario.objects.create(
            usuario='admin',
            correo='admin@example.com',
            contrasena='hashed-password',
            estado='Activo',
            rol='Administrador',
        )

    @patch('apps.models3d.api.cloudinary_views.list_resources')
    def test_includes_total_count_for_pagination(self, mock_list_resources):
        mock_list_resources.return_value = {
            'resources': [
                {'public_id': 'a', 'resource_type': 'image', 'bytes': 1024},
                {'public_id': 'b', 'resource_type': 'image', 'bytes': 2048},
            ],
            'next_cursor': 'cursor-2',
            'total_count': 25,
            'error': None,
        }

        request = self.factory.get('/api/models3d/cloudinary/?resource_type=image&per_page=2')
        force_authenticate(request, user=self.admin)

        response = CloudinaryResourceAPIView.as_view()(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_count'], 25)
        self.assertTrue(response.data['has_next'])
        self.assertEqual(response.data['next_cursor'], 'cursor-2')
