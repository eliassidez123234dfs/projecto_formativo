from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.orders.models import Order
from .serializers import OrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet for order CRUD — requires authentication and scopes to current user."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related('user').prefetch_related('items__product', 'items__variant').all()

    def create(self, request, *args, **kwargs):
        """Create a new order, mapping camelCase frontend fields to snake_case."""
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
