"""
Serializers del módulo de Checkout.

Define la serialización y validación de datos para el proceso de checkout:
  - ShippingSerializer: validación completa de datos de envío (Colombia).
  - CheckoutSummaryItemSerializer: ítems del carrito para resumen de checkout.
  - PaymentInitSerializer/PaymentStatusSerializer: datos de pago Wompi.

Patrón de diseño: Serializer de validación (no se vincula a un modelo).
Valida reglas de negocio del envío: nombre, email, teléfono, dirección.
"""
from __future__ import annotations

import re

from django.core.validators import validate_email
from rest_framework import serializers

from apps.carts.models import CartItem
from apps.orders.models import Order


# ═══════════════════════════════════════════════════════════════════════
# ShippingSerializer — Validación de datos de envío
# ═══════════════════════════════════════════════════════════════════════
class ShippingSerializer(serializers.Serializer):
    """Valida los datos de envío del cliente para el checkout.
    
    Campos validados:
      - shipping_name: nombre completo (mín. 3 caracteres).
      - shipping_email: correo válido con dominio verificado.
      - shipping_phone: solo números, 7-15 dígitos.
      - shipping_address: dirección (mín. 5 caracteres).
      - shipping_city: ciudad obligatoria.
      - shipping_zipcode: código postal obligatorio.
    """
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
        """Valida formato de email y dominio con regex."""
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
        """Valida teléfono: solo números, 7-15 dígitos."""
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


# ═══════════════════════════════════════════════════════════════════════
# CheckoutSummaryItemSerializer — Ítems para resumen de checkout
# ═══════════════════════════════════════════════════════════════════════
class CheckoutSummaryItemSerializer(serializers.ModelSerializer):
    """Ítem del carrito para mostrar en el resumen del checkout.
    Incluye nombre, variante, cantidad, precio y subtotal."""
    product_name = serializers.SerializerMethodField()
    variant_label = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ['id', 'product_name', 'variant_label', 'quantity', 'unit_price', 'subtotal', 'product_image']

    def get_product_name(self, obj):
        if obj.design_preview_url or (obj.design_data and bool(obj.design_data)):
            return "Camiseta Estampado Personalizado"
        return obj.product.name

    def get_variant_label(self, obj):
        if obj.variant:
            return f'{obj.variant.size} / {obj.variant.color}'
        return ''

    def get_product_image(self, obj):
        if obj.design_preview_url:
            return obj.design_preview_url
        main_image = obj.product.main_image
        if main_image:
            return main_image.image.url
        return None


# ═══════════════════════════════════════════════════════════════════════
# Serializers de pago — Wompi
# ═══════════════════════════════════════════════════════════════════════

class CheckoutItemSerializer(serializers.Serializer):
    """Ítem de checkout para respuesta serializada (no model-bound)."""
    product_name = serializers.CharField()
    variant_label = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    product_image = serializers.URLField(allow_null=True, allow_blank=True)


class PaymentInitSerializer(serializers.Serializer):
    """Serializer para inicializar un pago — solo requiere order_id."""
    order_id = serializers.IntegerField()


class PaymentStatusSerializer(serializers.Serializer):
    """Serializer para consultar estado de pago — solo requiere reference."""
    reference = serializers.CharField()
