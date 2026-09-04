from __future__ import annotations

from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.landing.models import Contacto
from apps.users.models import Usuario


def _create_admin():
    return Usuario.objects.create(
        usuario="landingadmin", correo="landingadmin@test.com",
        contrasena="dummy", estado="Activo", rol="Administrador", email_verificado=True,
    )


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# ─── Model Tests ────────────────────────────────────────────────────────────


class ContactoModelTests(TestCase):
    def test_create_contacto(self):
        c = Contacto.objects.create(
            nombre="Juan Perez",
            correo="juan@example.com",
            asunto="Consulta",
            mensaje="Hola, quiero información sobre sus productos.",
        )
        self.assertEqual(c.nombre, "Juan Perez")
        self.assertEqual(c.correo, "juan@example.com")
        self.assertEqual(c.asunto, "Consulta")
        self.assertFalse(c.leido)

    def test_contacto_str_with_subject(self):
        c = Contacto.objects.create(
            nombre="Maria", correo="maria@test.com",
            asunto="Cotización", mensaje="Mensaje de prueba",
        )
        self.assertIn("Maria", str(c))
        self.assertIn("Cotización", str(c))

    def test_contacto_str_without_subject(self):
        c = Contacto.objects.create(
            nombre="Pedro", correo="pedro@test.com",
            mensaje="Mensaje sin asunto",
        )
        self.assertIn("Sin asunto", str(c))

    def test_contacto_defaults(self):
        c = Contacto.objects.create(
            nombre="Ana", correo="ana@test.com", mensaje="Test mensaje",
        )
        self.assertFalse(c.leido)
        self.assertIsNone(c.asunto)
        self.assertIsNone(c.fecha_lectura)
        self.assertIsNone(c.ip_origen)

    def test_contacto_mark_as_read(self):
        c = Contacto.objects.create(
            nombre="Luis", correo="luis@test.com", mensaje="Mensaje",
        )
        from django.utils import timezone
        c.leido = True
        c.fecha_lectura = timezone.now()
        c.save()
        c.refresh_from_db()
        self.assertTrue(c.leido)
        self.assertIsNotNone(c.fecha_lectura)

    def test_contacto_indexes(self):
        indexes = [idx.fields for idx in Contacto._meta.indexes]
        self.assertIn(["correo"], indexes)
        self.assertIn(["fecha_envio"], indexes)
        self.assertIn(["leido"], indexes)


# ─── API Tests ──────────────────────────────────────────────────────────────


class ContactoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Deshabilitar rate limiting para pruebas
        self.throttle_patch = patch("apps.landing.api.viewset.ContactRateThrottle.rate", "100/h")
        self.throttle_patch.start()

    def tearDown(self):
        self.throttle_patch.stop()

    @patch("apps.landing.api.viewset.ContactoViewSet._enviar_email_admin")
    def test_contact_form_submission_success(self, mock_email):
        url = reverse("contacto-list")
        data = {
            "nombre": "Carlos Lopez",
            "correo": "carlos@example.com",
            "asunto": "Consulta general",
            "mensaje": "Este es un mensaje de prueba para verificar el formulario de contacto.",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("mensaje", response.data)
        self.assertIn("id", response.data)
        self.assertTrue(Contacto.objects.filter(correo="carlos@example.com").exists())
        mock_email.assert_called_once()

    def test_contact_form_short_name(self):
        url = reverse("contacto-list")
        data = {
            "nombre": "A",
            "correo": "a@test.com",
            "mensaje": "Un mensaje de prueba lo suficientemente largo.",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contact_form_short_message(self):
        url = reverse("contacto-list")
        data = {
            "nombre": "Test User",
            "correo": "test@test.com",
            "mensaje": "Corto",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contact_form_missing_email(self):
        url = reverse("contacto-list")
        data = {
            "nombre": "Test User",
            "mensaje": "Un mensaje lo suficientemente largo para pasar la validacion.",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contact_form_empty_data(self):
        url = reverse("contacto-list")
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_contact_form_invalid_email(self):
        url = reverse("contacto-list")
        data = {
            "nombre": "Test User",
            "correo": "not-an-email",
            "mensaje": "Un mensaje lo suficientemente largo para la validacion.",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.landing.api.viewset.ContactoViewSet._enviar_email_admin")
    def test_contact_form_stores_ip(self, mock_email):
        url = reverse("contacto-list")
        data = {
            "nombre": "IP Test",
            "correo": "ip@test.com",
            "mensaje": "Mensaje para verificar almacenamiento de IP.",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contacto = Contacto.objects.get(correo="ip@test.com")
        self.assertIsNotNone(contacto.ip_origen)


class ContactoAdminAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _create_admin()
        tokens = _get_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_admin_list_contactos(self):
        Contacto.objects.create(nombre="Test1", correo="t1@test.com", mensaje="Msg 1")
        Contacto.objects.create(nombre="Test2", correo="t2@test.com", mensaje="Msg 2")
        url = reverse("contacto-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_admin_retrieve_contacto(self):
        c = Contacto.objects.create(nombre="Detail", correo="detail@test.com", mensaje="Detail msg")
        url = reverse("contacto-detail", args=[c.id])
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["nombre"], "Detail")

    def test_admin_mark_as_read(self):
        c = Contacto.objects.create(nombre="Read Test", correo="read@test.com", mensaje="Read me")
        url = reverse("contacto-marcar-leido", args=[c.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        c.refresh_from_db()
        self.assertTrue(c.leido)
        self.assertIsNotNone(c.fecha_lectura)

    def test_admin_delete_contacto(self):
        c = Contacto.objects.create(nombre="Delete", correo="del@test.com", mensaje="Delete me")
        url = reverse("contacto-eliminar", args=[c.id])
        response = self.client.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Contacto.objects.filter(id=c.id).exists())

    def test_regular_user_cannot_list(self):
        client2 = APIClient()
        user = Usuario.objects.create(usuario="regular", correo="regular@test.com", contrasena="dummy")
        tokens = _get_tokens(user)
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("contacto-list")
        response = client2.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"], [])

    def test_regular_user_cannot_mark_as_read(self):
        client2 = APIClient()
        user = Usuario.objects.create(usuario="regular2", correo="regular2@test.com", contrasena="dummy")
        tokens = _get_tokens(user)
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        c = Contacto.objects.create(nombre="Regular", correo="reg@test.com", mensaje="Test")
        url = reverse("contacto-marcar-leido", args=[c.id])
        response = client2.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_delete(self):
        client2 = APIClient()
        user = Usuario.objects.create(usuario="regular3", correo="regular3@test.com", contrasena="dummy")
        tokens = _get_tokens(user)
        client2.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        c = Contacto.objects.create(nombre="Regular Del", correo="regdel@test.com", mensaje="Test")
        url = reverse("contacto-eliminar", args=[c.id])
        response = client2.delete(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ContactoRateLimitTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.throttle_patch = patch("apps.landing.api.viewset.ContactRateThrottle.rate", "100/h")
        self.throttle_patch.start()

    def tearDown(self):
        self.throttle_patch.stop()

    @patch("apps.landing.api.viewset.ContactoViewSet._enviar_email_admin")
    def test_rate_limit_not_exceeded(self, mock_email):
        url = reverse("contacto-list")
        data = {
            "nombre": "Rate Test",
            "correo": "rate@test.com",
            "mensaje": "Mensaje para probar rate limiting en el formulario de contacto.",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
