from rest_framework import serializers

from apps.orders.models import Order


class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = (
            'id',
            'customer_name',
            'customer_email',
            'status',
            'total',
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
