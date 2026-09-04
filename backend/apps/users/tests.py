from __future__ import annotations

import json
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.carts.models import Cart, CartItem
from apps.products.models import Product, Variant

from .models import (
    Historial_Estado_Usuario,
    Log_Auditoria,
    Token_Verificacion,
    Usuario,
)


def _create_user(usuario="testuser", correo="test@example.com", contrasena="Test1234!", **kwargs):
    defaults = dict(usuario=usuario, correo=correo, contrasena=make_password(contrasena))
    defaults.update(kwargs)
    return Usuario.objects.create(**defaults)


def _create_admin(usuario="admin", correo="admin@example.com", contrasena="Admin1234!"):
    return _create_user(
        usuario=usuario, correo=correo, contrasena=contrasena,
        estado="Activo", rol="Administrador", email_verificado=True,
    )


def _get_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# â”€â”€â”€ Model Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class UsuarioModelTests(TestCase):
    def test_create_user_minimal_fields(self):
        u = Usuario.objects.create(
            usuario="juanperez", correo="juan@example.com",
            contrasena=make_password("securePass1!"),
        )
        self.assertEqual(u.usuario, "juanperez")
        self.assertEqual(u.correo, "juan@example.com")
        self.assertEqual(u.estado, "Inactivo")
        self.assertEqual(u.rol, "Usuario")
        self.assertFalse(u.email_verificado)
        self.assertEqual(u.intentos_fallidos, 0)
        self.assertFalse(u.eliminado)
        self.assertIsNone(u.fecha_ultima_sesion)

    def test_user_str(self):
        u = _create_user()
        self.assertEqual(str(u), "testuser (test@example.com)")

    def test_is_authenticated_property(self):
        u = _create_user()
        self.assertTrue(u.is_authenticated)

    def test_is_anonymous_property(self):
        u = _create_user()
        self.assertFalse(u.is_anonymous)

    def test_unique_username_raises_error(self):
        _create_user(usuario="uniqueuser")
        with self.assertRaises(Exception):
            _create_user(usuario="uniqueuser")

    def test_unique_email_raises_error(self):
        _create_user(correo="unique@example.com")
        with self.assertRaises(Exception):
            _create_user(correo="unique@example.com")

    def test_all_estado_choices_valid(self):
        for estado in ["Activo", "Inactivo", "Bloqueado"]:
            u = _create_user(usuario=f"user_{estado}", correo=f"{estado}@test.com", estado=estado)
            self.assertEqual(u.estado, estado)

    def test_invalid_estado_raises_error(self):
        with self.assertRaises(Exception):
            _create_user(usuario="badstate", correo="bad@test.com", estado="Unknown")

    def test_all_rol_choices_valid(self):
        for rol in ["Administrador", "Usuario"]:
            u = _create_user(usuario=f"rol_{rol}", correo=f"{rol}@test.com", rol=rol)
            self.assertEqual(u.rol, rol)

    def test_indexes_defined(self):
        indexes = [idx.fields for idx in Usuario._meta.indexes]
        self.assertIn(["usuario"], indexes)
        self.assertIn(["correo"], indexes)
        self.assertIn(["estado", "rol"], indexes)
        self.assertIn(["fecha_registro"], indexes)

    def test_soft_delete_defaults(self):
        u = _create_user()
        self.assertFalse(u.eliminado)
        self.assertIsNone(u.fecha_eliminacion)
        self.assertIsNone(u.admin_eliminador)

    def test_intentos_fallidos_default(self):
        u = _create_user()
        self.assertEqual(u.intentos_fallidos, 0)

    def test_fecha_bloqueo_desbloqueo_default_null(self):
        u = _create_user()
        self.assertIsNone(u.fecha_bloqueo)
        self.assertIsNone(u.fecha_desbloqueo)

    def test_admin_desbloqueador_self_relation(self):
        admin = _create_admin()
        u = _create_user(usuario="blocked", correo="blocked@test.com")
        u.admin_desbloqueador = admin
        u.save()
        u.refresh_from_db()
        self.assertEqual(u.admin_desbloqueador, admin)

    def test_admin_eliminador_self_relation(self):
        admin = _create_admin()
        u = _create_user(usuario="todelete", correo="todelete@test.com")
        u.admin_eliminador = admin
        u.eliminado = True
        u.save()
        u.refresh_from_db()
        self.assertEqual(u.admin_eliminador, admin)

    def test_fecha_registro_auto_now_add(self):
        before = timezone.now() - timedelta(seconds=5)
        u = _create_user()
        after = timezone.now() + timedelta(seconds=5)
        self.assertGreaterEqual(u.fecha_registro, before)
        self.assertLessEqual(u.fecha_registro, after)

    def test_fecha_ultima_sesion_update(self):
        u = _create_user()
        now = timezone.now()
        u.fecha_ultima_sesion = now
        u.save()
        u.refresh_from_db()
        self.assertEqual(u.fecha_ultima_sesion.replace(microsecond=0), now.replace(microsecond=0))


class TokenVerificacionModelTests(TestCase):
    def setUp(self):
        self.usuario = _create_user()

    def test_create_token(self):
        t = Token_Verificacion.objects.create(
            usuario=self.usuario,
            tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        self.assertEqual(t.usuario, self.usuario)
        self.assertEqual(t.tipo, "Verificacion_Email")
        self.assertFalse(t.usado)
        self.assertTrue(len(t.token) > 0)

    def test_token_default_unique(self):
        t1 = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        t2 = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Recuperacion_Password",
            fecha_expiracion=timezone.now() + timedelta(hours=1),
        )
        self.assertNotEqual(t1.token, t2.token)

    def test_token_str(self):
        t = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        self.assertIn("testuser", str(t))
        self.assertIn("Verificacion", str(t))

    def test_token_all_tipo_choices(self):
        for tipo, _ in Token_Verificacion.TIPO_CHOICES:
            t = Token_Verificacion.objects.create(
                usuario=self.usuario, tipo=tipo,
                fecha_expiracion=timezone.now() + timedelta(hours=24),
            )
            self.assertEqual(t.tipo, tipo)
            t.delete()

    def test_token_indexes(self):
        indexes = [idx.fields for idx in Token_Verificacion._meta.indexes]
        self.assertIn(["token"], indexes)
        self.assertIn(["usuario", "tipo"], indexes)
        self.assertIn(["fecha_expiracion"], indexes)

    def test_token_expiracion_in_past(self):
        t = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() - timedelta(hours=1),
        )
        self.assertTrue(timezone.now() > t.fecha_expiracion)

    def test_token_usado_flag(self):
        t = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        t.usado = True
        t.save()
        t.refresh_from_db()
        self.assertTrue(t.usado)

    def test_cascade_delete_with_user(self):
        t = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        uid = t.id
        self.usuario.delete()
        self.assertFalse(Token_Verificacion.objects.filter(id=uid).exists())


class HistorialEstadoUsuarioModelTests(TestCase):
    def setUp(self):
        self.admin = _create_admin()
        self.usuario = _create_user()

    def test_create_historial(self):
        h = Historial_Estado_Usuario.objects.create(
            usuario=self.usuario,
            estado_anterior="Inactivo",
            estado_nuevo="Activo",
            admin=self.admin,
        )
        self.assertEqual(h.estado_anterior, "Inactivo")
        self.assertEqual(h.estado_nuevo, "Activo")
        self.assertEqual(h.admin, self.admin)

    def test_historial_all_estado_choices(self):
        for estado in ["Activo", "Inactivo", "Bloqueado"]:
            h = Historial_Estado_Usuario.objects.create(
                usuario=self.usuario,
                estado_anterior="Inactivo",
                estado_nuevo=estado,
                admin=self.admin,
            )
            self.assertEqual(h.estado_nuevo, estado)

    def test_historial_motivo_null(self):
        h = Historial_Estado_Usuario.objects.create(
            usuario=self.usuario,
            estado_anterior="Inactivo",
            estado_nuevo="Activo",
            admin=self.admin,
        )
        self.assertIsNone(h.motivo)

    def test_historial_motivo_with_text(self):
        h = Historial_Estado_Usuario.objects.create(
            usuario=self.usuario,
            estado_anterior="Inactivo",
            estado_nuevo="Bloqueado",
            motivo="Actividad sospechosa",
            admin=self.admin,
        )
        self.assertEqual(h.motivo, "Actividad sospechosa")


class LogAuditoriaModelTests(TestCase):
    def setUp(self):
        self.admin = _create_admin()
        self.usuario = _create_user()

    def test_create_log(self):
        log = Log_Auditoria.objects.create(
            usuario_admin=self.admin,
            usuario_afectado=self.usuario,
            accion="Crear usuario",
            datos_nuevos={"rol": "Usuario"},
        )
        self.assertEqual(log.accion, "Crear usuario")
        self.assertEqual(log.usuario_admin, self.admin)
        self.assertEqual(log.usuario_afectado, self.usuario)

    def test_log_json_fields(self):
        log = Log_Auditoria.objects.create(
            usuario_admin=self.admin,
            accion="Editar usuario",
            datos_anteriores={"estado": "Inactivo"},
            datos_nuevos={"estado": "Activo"},
        )
        self.assertEqual(log.datos_anteriores, {"estado": "Inactivo"})
        self.assertEqual(log.datos_nuevos, {"estado": "Activo"})

    def test_log_str(self):
        log = Log_Auditoria.objects.create(
            usuario_admin=self.admin, accion="Desbloquear cuenta",
        )
        self.assertIn("Desbloquear cuenta", str(log))

    def test_log_ip_admin(self):
        log = Log_Auditoria.objects.create(
            usuario_admin=self.admin, accion="Login",
            ip_admin="192.168.1.1",
        )
        self.assertEqual(log.ip_admin, "192.168.1.1")

    def test_log_admin_afectado_null_allowed(self):
        log = Log_Auditoria.objects.create(
            usuario_admin=self.admin, accion="AcciÃ³n sin afectado",
        )
        self.assertIsNone(log.usuario_afectado)


# â”€â”€â”€ Serializer Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class RegistroSerializerTests(TestCase):
    def test_valid_registration_data(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "newuser",
            "correo": "newuser@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_password_mismatch(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "newuser",
            "correo": "newuser@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "DifferentPass1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_username_too_short(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "ab",
            "correo": "newuser@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_password_no_uppercase(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "newuser",
            "correo": "newuser@example.com",
            "contrasena": "validpass1!",
            "confirmar_contrasena": "validpass1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_password_no_number(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "newuser",
            "correo": "newuser@example.com",
            "contrasena": "ValidPass!",
            "confirmar_contrasena": "ValidPass!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_password_no_special_char(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "newuser",
            "correo": "newuser@example.com",
            "contrasena": "ValidPass1",
            "confirmar_contrasena": "ValidPass1",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_password_too_short(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "newuser",
            "correo": "newuser@example.com",
            "contrasena": "Short1!",
            "confirmar_contrasena": "Short1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_empty_fields(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "",
            "correo": "",
            "contrasena": "",
            "confirmar_contrasena": "",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_duplicate_username(self):
        from .api.serializers import RegistroSerializer
        _create_user(usuario="existinguser")
        data = {
            "usuario": "existinguser",
            "correo": "other@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_duplicate_email(self):
        from .api.serializers import RegistroSerializer
        _create_user(correo="existing@example.com")
        data = {
            "usuario": "newuser",
            "correo": "existing@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_invalid_email_format(self):
        from .api.serializers import RegistroSerializer
        data = {
            "usuario": "newuser",
            "correo": "not-an-email",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        serializer = RegistroSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class LoginSerializerTests(TestCase):
    def setUp(self):
        self.usuario = _create_user(
            usuario="logintest", correo="login@test.com",
            contrasena="ValidPass1!",
            estado="Activo", email_verificado=True,
        )

    def test_valid_login(self):
        from .api.serializers import LoginSerializer
        data = {"correo": "login@test.com", "contrasena": "ValidPass1!"}
        serializer = LoginSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertIn("usuario", serializer.validated_data)

    def test_invalid_password(self):
        from .api.serializers import LoginSerializer
        data = {"correo": "login@test.com", "contrasena": "WrongPass1!"}
        serializer = LoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_nonexistent_email(self):
        from .api.serializers import LoginSerializer
        data = {"correo": "nonexistent@test.com", "contrasena": "ValidPass1!"}
        serializer = LoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_blocked_user_cannot_login(self):
        from .api.serializers import LoginSerializer
        _create_user(
            usuario="blockeduser", correo="blocked@test.com",
            contrasena="ValidPass1!",
            estado="Bloqueado", email_verificado=True,
        )
        data = {"correo": "blocked@test.com", "contrasena": "ValidPass1!"}
        serializer = LoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())

    def test_inactive_user_cannot_login(self):
        from .api.serializers import LoginSerializer
        _create_user(
            usuario="inactiveuser", correo="inactive@test.com",
            contrasena="ValidPass1!",
            estado="Inactivo", email_verificado=False,
        )
        data = {"correo": "inactive@test.com", "contrasena": "ValidPass1!"}
        serializer = LoginSerializer(data=data)
        self.assertFalse(serializer.is_valid())


# â”€â”€â”€ API Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class RegistroAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("auth-registro")

    def test_registration_success(self):
        data = {
            "usuario": "newuser",
            "correo": "newuser@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("mensaje", response.data)
        self.assertIn("usuario", response.data)
        self.assertTrue(Usuario.objects.filter(usuario="newuser").exists())
        user = Usuario.objects.get(usuario="newuser")
        self.assertEqual(user.estado, "Inactivo")
        self.assertFalse(user.email_verificado)

    def test_registration_invalid_data(self):
        data = {"usuario": "", "correo": "bad", "contrasena": "s", "confirmar_contrasena": "d"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_duplicate_username(self):
        _create_user(usuario="existinguser")
        data = {
            "usuario": "existinguser",
            "correo": "other@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_registration_creates_verification_token(self):
        data = {
            "usuario": "verifyuser",
            "correo": "verify@example.com",
            "contrasena": "ValidPass1!",
            "confirmar_contrasena": "ValidPass1!",
        }
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = Usuario.objects.get(usuario="verifyuser")
        tokens = Token_Verificacion.objects.filter(usuario=user, tipo="Verificacion_Email")
        self.assertEqual(tokens.count(), 1)


class VerificacionEmailAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("auth-verificar-email")

    def test_verify_email_success(self):
        user = _create_user(usuario="verifyuser", correo="verify@test.com", estado="Inactivo")
        token = Token_Verificacion.objects.create(
            usuario=user, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        response = self.client.post(self.url, {"token": token.token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.email_verificado)
        self.assertEqual(user.estado, "Activo")
        token.refresh_from_db()
        self.assertTrue(token.usado)

    def test_verify_email_invalid_token(self):
        response = self.client.post(self.url, {"token": "invalidtoken123"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_email_expired_token(self):
        user = _create_user()
        token = Token_Verificacion.objects.create(
            usuario=user, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() - timedelta(hours=1),
        )
        response = self.client.post(self.url, {"token": token.token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_email_already_used_token(self):
        user = _create_user()
        token = Token_Verificacion.objects.create(
            usuario=user, tipo="Verificacion_Email",
            fecha_expiracion=timezone.now() + timedelta(hours=24),
            usado=True,
        )
        response = self.client.post(self.url, {"token": token.token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ReenvioVerificacionAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("auth-reenviar-verificacion")

    @patch("apps.users.api.viewset.RegistroViewSet._send_email", return_value=True)
    def test_reenvio_success(self, mock_send):
        user = _create_user(usuario="resenduser", correo="resend@test.com", email_verificado=False)
        response = self.client.post(self.url, {"correo": "resend@test.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(mock_send.call_count, 1)

    def test_reenvio_nonexistent_user(self):
        response = self.client.post(self.url, {"correo": "noone@test.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reenvio_already_verified(self):
        _create_user(usuario="verifieduser", correo="verified@test.com", email_verificado=True)
        response = self.client.post(self.url, {"correo": "verified@test.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reenvio_exceeds_limit(self):
        user = _create_user(usuario="spammer", correo="spam@test.com", email_verificado=False)
        for _ in range(3):
            Token_Verificacion.objects.create(
                usuario=user, tipo="Verificacion_Email",
                fecha_expiracion=timezone.now() + timedelta(hours=23),
                fecha_creacion=timezone.now() - timedelta(hours=1),
            )
        response = self.client.post(self.url, {"correo": "spam@test.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("login-login")
        self.usuario = _create_user(
            usuario="logintest", correo="loginapi@test.com",
            contrasena="ValidPass1!",
            estado="Activo", email_verificado=True,
        )

    def test_login_success(self):
        response = self.client.post(self.url, {
            "correo": "loginapi@test.com", "contrasena": "ValidPass1!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("usuario", response.data)

    def test_login_wrong_password(self):
        response = self.client.post(self.url, {
            "correo": "loginapi@test.com", "contrasena": "WrongPass1!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_increments_intentos_fallidos(self):
        for _ in range(3):
            self.client.post(self.url, {
                "correo": "loginapi@test.com", "contrasena": "WrongPass1!",
            }, format="json")
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.intentos_fallidos, 3)

    def test_login_blocks_after_5_failures(self):
        for _ in range(5):
            self.client.post(self.url, {
                "correo": "loginapi@test.com", "contrasena": "WrongPass1!",
            }, format="json")
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.estado, "Bloqueado")

    def test_login_merges_anonymous_cart(self):
        session_cart = Cart.objects.create(session_key="test-session-key")
        product = Product.objects.create(name="Test Product", description="Test", base_price="25000.00", is_active=True, is_approved=True)
        v1 = Variant.objects.create(product=product, size="M", color="Negro", stock=10)
        v2 = Variant.objects.create(product=product, size="L", color="Blanco", stock=5)
        CartItem.objects.create(
            cart=session_cart, product=product, variant=v1, quantity=2, unit_price="25.00",
        )

        session = self.client.session
        session.save()
        session_key = session.session_key
        Cart.objects.filter(session_key=session_key).delete()
        c = Cart.objects.create(session_key=session_key)
        CartItem.objects.create(
            cart=c, product=product, variant=v2, quantity=1, unit_price="25.00",
        )

        response = self.client.post(self.url, {
            "correo": "loginapi@test.com", "contrasena": "ValidPass1!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_success(self):
        tokens = _get_tokens(self.usuario)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("login-logout")
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class UsuarioViewSetTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario = _create_user(
            usuario="perfiluser", correo="perfil@test.com",
            contrasena="ValidPass1!",
            estado="Activo", email_verificado=True,
        )
        tokens = _get_tokens(self.usuario)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_get_perfil(self):
        url = reverse("usuario-perfil")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["usuario"], "perfiluser")

    def test_cambiar_password_success(self):
        url = reverse("usuario-cambiar-password")
        data = {
            "contrasena_actual": "ValidPass1!",
            "contrasena_nueva": "NewValid1!",
            "confirmar_contrasena": "NewValid1!",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.usuario.refresh_from_db()
        self.assertTrue(check_password("NewValid1!", self.usuario.contrasena))

    def test_cambiar_password_wrong_current(self):
        url = reverse("usuario-cambiar-password")
        data = {
            "contrasena_actual": "WrongPass1!",
            "contrasena_nueva": "NewValid1!",
            "confirmar_contrasena": "NewValid1!",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cambiar_password_mismatch(self):
        url = reverse("usuario-cambiar-password")
        data = {
            "contrasena_actual": "ValidPass1!",
            "contrasena_nueva": "NewValid1!",
            "confirmar_contrasena": "Different1!",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_actualizar_perfil(self):
        url = reverse("usuario-actualizar-perfil")
        response = self.client.patch(url, {"usuario": "updateduser"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.usuario, "updateduser")

    def test_unauthenticated_access_returns_401(self):
        client = APIClient()
        url = reverse("usuario-perfil")
        response = client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class RecuperacionPasswordAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario = _create_user(
            usuario="resetuser", correo="reset@test.com", estado="Activo",
        )

    @patch("apps.users.api.viewset.RegistroViewSet._send_email", return_value=True)
    def test_recuperar_password_success(self, mock_send):
        url = reverse("auth-recuperar-password")
        response = self.client.post(url, {"correo": "reset@test.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_recuperar_password_nonexistent(self):
        url = reverse("auth-recuperar-password")
        response = self.client.post(url, {"correo": "noone@test.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nueva_password_success(self):
        token = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Recuperacion_Password",
            fecha_expiracion=timezone.now() + timedelta(hours=1),
        )
        url = reverse("auth-nueva-password")
        data = {
            "token": token.token,
            "contrasena": "NewValid1!",
            "confirmar_contrasena": "NewValid1!",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.usuario.refresh_from_db()
        self.assertTrue(check_password("NewValid1!", self.usuario.contrasena))
        self.assertEqual(self.usuario.intentos_fallidos, 0)

    def test_nueva_password_expired_token(self):
        token = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Recuperacion_Password",
            fecha_expiracion=timezone.now() - timedelta(hours=1),
        )
        url = reverse("auth-nueva-password")
        data = {
            "token": token.token,
            "contrasena": "NewValid1!",
            "confirmar_contrasena": "NewValid1!",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nueva_password_invalid_token(self):
        url = reverse("auth-nueva-password")
        data = {
            "token": "invalidtoken",
            "contrasena": "NewValid1!",
            "confirmar_contrasena": "NewValid1!",
        }
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nueva_password_resets_intentos_fallidos(self):
        self.usuario.intentos_fallidos = 3
        self.usuario.save()
        token = Token_Verificacion.objects.create(
            usuario=self.usuario, tipo="Recuperacion_Password",
            fecha_expiracion=timezone.now() + timedelta(hours=1),
        )
        url = reverse("auth-nueva-password")
        data = {
            "token": token.token,
            "contrasena": "NewValid1!",
            "confirmar_contrasena": "NewValid1!",
        }
        self.client.post(url, data, format="json")
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.intentos_fallidos, 0)


# â”€â”€â”€ Admin API Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


class AdminPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_admin_access_allowed(self):
        admin = _create_admin()
        tokens = _get_tokens(admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("admin-usuario-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_access_admin(self):
        user = _create_user(
            usuario="regular", correo="regular@test.com",
            estado="Activo", email_verificado=True,
        )
        tokens = _get_tokens(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("admin-usuario-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_access_admin(self):
        url = reverse("admin-usuario-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_admin_cannot_access_admin(self):
        admin = _create_admin(usuario="inactiveadmin", correo="inactive@admin.com")
        admin.estado = "Inactivo"
        admin.save()
        tokens = _get_tokens(admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("admin-usuario-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminUserCRUDTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _create_admin()
        tokens = _get_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        self.list_url = reverse("admin-usuario-list")

    def test_admin_list_users(self):
        _create_user(usuario="user1", correo="user1@test.com")
        _create_user(usuario="user2", correo="user2@test.com")
        response = self.client.get(self.list_url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 2)

    def test_admin_list_with_estado_filter(self):
        _create_user(usuario="activeuser", correo="active@test.com", estado="Activo")
        _create_user(usuario="blockeduser", correo="blocked@test.com", estado="Bloqueado")
        response = self.client.get(self.list_url, {"estado": "Bloqueado"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for u in response.data["results"]:
            self.assertEqual(u["estado"], "Bloqueado")

    def test_admin_list_with_search(self):
        _create_user(usuario="samantha", correo="sam@test.com")
        response = self.client.get(self.list_url, {"search": "samantha"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_admin_create_user(self):
        data = {
            "usuario": "createdbyadmin",
            "correo": "createdbyadmin@test.com",
            "rol": "Usuario",
            "estado": "Activo",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Usuario.objects.filter(usuario="createdbyadmin").exists())

    def test_admin_create_user_missing_fields(self):
        response = self.client.post(self.list_url, {"usuario": "nofields"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_create_user_duplicate_username(self):
        _create_user(usuario="existing")
        data = {
            "usuario": "existing",
            "correo": "new@test.com",
            "rol": "Usuario",
            "estado": "Activo",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.users.api.admin_viewset.AdminUsuarioViewSet._enviar_email_bienvenida")
    def test_admin_create_user_sends_email(self, mock_email):
        data = {
            "usuario": "emaileduser",
            "correo": "emailed@test.com",
            "rol": "Usuario",
            "estado": "Activo",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mock_email.assert_called_once()

    def test_admin_update_user(self):
        user = _create_user(usuario="updatable", correo="updatable@test.com")
        detail_url = reverse("admin-usuario-detail", args=[user.id])
        response = self.client.patch(detail_url, {"usuario": "updatedname"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.usuario, "updatedname")

    def test_admin_update_self_role_protected(self):
        detail_url = reverse("admin-usuario-detail", args=[self.admin.id])
        response = self.client.patch(detail_url, {"rol": "Usuario"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_update_self_estado_protected(self):
        detail_url = reverse("admin-usuario-detail", args=[self.admin.id])
        response = self.client.patch(detail_url, {"estado": "Inactivo"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_last_admin_role_protected(self):
        detail_url = reverse("admin-usuario-detail", args=[self.admin.id])
        response = self.client.patch(detail_url, {"rol": "Usuario"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_change_status(self):
        user = _create_user(usuario="statustest", correo="status@test.com", estado="Inactivo")
        url = reverse("admin-usuario-cambiar-estado", args=[user.id])
        response = self.client.post(url, {"estado": "Activo"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.estado, "Activo")

    def test_admin_change_status_invalid(self):
        user = _create_user(usuario="badstatus", correo="badstatus@test.com")
        url = reverse("admin-usuario-cambiar-estado", args=[user.id])
        response = self.client.post(url, {"estado": "Unknown"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_change_last_admin_status_protected(self):
        url = reverse("admin-usuario-cambiar-estado", args=[self.admin.id])
        response = self.client.post(url, {"estado": "Inactivo"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_desbloquear_user(self):
        user = _create_user(usuario="lockeduser", correo="locked@test.com", estado="Bloqueado")
        url = reverse("admin-usuario-desbloquear", args=[user.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual(user.estado, "Activo")
        self.assertEqual(user.intentos_fallidos, 0)
        self.assertIsNone(user.fecha_bloqueo)

    def test_admin_desbloquear_not_blocked(self):
        user = _create_user(usuario="activeuser2", correo="active2@test.com", estado="Activo")
        url = reverse("admin-usuario-desbloquear", args=[user.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_soft_delete_user(self):
        user = _create_user(usuario="deletable", correo="deletable@test.com")
        url = reverse("admin-usuario-eliminar-logicamente", args=[user.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.eliminado)
        self.assertIsNotNone(user.fecha_eliminacion)

    def test_admin_soft_delete_last_admin_protected(self):
        url = reverse("admin-usuario-eliminar-logicamente", args=[self.admin.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_reset_password(self):
        user = _create_user(usuario="resetme", correo="resetme@test.com", contrasena="OldPass1!")
        url = reverse("admin-usuario-resetear-password", args=[user.id])
        response = self.client.post(url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_create_user_with_password(self):
        data = {
            "usuario": "withpass",
            "correo": "withpass@test.com",
            "rol": "Usuario",
            "estado": "Activo",
            "password": "CustomPass1!",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_admin_create_user_invalid_email(self):
        data = {
            "usuario": "bademail",
            "correo": "not-an-email",
            "rol": "Usuario",
            "estado": "Activo",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_create_user_weak_password(self):
        data = {
            "usuario": "weakpass",
            "correo": "weak@test.com",
            "rol": "Usuario",
            "estado": "Activo",
            "password": "short",
        }
        response = self.client.post(self.list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_auditoria_endpoint(self):
        url = reverse("admin-usuario-auditoria")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_suggest_endpoint(self):
        _create_user(usuario="suggestme", correo="suggest@test.com")
        url = reverse("admin-usuario-suggest")
        response = self.client.get(url, {"q": "sug"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_admin_suggest_short_query(self):
        url = reverse("admin-usuario-suggest")
        response = self.client.get(url, {"q": "ab"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_estado_transition_creates_historial(self):
        user = _create_user(usuario="transitiontest", correo="transition@test.com", estado="Inactivo")
        url = reverse("admin-usuario-cambiar-estado", args=[user.id])
        self.client.post(url, {"estado": "Activo", "motivo": "ActivaciÃ³n manual"}, format="json")
        historial = Historial_Estado_Usuario.objects.filter(usuario=user)
        self.assertEqual(historial.count(), 1)
        self.assertEqual(historial.first().estado_nuevo, "Activo")

    def test_admin_log_auditoria_created(self):
        user = _create_user(usuario="audited", correo="audited@test.com")
        detail_url = reverse("admin-usuario-detail", args=[user.id])
        self.client.patch(detail_url, {"usuario": "audited_updated"}, format="json")
        logs = Log_Auditoria.objects.filter(usuario_afectado=user)
        self.assertGreaterEqual(logs.count(), 1)


class JWTTokenTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.usuario = _create_user(
            usuario="jwttest", correo="jwt@test.com",
            contrasena="ValidPass1!",
            estado="Activo", email_verificado=True,
        )

    def test_token_obtain_pair(self):
        url = reverse("token_obtain_pair")
        response = self.client.post(url, {
            "usuario": "jwttest", "password": "ValidPass1!",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_token_refresh(self):
        tokens = _get_tokens(self.usuario)
        url = reverse("token_refresh")
        response = self.client.post(url, {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_token_invalid_refresh(self):
        url = reverse("token_refresh")
        response = self.client.post(url, {"refresh": "invalidtoken"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_protected_endpoint(self):
        tokens = _get_tokens(self.usuario)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        url = reverse("usuario-perfil")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_expired_token_returns_401(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalidtoken")
        url = reverse("usuario-perfil")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdminStatsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = _create_admin()
        tokens = _get_tokens(self.admin)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

    def test_stats_endpoint(self):
        url = reverse("admin-stats-list")
        response = self.client.get(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("usuarios", response.data)
        self.assertIn("productos", response.data)
        self.assertIn("ordenes", response.data)


class UsuarioJWTAuthenticationTests(TestCase):
    def test_custom_auth_backend_uses_usuario_model(self):
        from apps.users.api.auth_backend import UsuarioJWTAuthentication
        auth = UsuarioJWTAuthentication()
        self.assertIsNotNone(auth)
