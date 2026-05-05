from __future__ import annotations

from rest_framework import serializers

from apps.carts.models import Cart, CartItem
from apps.products.models import Product, Variant


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    variant_label = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_image', 'variant', 'variant_label',
            'quantity', 'unit_price', 'subtotal', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'product_name', 'product_image', 'variant_label', 'subtotal', 'created_at', 'updated_at']

    def get_product_image(self, obj):
        image = obj.product.main_image
        if not image:
            return None
        request = self.context.get('request')
        url = image.image.url
        return request.build_absolute_uri(url) if request else url

    def get_variant_label(self, obj):
        return f'{obj.variant.size} / {obj.variant.color}'

    def get_subtotal(self, obj):
        return str(obj.subtotal)


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'session_key', 'items', 'total_items', 'total_amount', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        return str(obj.total_amount)


class CartAddSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        try:
            product = Product.objects.get(pk=attrs['product_id'])
        except Product.DoesNotExist as exc:
            raise serializers.ValidationError({'product_id': 'Producto no encontrado.'}) from exc

        try:
            variant = Variant.objects.get(pk=attrs['variant_id'], product=product)
        except Variant.DoesNotExist as exc:
            raise serializers.ValidationError({'variant_id': 'Variante no válida para este producto.'}) from exc

        if not product.is_active or not product.is_approved:
            raise serializers.ValidationError({'product_id': 'El producto debe estar activo y aprobado para venderse.'})

        if variant.stock < attrs['quantity']:
            raise serializers.ValidationError({'quantity': 'La cantidad supera el stock disponible.'})

        attrs['product'] = product
        attrs['variant'] = variant
        return attrs


