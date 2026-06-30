from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.orders.models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for order CRUD — accepts camelCase payload from frontend and maps to snake_case."""
    queryset = Order.objects.select_related('user').prefetch_related('items__product', 'items__variant').all()
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        """Create a new order, mapping camelCase frontend fields to snake_case."""
        # Map camelCase payload (from frontend) to snake_case expected by serializer
        data = request.data.copy()
        if 'imageUrl' in data and 'image_url' not in data:
            data['image_url'] = data.get('imageUrl')
        if 'cloudinaryPublicId' in data and 'cloudinary_public_id' not in data:
            data['cloudinary_public_id'] = data.get('cloudinaryPublicId')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
