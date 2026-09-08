"""
Serializers del módulo de Órdenes.

Define la serialización de datos para órdenes de compra, ítems de orden
y facturas. Incluye serializers diferenciados para:
  - Usuarios: vista resumida de sus propios pedidos (MyOrderSerializer).
  - Administradores: vista completa con datos de envío y pago.
  - Facturas: datos de facturación con ítems asociados.

Patrón de diseño: Serializer jerárquico (escritura → lectura → detalle).
"""
from rest_framework import serializers

from apps.orders.models import Invoice, Order, OrderItem


# ═══════════════════════════════════════════════════════════════════════
# OrderSerializer — Escritura/lectura general de órdenes
# ═══════════════════════════════════════════════════════════════════════
class OrderSerializer(serializers.ModelSerializer):
    """Serializer completo para creación y lectura de órdenes.
    Incluye todos los campos de envío, pago y diseño personalizado."""
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
            'delivered_at',
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


# ═══════════════════════════════════════════════════════════════════════
# Serializers para vista de usuario — MyOrder*
# ═══════════════════════════════════════════════════════════════════════

class MyOrderItemSerializer(serializers.ModelSerializer):
    """Ítem de orden para la vista del usuario — nombre, variante, cantidad y precio."""
    product_name = serializers.CharField(source='product.name', read_only=True)
    variant_label = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product_name', 'variant_label', 'quantity', 'unit_price']

    def get_variant_label(self, obj):
        return f'Talla {obj.variant.size} — {obj.variant.color}'


class MyOrderSerializer(serializers.ModelSerializer):
    """Resumen completo de un pedido para la vista de pedidos del usuario.
    
    Incluye estado con etiqueta legible, conteo de ítems, diseño personalizado
    y datos de referencia de pago Wompi.
    """
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    items_count = serializers.SerializerMethodField()
    items = MyOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'status', 'status_label', 'total',
            'created_at', 'delivered_at', 'items_count', 'items',
            'image', 'image_url', 'design_color', 'notes', 'customer_name', 'customer_email',
            'payment_reference', 'payment_transaction_id', 'payment_wompi_status',
        ]

    def get_items_count(self, obj):
        return obj.items.count()


# ═══════════════════════════════════════════════════════════════════════
# Serializers para administrador — AdminOrder*
# ═══════════════════════════════════════════════════════════════════════

class AdminOrderItemSerializer(serializers.ModelSerializer):
    """Ítem de orden para admin — incluye subtotales calculados."""
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
    """Lista de órdenes para panel de administración — resumen básico."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'customer_name', 'customer_email',
            'status', 'status_display', 'total', 'created_at',
        ]


class AdminOrderDetailSerializer(serializers.ModelSerializer):
    """Detalle completo de orden para administración — incluye envío, pago e ítems."""
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


# ═══════════════════════════════════════════════════════════════════════
# InvoiceSerializer — Facturas
# ═══════════════════════════════════════════════════════════════════════

class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer de factura con datos de la orden asociada e ítems."""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    customer_name = serializers.CharField(source='order.customer_name', read_only=True)
    items = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'order', 'order_number', 'customer_name',
                  'subtotal', 'total', 'generated_at', 'pdf_url', 'items']

    def get_items(self, obj):
        """Retorna los ítems de la orden asociada a la factura."""
        return AdminOrderItemSerializer(obj.order.items.all(), many=True).data
