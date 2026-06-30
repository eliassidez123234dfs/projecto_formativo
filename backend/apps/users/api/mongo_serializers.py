from rest_framework import serializers


class DesignConfigSerializer(serializers.Serializer):
    logo = serializers.DictField(default=dict)
    text_layers = serializers.ListField(default=list)
    colors = serializers.DictField(default=dict)


class SavedDesignSerializer(serializers.Serializer):
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


class AuditLogSerializer(serializers.Serializer):
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


class CartItemMongoSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    product_name = serializers.CharField(required=False, allow_blank=True)
    variant_label = serializers.CharField(required=False, allow_blank=True)
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    image_url = serializers.URLField(required=False, allow_blank=True)


class CartSessionSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    user_id = serializers.IntegerField(required=False, allow_null=True)
    session_key = serializers.CharField(required=False, allow_null=True)
    items = CartItemMongoSerializer(many=True, default=list)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)


class CommunityTemplateSerializer(serializers.Serializer):
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
