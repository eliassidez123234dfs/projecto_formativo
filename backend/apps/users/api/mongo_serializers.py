# ==============================================================================
# Serializadores MongoDB — Red Estampación
# ==============================================================================
# Serializadores para las colecciones MongoDB del sistema.
# Todos son serializadores Serializer (no ModelSerializer) ya que los
# datos se almacenan en MongoDB, no en el ORM de Django.
#
# Serializadores:
#   DesignConfigSerializer      → configuración anidada del diseño 3D.
#   SavedDesignSerializer       → diseño guardado por el usuario.
#   AuditLogSerializer          → evento de auditoría.
#   CartItemMongoSerializer     → item individual del carrito.
#   CartSessionSerializer       → sesión de carrito completa.
#   CommunityTemplateSerializer → plantilla comunitaria.
# ==============================================================================
from rest_framework import serializers


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: DesignConfigSerializer
# ─────────────────────────────────────────────────────────────────────────────
# Configuración anidada del diseño 3D. Contiene:
#   - logo:       datos del logotipo (Dict).
#   - text_layers: capas de texto (List).
#   - colors:     paleta de colores (Dict).
# ─────────────────────────────────────────────────────────────────────────────
class DesignConfigSerializer(serializers.Serializer):
    """Configuración del diseño 3D: logo, capas de texto y colores."""
    logo = serializers.DictField(default=dict)
    text_layers = serializers.ListField(default=list)
    colors = serializers.DictField(default=dict)


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: SavedDesignSerializer
# ─────────────────────────────────────────────────────────────────────────────
# Serializa un diseño 3D guardado por el usuario. Campos de solo lectura:
# id, likes_count, view_count, comments, created_at, updated_at.
# user_id se asigna automáticamente desde request.user.id en la vista.
# ─────────────────────────────────────────────────────────────────────────────
class SavedDesignSerializer(serializers.Serializer):
    """Serializador para diseños 3D guardados por el usuario en MongoDB."""
    id = serializers.CharField(read_only=True)
    user_id = serializers.IntegerField()
    name = serializers.CharField(max_length=255)
    product_id = serializers.IntegerField(required=False, allow_null=True)
    model_3d_id = serializers.IntegerField(required=False, allow_null=True)
    configuration = DesignConfigSerializer(default=dict)
    thumbnail_url = serializers.URLField(required=False, allow_blank=True)
    tags = serializers.ListField(child=serializers.CharField(), default=list)
    is_published = serializers.BooleanField(default=False)
    is_template = serializers.BooleanField(default=False)
    likes_count = serializers.IntegerField(read_only=True)
    view_count = serializers.IntegerField(read_only=True)
    comments = serializers.ListField(read_only=True, default=list)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: AuditLogSerializer
# ─────────────────────────────────────────────────────────────────────────────
# Serializa un evento de auditoría. La IP se asigna automáticamente
# desde la request en la vista (no se recibe del cliente).
# severity tiene valores predefinidos: info, warning, error, critical.
# ─────────────────────────────────────────────────────────────────────────────
class AuditLogSerializer(serializers.Serializer):
    """Serializador para eventos de auditoría en MongoDB."""
    action = serializers.CharField(max_length=255)
    actor_id = serializers.IntegerField(required=False, allow_null=True)
    target_type = serializers.CharField(required=False, allow_null=True, max_length=100)
    target_id = serializers.CharField(required=False, allow_null=True, max_length=100)
    metadata = serializers.DictField(default=dict)
    ip_address = serializers.CharField(required=False, allow_null=True, max_length=45)
    severity = serializers.ChoiceField(
        choices=['info', 'warning', 'error', 'critical'],
        default='info',
    )


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: CartItemMongoSerializer
# ─────────────────────────────────────────────────────────────────────────────
# Serializa un item individual dentro del carrito de compra.
# quantity tiene mínimo 1 (no se permiten cantidades negativas o cero).
# unit_price usa DecimalField para precisión monetaria.
# ─────────────────────────────────────────────────────────────────────────────
class CartItemMongoSerializer(serializers.Serializer):
    """Item individual del carrito de compra en MongoDB."""
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(required=False, allow_blank=True)
    variant_label = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    image_url = serializers.URLField(required=False, allow_blank=True)


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: CartSessionSerializer
# ─────────────────────────────────────────────────────────────────────────────
# Serializa una sesión de carrito completa con sus items anidados.
# user_id y session_key son mutuamente excluyentes (anónimo vs autenticado).
# ─────────────────────────────────────────────────────────────────────────────
class CartSessionSerializer(serializers.Serializer):
    """Serializador para sesiones de carrito persistente en MongoDB."""
    id = serializers.CharField(read_only=True)
    user_id = serializers.IntegerField(required=False, allow_null=True)
    session_key = serializers.CharField(required=False, allow_null=True)
    items = CartItemMongoSerializer(many=True, default=list)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: CommunityTemplateSerializer
# ─────────────────────────────────────────────────────────────────────────────
# Serializa una plantilla comunitaria. Campos de solo lectura:
# id, likes_count, view_count, download_count, comments, created_at, updated_at.
# designer_id y designer_name se asignan automáticamente desde request.user.
# ─────────────────────────────────────────────────────────────────────────────
class CommunityTemplateSerializer(serializers.Serializer):
    """Serializador para plantillas de diseño compartidas por la comunidad en MongoDB."""
    id = serializers.CharField(read_only=True)
    designer_id = serializers.IntegerField()
    designer_name = serializers.CharField(max_length=150)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True)
    configuration = DesignConfigSerializer(default=dict)
    thumbnail_url = serializers.URLField(required=False, allow_blank=True)
    product_id = serializers.IntegerField(required=False, allow_null=True)
    tags = serializers.ListField(child=serializers.CharField(), default=list)
    is_featured = serializers.BooleanField(default=False)
    likes_count = serializers.IntegerField(read_only=True)
    view_count = serializers.IntegerField(read_only=True)
    download_count = serializers.IntegerField(read_only=True)
    comments = serializers.ListField(read_only=True, default=list)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
