"""
Pruebas unitarias para la app users.
Cubre: registro, login, verificación de email, JWT, y gestión de usuarios.
"""
from django.test import TestCase, Client
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from datetime import timedelta
import json

from apps.users.models import Usuario, Token_Verificacion, Log_Auditoria


class UsuarioModelTests(TestCase):
    """Tests para el modelo Usuario."""

    def setUp(self):
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
            estado='Activo',
            rol='Usuario',
            email_verificado=True,
        )

    def test_creacion_usuario(self):
        self.assertEqual(self.usuario.usuario, 'testuser')
        self.assertEqual(self.usuario.correo, 'test@example.com')
        self.assertEqual(self.usuario.estado, 'Activo')
        self.assertTrue(self.usuario.email_verificado)

    def test_str_usuario(self):
        self.assertEqual(str(self.usuario), 'testuser (test@example.com)')

    def test_is_authenticated_property(self):
        self.assertTrue(self.usuario.is_authenticated)

    def test_is_anonymous_property(self):
        self.assertFalse(self.usuario.is_anonymous)

    def test_estado_default_inactivo(self):
        u = Usuario.objects.create(
            usuario='nuevo',
            correo='nuevo@test.com',
            contrasena=make_password('Pass1!Test'),
        )
        self.assertEqual(u.estado, 'Inactivo')
        self.assertFalse(u.email_verificado)

    def test_soft_delete(self):
        self.usuario.eliminado = True
        self.usuario.fecha_eliminacion = timezone.now()
        self.usuario.save()
        self.assertTrue(Usuario.objects.get(id=self.usuario.id).eliminado)

    def test_intentos_fallidos_default(self):
        u = Usuario.objects.create(
            usuario='intentos',
            correo='intentos@test.com',
            contrasena=make_password('Pass1!Test'),
        )
        self.assertEqual(u.intentos_fallidos, 0)

    def test_rol_default_usuario(self):
        u = Usuario.objects.create(
            usuario='roltest',
            correo='rol@test.com',
            contrasena=make_password('Pass1!Test'),
        )
        self.assertEqual(u.rol, 'Usuario')


class TokenVerificacionTests(TestCase):
    """Tests para el modelo Token_Verificacion."""

    def setUp(self):
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
        )

    def test_creacion_token_verificacion(self):
        token = Token_Verificacion.objects.create(
            usuario=self.usuario,
            tipo='Verificacion_Email',
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        self.assertIsNotNone(token.token)
        self.assertFalse(token.usado)

    def test_str_token(self):
        token = Token_Verificacion.objects.create(
            usuario=self.usuario,
            tipo='Verificacion_Email',
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )
        token_str = str(token)
        # Verificar que contiene el nombre de usuario y el tipo
        self.assertIn('testuser', token_str)
        self.assertIn('Verificacion_Email', token_str)

    def test_token_tipos_validos(self):
        for tipo in ['Verificacion_Email', 'Recuperacion_Password']:
            token = Token_Verificacion.objects.create(
                usuario=self.usuario,
                tipo=tipo,
                fecha_expiracion=timezone.now() + timedelta(hours=1),
            )
            self.assertEqual(token.tipo, tipo)


class RegistroEndpointTests(TestCase):
    """Tests para el endpoint de registro."""

    def setUp(self):
        self.client = Client()
        self.url = '/api/auth/registro/'
        self.datos_validos = {
            'usuario': 'nuevouser',
            'correo': 'nuevo@test.com',
            'contrasena': 'Segura1!Pass',
            'confirmar_contrasena': 'Segura1!Pass',
        }

    def test_registro_exitoso(self):
        response = self.client.post(
            self.url,
            data=json.dumps(self.datos_validos),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Usuario.objects.filter(correo='nuevo@test.com').exists())

    def test_registro_usuario_duplicado(self):
        Usuario.objects.create(
            usuario='nuevouser',
            correo='otro@test.com',
            contrasena=make_password('Segura1!Pass'),
        )
        response = self.client.post(
            self.url,
            data=json.dumps(self.datos_validos),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_registro_contrasena_debil(self):
        datos = self.datos_validos.copy()
        datos['contrasena'] = '123'
        datos['confirmar_contrasena'] = '123'
        response = self.client.post(
            self.url,
            data=json.dumps(datos),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_registro_contrasenas_no_coinciden(self):
        datos = self.datos_validos.copy()
        datos['confirmar_contrasena'] = 'Diferente1!'
        response = self.client.post(
            self.url,
            data=json.dumps(datos),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_registro_crea_usuario_inactivo(self):
        self.client.post(
            self.url,
            data=json.dumps(self.datos_validos),
            content_type='application/json',
        )
        usuario = Usuario.objects.get(correo='nuevo@test.com')
        self.assertEqual(usuario.estado, 'Inactivo')
        self.assertFalse(usuario.email_verificado)

    def test_registro_genera_token_verificacion(self):
        self.client.post(
            self.url,
            data=json.dumps(self.datos_validos),
            content_type='application/json',
        )
        usuario = Usuario.objects.get(correo='nuevo@test.com')
        token = Token_Verificacion.objects.filter(
            usuario=usuario,
            tipo='Verificacion_Email',
        ).first()
        self.assertIsNotNone(token)
        self.assertFalse(token.usado)


class LoginEndpointTests(TestCase):
    """Tests para el endpoint de login."""

    def setUp(self):
        self.client = Client()
        self.url = '/api/login/login/'
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
            estado='Activo',
            email_verificado=True,
        )

    def test_login_exitoso(self):
        response = self.client.post(
            self.url,
            data=json.dumps({
                'correo': 'test@example.com',
                'contrasena': 'TestPass1!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('access', data)
        self.assertIn('refresh', data)

    def test_login_password_incorrecta(self):
        response = self.client.post(
            self.url,
            data=json.dumps({
                'correo': 'test@example.com',
                'contrasena': 'WrongPass1!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_login_usuario_inactivo(self):
        self.usuario.estado = 'Inactivo'
        self.usuario.save()
        response = self.client.post(
            self.url,
            data=json.dumps({
                'correo': 'test@example.com',
                'contrasena': 'TestPass1!',
            }),
            content_type='application/json',
        )
        # El viewset retorna 401 para credenciales inválidas (incluye inactivo)
        self.assertIn(response.status_code, [400, 401])

    def test_login_usuario_bloqueado(self):
        self.usuario.estado = 'Bloqueado'
        self.usuario.save()
        response = self.client.post(
            self.url,
            data=json.dumps({
                'correo': 'test@example.com',
                'contrasena': 'TestPass1!',
            }),
            content_type='application/json',
        )
        # El viewset retorna 401 para credenciales inválidas (incluye bloqueado)
        self.assertIn(response.status_code, [400, 401])

    def test_login_email_inexistente(self):
        response = self.client.post(
            self.url,
            data=json.dumps({
                'correo': 'noexiste@test.com',
                'contrasena': 'TestPass1!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_login_bloqueo_tras_5_intentos(self):
        for _ in range(5):
            self.client.post(
                self.url,
                data=json.dumps({
                    'correo': 'test@example.com',
                    'contrasena': 'WrongPass1!',
                }),
                content_type='application/json',
            )
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.estado, 'Bloqueado')
        self.assertEqual(self.usuario.intentos_fallidos, 5)


class VerificacionEmailTests(TestCase):
    """Tests para verificación de email."""

    def setUp(self):
        self.client = Client()
        self.url = '/api/auth/verificar_email/'
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
            estado='Inactivo',
            email_verificado=False,
        )
        self.token = Token_Verificacion.objects.create(
            usuario=self.usuario,
            tipo='Verificacion_Email',
            fecha_expiracion=timezone.now() + timedelta(hours=24),
        )

    def test_verificar_email_exitoso(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'token': self.token.token}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(self.usuario.email_verificado)
        self.assertEqual(self.usuario.estado, 'Activo')

    def test_verificar_email_token_expirado(self):
        self.token.fecha_expiracion = timezone.now() - timedelta(hours=1)
        self.token.save()
        response = self.client.post(
            self.url,
            data=json.dumps({'token': self.token.token}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_verificar_email_token_usado(self):
        self.token.usado = True
        self.token.save()
        response = self.client.post(
            self.url,
            data=json.dumps({'token': self.token.token}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_verificar_email_token_invalido(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'token': 'token_inexistente'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


class PasswordTests(TestCase):
    """Tests para recuperación y cambio de contraseña."""

    def setUp(self):
        self.client = Client()
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
            estado='Activo',
            email_verificado=True,
        )

    def test_recuperar_password_crea_token(self):
        response = self.client.post(
            '/api/auth/recuperar_password/',
            data=json.dumps({'correo': 'test@example.com'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            Token_Verificacion.objects.filter(
                usuario=self.usuario,
                tipo='Recuperacion_Password',
            ).exists()
        )

    def test_nueva_password_exitoso(self):
        token = Token_Verificacion.objects.create(
            usuario=self.usuario,
            tipo='Recuperacion_Password',
            fecha_expiracion=timezone.now() + timedelta(hours=1),
        )
        response = self.client.post(
            '/api/auth/nueva_password/',
            data=json.dumps({
                'token': token.token,
                'contrasena': 'NuevaPass1!',
                'confirmar_contrasena': 'NuevaPass1!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(check_password('NuevaPass1!', self.usuario.contrasena))

    def test_nueva_password_contrasena_debil(self):
        token = Token_Verificacion.objects.create(
            usuario=self.usuario,
            tipo='Recuperacion_Password',
            fecha_expiracion=timezone.now() + timedelta(hours=1),
        )
        response = self.client.post(
            '/api/auth/nueva_password/',
            data=json.dumps({
                'token': token.token,
                'contrasena': '123',
                'confirmar_contrasena': '123',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)

    def test_nueva_password_no_coinciden(self):
        token = Token_Verificacion.objects.create(
            usuario=self.usuario,
            tipo='Recuperacion_Password',
            fecha_expiracion=timezone.now() + timedelta(hours=1),
        )
        response = self.client.post(
            '/api/auth/nueva_password/',
            data=json.dumps({
                'token': token.token,
                'contrasena': 'NuevaPass1!',
                'confirmar_contrasena': 'OtraPass1!',
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)


class PerfilTests(TestCase):
    """Tests para endpoints de perfil de usuario."""

    def setUp(self):
        self.client = Client()
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@example.com',
            contrasena=make_password('TestPass1!'),
            estado='Activo',
            email_verificado=True,
        )
        # Simular login obteniendo token
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.usuario)
        self.access_token = str(refresh.access_token)
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {self.access_token}'}

    def test_obtener_perfil(self):
        response = self.client.get(
            '/api/usuarios/perfil/',
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['correo'], 'test@example.com')

    def test_perfil_requiere_autenticacion(self):
        response = self.client.get('/api/usuarios/perfil/')
        self.assertEqual(response.status_code, 401)

    def test_actualizar_perfil(self):
        response = self.client.patch(
            '/api/usuarios/actualizar_perfil/',
            data=json.dumps({'usuario': 'newname'}),
            content_type='application/json',
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertEqual(self.usuario.usuario, 'newname')

    def test_cambiar_password(self):
        response = self.client.post(
            '/api/usuarios/cambiar_password/',
            data=json.dumps({
                'contrasena_actual': 'TestPass1!',
                'contrasena_nueva': 'NewPass2!',
                'confirmar_contrasena': 'NewPass2!',
            }),
            content_type='application/json',
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
        self.usuario.refresh_from_db()
        self.assertTrue(check_password('NewPass2!', self.usuario.contrasena))

    def test_cambiar_password_actual_incorrecta(self):
        response = self.client.post(
            '/api/usuarios/cambiar_password/',
            data=json.dumps({
                'contrasena_actual': 'WrongPass!',
                'contrasena_nueva': 'NewPass2!',
                'confirmar_contrasena': 'NewPass2!',
            }),
            content_type='application/json',
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 400)


class TokenBlacklistTests(TestCase):
    """Tests para invalidación de tokens al bloquear/desactivar usuario.
    
    LIMITACIÓN IMPORTANTE:
    SimpleJWT no soporta revocación de access tokens en caliente.
    Cuando un admin bloquea a un usuario:
    - Sus refresh tokens se agregan a la blacklist (no puede obtener nuevos access tokens)
    - Sus access tokens ya emitidos siguen válidos hasta expirar (15 min)
    - Solo después de 15 minutos el usuario pierde completamente el acceso
    """

    def setUp(self):
        self.client = Client()
        
        # Crear admin
        self.admin = Usuario.objects.create(
            usuario='admin',
            correo='admin@test.com',
            contrasena=make_password('Admin1!Pass'),
            estado='Activo',
            rol='Administrador',
            email_verificado=True,
        )
        
        # Crear usuario regular
        self.usuario = Usuario.objects.create(
            usuario='testuser',
            correo='test@test.com',
            contrasena=make_password('TestPass1!'),
            estado='Activo',
            rol='Usuario',
            email_verificado=True,
        )
        
        # Login del admin para obtener tokens
        from rest_framework_simplejwt.tokens import RefreshToken
        admin_refresh = RefreshToken.for_user(self.admin)
        self.admin_access = str(admin_refresh.access_token)
        self.admin_headers = {'HTTP_AUTHORIZATION': f'Bearer {self.admin_access}'}
        
        # Login del usuario regular para obtener tokens
        user_refresh = RefreshToken.for_user(self.usuario)
        self.user_refresh_token = str(user_refresh)
        self.user_access_token = str(user_refresh.access_token)

    def test_usuario_bloqueado_no_puede_refrescar_token(self):
        """Un usuario bloqueado no puede usar su refresh token para obtener
        un nuevo access token."""
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        
        # Verificar que el usuario tiene un outstanding token
        outstanding = OutstandingToken.objects.filter(user=self.usuario)
        self.assertTrue(outstanding.exists())
        
        # Bloquear al usuario
        response = self.client.post(
            f'/api/admin/usuarios/{self.usuario.id}/cambiar_estado/',
            data=json.dumps({
                'estado': 'Bloqueado',
                'motivo': 'Prueba de blacklist',
            }),
            content_type='application/json',
            **self.admin_headers,
        )
        self.assertEqual(response.status_code, 200)
        
        # Intentar refrescar el token del usuario bloqueado
        response = self.client.post(
            '/api/token/refresh/',
            data=json.dumps({'refresh': self.user_refresh_token}),
            content_type='application/json',
        )
        # Debe fallar porque el refresh token está en la blacklist
        self.assertEqual(response.status_code, 401)

    def test_usuario_desactivado_no_puede_refrescar_token(self):
        """Un usuario desactivado no puede usar su refresh token."""
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        
        # Desactivar al usuario
        response = self.client.post(
            f'/api/admin/usuarios/{self.usuario.id}/cambiar_estado/',
            data=json.dumps({
                'estado': 'Inactivo',
                'motivo': 'Desactivación voluntaria',
            }),
            content_type='application/json',
            **self.admin_headers,
        )
        self.assertEqual(response.status_code, 200)
        
        # Intentar refrescar el token
        response = self.client.post(
            '/api/token/refresh/',
            data=json.dumps({'refresh': self.user_refresh_token}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 401)

    def test_access_token_invalidado_tras_bloqueo(self):
        """El access token se invalida inmediatamente al bloquear al usuario.
        
        auth_backend.py verifica el estado del usuario en cada request.
        Si el usuario está Inactivo o Bloqueado, se rechaza con 401.
        """
        # Bloquear al usuario
        self.client.post(
            f'/api/admin/usuarios/{self.usuario.id}/cambiar_estado/',
            data=json.dumps({
                'estado': 'Bloqueado',
                'motivo': 'Prueba',
            }),
            content_type='application/json',
            **self.admin_headers,
        )
        
        # El access token ya NO es válido después del bloqueo (verificación de estado en auth_backend)
        response = self.client.get(
            '/api/usuarios/perfil/',
            HTTP_AUTHORIZATION=f'Bearer {self.user_access_token}',
        )
        self.assertEqual(response.status_code, 401)

    def test_blacklist_tokens_previos_al_bloqueo(self):
        """Todos los outstanding tokens del usuario se blacklistean al bloquear."""
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
        
        # El usuario tiene tokens outstanding del setUp
        outstanding_antes = OutstandingToken.objects.filter(user=self.usuario).count()
        self.assertGreater(outstanding_antes, 0)
        
        # Bloquear
        self.client.post(
            f'/api/admin/usuarios/{self.usuario.id}/cambiar_estado/',
            data=json.dumps({
                'estado': 'Bloqueado',
                'motivo': 'Blacklist test',
            }),
            content_type='application/json',
            **self.admin_headers,
        )
        
        # Todos los outstanding tokens deben estar en la blacklist
        blacklisted = BlacklistedToken.objects.filter(
            token__user=self.usuario
        ).count()
        self.assertEqual(blacklisted, outstanding_antes)

    def test_usuario_bloqueado_no_puede_hacer_login(self):
        """Un usuario bloqueado no puede hacer login (validación en serializer)."""
        # Bloquear al usuario primero
        self.client.post(
            f'/api/admin/usuarios/{self.usuario.id}/cambiar_estado/',
            data=json.dumps({'estado': 'Bloqueado', 'motivo': 'test'}),
            content_type='application/json',
            **self.admin_headers,
        )
        
        response = self.client.post(
            '/api/login/login/',
            data=json.dumps({
                'correo': 'test@test.com',
                'contrasena': 'TestPass1!',
            }),
            content_type='application/json',
        )
        # El viewset retorna 401 para credenciales inválidas (incluye bloqueado)
        self.assertIn(response.status_code, [400, 401])
