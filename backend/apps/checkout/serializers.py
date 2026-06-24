from __future__ import annotations

import re

from django.core.validators import validate_email
from rest_framework import serializers

from apps.carts.models import CartItem
from apps.orders.models import Order


class ShippingSerializer(serializers.Serializer):
    shipping_name = serializers.CharField(max_length=150, required=True)
    shipping_email = serializers.EmailField(required=True)
    shipping_phone = serializers.CharField(max_length=20, required=True)
    shipping_address = serializers.CharField(required=True)
    shipping_city = serializers.CharField(max_length=100, required=True)
    shipping_zipcode = serializers.CharField(max_length=20, required=True)

    def validate_shipping_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El nombre completo es obligatorio.')
        if len(value) < 3:
            raise serializers.ValidationError('El nombre debe tener al menos 3 caracteres.')
        return value

    def validate_shipping_email(self, value):
        value = value.strip().lower()
        if not value:
            raise serializers.ValidationError('El correo electrónico es obligatorio.')
        try:
            validate_email(value)
        except Exception:
            raise serializers.ValidationError('El formato del correo electrónico no es válido.')
        domain = value.split('@')[1]
        if not re.match(
            r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$',
            domain,
        ):
            raise serializers.ValidationError('El dominio del correo electrónico no es válido.')
        return value

    def validate_shipping_phone(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El número de teléfono es obligatorio.')
        if not value.isdigit():
            raise serializers.ValidationError('El teléfono solo debe contener números.')
        if len(value) < 7:
            raise serializers.ValidationError('El teléfono debe tener al menos 7 dígitos.')
        if len(value) > 15:
            raise serializers.ValidationError('El teléfono no puede tener más de 15 dígitos.')
        return value

    def validate_shipping_address(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('La dirección es obligatoria.')
        if len(value) < 5:
            raise serializers.ValidationError('La dirección debe tener al menos 5 caracteres.')
        return value

    def validate_shipping_city(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('La ciudad es obligatoria.')
        return value

    def validate_shipping_zipcode(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('El código postal es obligatorio.')
        return value


class CheckoutSummaryItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    variant_label = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product_name', 'variant_label', 'quantity', 'unit_price', 'subtotal', 'product_image']

    def get_variant_label(self, obj):
        if obj.variant:
            return f'{obj.variant.size} / {obj.variant.color}'
        return ''

    def get_product_image(self, obj):
        main_image = obj.product.main_image
        if main_image:
            return main_image.image_url
        return None


class CheckoutItemSerializer(serializers.Serializer):
    product_name = serializers.CharField()
    variant_label = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    product_image = serializers.URLField(allow_null=True, allow_blank=True)


class PaymentInitSerializer(serializers.Serializer):
    order_id = serializers.IntegerField()


class PaymentStatusSerializer(serializers.Serializer):
    reference = serializers.CharField()
