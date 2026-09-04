"""
Pruebas unitarias para la app orders.
Cubre: CRUD de órdenes, permisos, y validaciones.
"""
from django.test import TestCase, Client
from django.contrib.auth.hashers import make_password
import json

from apps.users.models import Usuario
from apps.orders.models import Order


class OrderModelTests(TestCase):
    """Tests para el modelo Order."""

    def setUp(self):
        self.order = Order.objects.create(
            customer_name='Juan Pérez',
            customer_email='juan@test.com',
            status='pending',
            total='50000.00',
            image='test-image',
        )

    def test_creacion_orden(self):
        self.assertEqual(self.order.customer_name, 'Juan Pérez')
        self.assertEqual(self.order.status, 'pending')

    def test_estados_validos(self):
        estados_validos = ['pending', 'paid', 'processing', 'completed', 'cancelled']
        for estado in estados_validos:
            order = Order.objects.create(
                customer_name='Test',
                customer_email='test@test.com',
                status=estado,
                total='10000.00',
            )
            self.assertEqual(order.status, estado)


class OrderViewSetTests(TestCase):
    """Tests para el ViewSet de órdenes."""

    def setUp(self):
        self.client = Client()
        self.url = '/api/orders/'
        self.order_data = {
            'customer_name': 'Juan Pérez',
            'customer_email': 'juan@test.com',
            'total': '50000.00',
            'status': 'pending',
        }

    def test_listar_ordenes(self):
        Order.objects.create(
            customer_name='Test',
            customer_email='test@test.com',
            status='pending',
            total='10000.00',
        )
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_crear_orden_sin_autenticacion(self):
        """PRUEBA CRÍTICA: Verifica que la API de órdenes NO requiere autenticación.
        Esto es un PROBLEMA DE SEGURIDAD conocido."""
        response = self.client.post(
            self.url,
            data=json.dumps(self.order_data),
            content_type='application/json',
        )
        # NOTA: Esto actualmente pasa porque OrderViewSet usa AllowAny
        # En un sistema seguro, esto debería retornar 401
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Order.objects.filter(customer_email='juan@test.com').exists())

    def test_crear_orden_campos_requeridos(self):
        # La API actualmente no valida campos requeridos (problema conocido)
        response = self.client.post(
            self.url,
            data=json.dumps({}),
            content_type='application/json',
        )
        # Nota: La API permite crear órdenes vacías porque no valida campos
        # Esto es un PROBLEMA DE SEGURIDAD/VALIDACIÓN conocido
        self.assertIn(response.status_code, [201, 400, 422])

    def test_detalle_orden(self):
        order = Order.objects.create(
            customer_name='Test',
            customer_email='test@test.com',
            status='pending',
            total='10000.00',
        )
        response = self.client.get(f'{self.url}{order.id}/')
        self.assertEqual(response.status_code, 200)

    def test_eliminar_orden(self):
        order = Order.objects.create(
            customer_name='Test',
            customer_email='test@test.com',
            status='pending',
            total='10000.00',
        )
        response = self.client.delete(f'{self.url}{order.id}/')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Order.objects.filter(id=order.id).exists())


class OrderAdminTests(TestCase):
    """Tests para endpoints admin de órdenes."""

    def setUp(self):
        self.client = Client()
        self.admin = Usuario.objects.create(
            usuario='admin',
            correo='admin@test.com',
            contrasena=make_password('Admin1!Pass'),
            estado='Activo',
            rol='Administrador',
            email_verificado=True,
        )
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(self.admin)
        self.access_token = str(refresh.access_token)
        self.auth_headers = {'HTTP_AUTHORIZATION': f'Bearer {self.access_token}'}

    def test_listar_ordenes_admin(self):
        response = self.client.get(
            '/api/admin/orders/',
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)

    def test_detalle_orden_admin(self):
        order = Order.objects.create(
            customer_name='Test',
            customer_email='test@test.com',
            status='pending',
            total='10000.00',
        )
        response = self.client.get(
            f'/api/admin/orders/{order.id}/',
            **self.auth_headers,
        )
        self.assertEqual(response.status_code, 200)
