import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.api.admin_viewset import AdminPermission
from apps.models3d.cloudinary_service import RESOURCE_TYPES, list_resources, delete_resources

logger = logging.getLogger(__name__)


class CloudinaryResourceAPIView(APIView):
    """Lista todos los recursos de Cloudinary (imágenes, raw, video) en tiempo real."""
    permission_classes = [AdminPermission]

    def get(self, request):
        resource_type = request.query_params.get('resource_type') or 'image'
        if resource_type not in {'image', 'raw', 'video'}:
            resource_type = 'image'

        try:
            per_page = int(request.query_params.get('per_page') or '12')
            per_page = max(1, min(per_page, 50))
        except (TypeError, ValueError):
            per_page = 12

        prefix = (request.query_params.get('q') or '').strip()
        next_cursor = request.query_params.get('next_cursor') or ''

        payload = list_resources(
            resource_type=resource_type,
            per_page=per_page,
            next_cursor=next_cursor,
            prefix=prefix,
        )
        data = {
            'resources': payload['resources'],
            'resource_type': resource_type,
            'per_page': per_page,
            'q': prefix,
            'total_count': payload.get('total_count', 0),
            'has_next': bool(payload['next_cursor']),
            'next_cursor': payload['next_cursor'],
            'resource_types': RESOURCE_TYPES,
        }
        if payload['error']:
            data['error'] = payload['error']
        return Response(data)


class CloudinaryDeleteAPIView(APIView):
    """Elimina recursos de Cloudinary (individual o masivo)."""
    permission_classes = [AdminPermission]

    def post(self, request):
        resource_type = request.data.get('resource_type') or 'image'
        if resource_type not in {'image', 'raw', 'video'}:
            resource_type = 'image'

        public_ids = request.data.get('public_ids') or request.data.get('public_id')
        if not public_ids:
            return Response({'deleted': [], 'error': 'Se requiere public_ids'}, status=400)

        if isinstance(public_ids, str):
            public_ids = [public_ids]
        elif not isinstance(public_ids, list):
            return Response({'deleted': [], 'error': 'public_ids debe ser una lista'}, status=400)

        public_ids = [pid for pid in public_ids if pid]
        if not public_ids:
            return Response({'deleted': [], 'error': 'public_ids está vacío'}, status=400)

        deleted, error = delete_resources(public_ids, resource_type)
        return Response({'deleted': sorted(deleted), 'error': error})