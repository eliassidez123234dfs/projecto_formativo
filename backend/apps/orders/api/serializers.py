from rest_framework import serializers

from apps.orders.models import Order, OrderItem


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = (
            'id',
            'order_number',
            'customer_name',
            'customer_email',
            'status',
            'total',
            'shipping_name',
            'shipping_email',
            'shipping_phone',
            'shipping_address',
            'shipping_city',
            'shipping_zipcode',
            'payment_transaction_id',
            'payment_reference',
            'payment_wompi_status',
            'payment_confirmed_at',
            'payment_rejection_reason',
            'image',
            'image_url',
            'cloudinary_public_id',
            'design_color',
            'logo_texture',
            'full_texture',
            'logo_scale',
            'notes',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class AdminOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    variant_label = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'variant_label', 'quantity', 'unit_price', 'subtotal']

    def get_variant_label(self, obj):
        return f'Talla {obj.variant.size} — {obj.variant.color}'

    def get_subtotal(self, obj):
        return str(obj.subtotal)


class AdminOrderSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'customer_email',
            'status', 'status_display', 'total', 'created_at',
        ]


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    items = AdminOrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'customer_email',
            'status', 'status_display', 'total', 'created_at',
            'shipping_name', 'shipping_email', 'shipping_phone',
            'shipping_address', 'shipping_city', 'shipping_zipcode',
            'payment_transaction_id', 'payment_reference',
            'payment_wompi_status', 'payment_confirmed_at',
            'payment_rejection_reason', 'items',
        ]
