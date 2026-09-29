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

import re

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
    # MethodField y no source='variant.size': con la FK variant a NULL (rama
    # java/mongoDB) DRF no encuentra el atributo y responde 500 al serializar el
    # carrito. Aquí se degradan a None.
    variant_size = serializers.SerializerMethodField()
    variant_color = serializers.SerializerMethodField()
    variant_stock = serializers.SerializerMethodField()
    variant_hex = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            'id', 'product', 'product_ref', 'product_name', 'product_image',
            'variant', 'variant_ref', 'variant_label',
            'variant_size', 'variant_color', 'variant_stock', 'variant_hex',
            'quantity', 'unit_price', 'subtotal', 'design_preview_url', 'design_data', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'product_ref', 'variant_ref', 'product_name', 'product_image', 'variant_label', 'variant_size', 'variant_color', 'variant_stock', 'variant_hex', 'subtotal', 'created_at', 'updated_at']

    def get_product_name(self, obj):
        """Nombre del producto: diseño personalizado, FK local o snapshot.

        En la rama java/mongoDB la FK `product` es NULL y el nombre llega en el
        snapshot; sin este fallback, serializar el carrito de un producto de
        MongoDB levantaría AttributeError sobre None.
        """
        if obj.design_preview_url or (obj.design_data and bool(obj.design_data)):
            return "Camiseta Estampado Personalizado"
        return obj.display_name

    def get_product_image(self, obj):
        """Imagen del diseño personalizado, del producto local o del snapshot."""
        if obj.design_preview_url:
            return obj.design_preview_url
        if obj.product_id and obj.product:
            image = obj.product.main_image
            return image.image.url if image else None
        return obj.product_image or None

    def get_variant_label(self, obj):
        return obj.display_variant

    def get_variant_size(self, obj):
        return obj.variant.size if obj.variant_id and obj.variant else None

    def get_variant_color(self, obj):
        return obj.variant.color if obj.variant_id and obj.variant else None

    def get_variant_stock(self, obj):
        return obj.variant.stock if obj.variant_id and obj.variant else None

    def get_variant_hex(self, obj):
        return obj.variant.color_hex if obj.variant_id and obj.variant else None

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

    Acepta los dos modos de referencia, porque en la rama java/mongoDB el
    catálogo lo sirve Spring desde MongoDB y por lo tanto el `product_id` que
    manda el frontend es un ObjectId de 24 hex, no un entero de PostgreSQL:

      - ObjectId de 24 hex  -> rama MongoDB: se guarda en product_ref y el
        nombre/precio viajan como snapshot.
      - Entero              -> rama PostgreSQL: se resuelve contra Product y
        Variant locales, como siempre.

    La validación de estado, precio y stock en modo MongoDB la hace el
    microservicio contra MongoDB, que es quien tiene la fuente de verdad; aquí
    no se puede comprobar contra tablas que ya no contienen el producto.
    """
    product_id = serializers.CharField()
    variant_id = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    product_name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    variant_label = serializers.CharField(max_length=100, required=False, allow_blank=True)

    OBJECT_ID_RE = re.compile(r'^[0-9a-fA-F]{24}$')

    def validate(self, attrs):
        """Resuelve producto y variante en el modo que corresponda."""
        raw_id = str(attrs['product_id']).strip()

        if not self.OBJECT_ID_RE.match(raw_id):
            # Rama PostgreSQL: enteros, validación completa contra la BD local.
            return self._validar_postgres(attrs, raw_id)

        # Rama MongoDB: el producto vive fuera de esta base de datos.
        if not attrs.get('product_name'):
            raise serializers.ValidationError(
                {'product_name': 'Se requiere el nombre del producto para referenciar el de MongoDB.'},
            )
        attrs['product'] = None
        attrs['variant'] = None
        attrs['product_ref'] = raw_id
        attrs['variant_ref'] = (str(attrs.get('variant_id')).strip() or None)
        return attrs

    def _validar_postgres(self, attrs, raw_id):
        """Validación cruzada contra las tablas locales (rama PostgreSQL)."""
        try:
            product = Product.objects.get(pk=raw_id)
        except (Product.DoesNotExist, ValueError) as exc:
            raise serializers.ValidationError({'product_id': 'Producto no encontrado.'}) from exc

        variant = None
        if attrs.get('variant_id'):
            try:
                variant = Variant.objects.get(pk=attrs['variant_id'], product=product)
            except (Variant.DoesNotExist, ValueError) as exc:
                raise serializers.ValidationError({'variant_id': 'Variante no válida para este producto.'}) from exc

        if not product.is_active or not product.is_approved:
            raise serializers.ValidationError({'product_id': 'El producto debe estar activo y aprobado para venderse.'})

        if variant and variant.stock < attrs['quantity']:
            raise serializers.ValidationError({'quantity': 'La cantidad supera el stock disponible.'})

        attrs['product'] = product
        attrs['variant'] = variant
        return attrs


