from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.models3d.api.cloudinary_views import CloudinaryResourceAPIView
from apps.users.models import Usuario


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
