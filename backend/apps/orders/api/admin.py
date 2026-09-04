from rest_framework import viewsets, permissions, serializers
from rest_framework.pagination import PageNumberPagination
from django.conf import settings

from apps.orders.models import Order, OrderItem
from apps.users.api.admin_viewset import AdminPermission


class AdminOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField(read_only=True)

    def get_product_image(self, obj):
        main = obj.product.main_image
        return main.image.url if main and main.image else None
    variant_size = serializers.CharField(source='variant.size', read_only=True)
    variant_color = serializers.CharField(source='variant.color', read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product_name', 'product_image', 'variant_size', 'variant_color',
            'quantity', 'unit_price',
        ]


class AdminOrderSerializer(serializers.ModelSerializer):
    items = AdminOrderItemSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.usuario', read_only=True, default=None)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'user_name', 'customer_name', 'customer_email',
            'status', 'total', 'notes', 'created_at', 'updated_at', 'items',
        ]


class AdminOrderPagination(PageNumberPagination):
    page_size = settings.REST_FRAMEWORK.get('PAGE_SIZE', 20)
    page_size_query_param = 'page_size'
    max_page_size = 100


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Order.objects.all().prefetch_related(
        'items__product', 'items__variant'
    ).select_related('user')
    serializer_class = AdminOrderSerializer
    permission_classes = [AdminPermission]
    pagination_class = AdminOrderPagination
    filterset_fields = ['status']
    search_fields = ['customer_name', 'customer_email', 'id']
    ordering_fields = ['created_at', 'total', 'status']
    ordering = ['-created_at']
