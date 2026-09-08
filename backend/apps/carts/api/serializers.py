"""
Serializers del módulo de Carrito.

Define la serialización de datos para el carrito de compras, incluyendo:
  - CartItemSerializer: ítems del carrito con datos de producto y variante.
  - CartSerializer: carrito completo con ítems y totales.
  - AdminCart*Serializer: vistas para administradores.
  - CartAddSerializer: validación al agregar productos al carrito.

Patrón de diseño: Serializer jerárquico (carrito → ítems → producto/variante).
"""
from __future__ import annotations

from rest_framework import serializers

from apps.carts.models import Cart, CartItem
from apps.products.models import Product, Variant


# ═══════════════════════════════════════════════════════════════════════
# CartItemSerializer — Ítems del carrito
# ═══════════════════════════════════════════════════════════════════════
class CartItemSerializer(serializers.ModelSerializer):
    """Serializer de ítem del carrito.
    
    Incluye datos derivados: nombre del producto (con lógica de diseño personalizado),
    imagen principal, etiqueta de variante, y subtotal calculado.
    Los campos de variante (talla, color, stock, hex) se leen del modelo Variant.
    """
    product_name = serializers.SerializerMethodField()
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
            'quantity', 'unit_price', 'subtotal', 'design_preview_url', 'design_data', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'product_name', 'product_image', 'variant_label', 'variant_size', 'variant_color', 'variant_stock', 'variant_hex', 'subtotal', 'created_at', 'updated_at']

    def get_product_name(self, obj):
        """Retorna nombre del producto o etiqueta de diseño personalizado."""
        if obj.design_preview_url or (obj.design_data and bool(obj.design_data)):
            return "Camiseta Estampado Personalizado"
        return obj.product.name

    def get_product_image(self, obj):
        """Retorna imagen del diseño personalizado o imagen principal del producto."""
        if obj.design_preview_url:
            return obj.design_preview_url
        image = obj.product.main_image
        if not image:
            return None
        return image.image.url

    def get_variant_label(self, obj):
        return f'Talla {obj.variant.size} — {obj.variant.color}'

    def get_subtotal(self, obj):
        return str(obj.subtotal)


# ═══════════════════════════════════════════════════════════════════════
# CartSerializer — Carrito completo
# ═══════════════════════════════════════════════════════════════════════
class CartSerializer(serializers.ModelSerializer):
    """Serializer del carrito completo con ítems anidados y totales."""
    items = CartItemSerializer(many=True, read_only=True)
    total_items = serializers.IntegerField(read_only=True)
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'session_key', 'items', 'total_items', 'total_amount', 'created_at', 'updated_at']

    def get_total_amount(self, obj):
        return str(obj.total_amount)


# ═══════════════════════════════════════════════════════════════════════
# AdminCart*Serializer — Vistas de administración
# ═══════════════════════════════════════════════════════════════════════

class AdminCartListSerializer(serializers.ModelSerializer):
    """Lista de carritos para administradores — resumen con datos de usuario y orden."""
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
        return getattr(obj, 'order_id', None)

    def get_order_status(self, obj):
        return getattr(obj, 'order_status', 'pendiente')

    def get_order_status_display(self, obj):
        return getattr(obj, 'order_status_display', 'Pendiente')


class AdminCartDetailSerializer(serializers.ModelSerializer):
    """Detalle de carrito para administradores — incluye ítems completos."""
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
        return getattr(obj, 'order_id', None)

    def get_order_status(self, obj):
        order = getattr(obj, 'order', None)
        if order:
            return order.status
        return 'pendiente'

    def get_order_status_display(self, obj):
        order = getattr(obj, 'order', None)
        if order:
            return order.get_status_display()
        return 'Pendiente'


# ═══════════════════════════════════════════════════════════════════════
# CartAddSerializer — Validación al agregar productos
# ═══════════════════════════════════════════════════════════════════════
class CartAddSerializer(serializers.Serializer):
    """Serializer para agregar productos al carrito.
    
    Valida que el producto exista, esté activo/aprobado, la variante
    pertenezca al producto, y la cantidad no supere el stock.
    """
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        """Validación cruzada: producto, variante, estado y stock."""
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


