from __future__ import annotations

from rest_framework import serializers

from apps.carts.models import Cart, CartItem
from apps.products.models import Product, Variant


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.SerializerMethodField()
    variant_label = serializers.SerializerMethodField()
    variant_size = serializers.CharField(source='variant.size', read_only=True)
    variant_color = serializers.CharField(source='variant.color', read_only=True)
    variant_stock = serializers.IntegerField(source='variant.stock', read_only=True)
    variant_hex = serializers.CharField(source='variant.color_hex', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_name', 'product_image', 'variant', 'variant_label',
            'variant_size', 'variant_color', 'variant_stock', 'variant_hex',
            'quantity', 'unit_price', 'subtotal', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'product_name', 'product_image', 'variant_label', 'variant_size', 'variant_color', 'variant_stock', 'variant_hex', 'subtotal', 'created_at', 'updated_at']

    def get_product_image(self, obj):
        image = obj.product.main_image
        if not image:
            return None
        return image.image_url

    def get_variant_label(self, obj):
        return f'Talla {obj.variant.size} — {obj.variant.color}'

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


class AdminCartListSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    order_status = serializers.SerializerMethodField()
    order_status_display = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'session_key', 'user', 'user_name', 'items_count', 'total_amount', 'created_at', 'updated_at', 'order_id', 'order_status', 'order_status_display']

    def get_items_count(self, obj):
        return obj.items.count()

    def get_total_amount(self, obj):
        return str(obj.total_amount)

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.usuario} ({obj.user.correo})"
        return "Anónimo"

    def get_order_id(self, obj):
        return obj.order_id if obj.order_id else None

    def get_order_status(self, obj):
        if obj.order_id:
            return obj.order.status
        return 'pendiente'

    def get_order_status_display(self, obj):
        if obj.order_id:
            return obj.order.get_status_display()
        return 'Pendiente'


class AdminCartDetailSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_amount = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    order_id = serializers.SerializerMethodField()
    order_status = serializers.SerializerMethodField()
    order_status_display = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'session_key', 'user', 'user_name', 'items', 'total_items', 'total_amount', 'created_at', 'updated_at', 'order_id', 'order_status', 'order_status_display']

    def get_total_amount(self, obj):
        return str(obj.total_amount)

    def get_user_name(self, obj):
        if obj.user:
            return f"{obj.user.usuario} ({obj.user.correo})"
        return "Anónimo"

    def get_order_id(self, obj):
        return obj.order_id if obj.order_id else None

    def get_order_status(self, obj):
        if obj.order_id:
            return obj.order.status
        return 'pendiente'

    def get_order_status_display(self, obj):
        if obj.order_id:
            return obj.order.get_status_display()
        return 'Pendiente'


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


