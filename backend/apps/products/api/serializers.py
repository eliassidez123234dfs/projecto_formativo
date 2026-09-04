from __future__ import annotations

from django.db import transaction
from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination

from apps.catalog.api.serializers import CategorySerializer
from apps.catalog.models import Category, ProductCategory
from apps.products.models import Product, ProductAudit, ProductImage, Variant, is_cop_price_valid


class ProductImageSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'is_main', 'order', 'created_at']
        read_only_fields = ['id', 'image_url', 'created_at']

    def get_image_url(self, obj):
        if not obj.image:
            return None
        return obj.image.url


class VariantSerializer(serializers.ModelSerializer):
    display_label = serializers.SerializerMethodField()
    effective_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Variant
        fields = [
            'id', 'size', 'color', 'color_hex', 'color_nombre',
            'stock', 'price_variant', 'effective_price', 'display_label', 'created_at',
        ]
        read_only_fields = ['id', 'effective_price', 'display_label', 'created_at']

    def get_display_label(self, obj):
        return f'Talla {obj.size} — {obj.color}'


class ProductWriteSerializer(serializers.ModelSerializer):
    category_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Category.objects.all(),
        required=False,
        write_only=True,
        source='categories',
    )
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'base_price', 'is_active', 'is_approved',
            'category_ids', 'categories', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'categories', 'created_at', 'updated_at']

    def validate_name(self, value):
        value = value.strip()
        if len(value) > 100:
            raise serializers.ValidationError('El nombre no puede superar 100 caracteres.')
        return value

    def validate_description(self, value):
        value = value.strip()
        if len(value) > 500:
            raise serializers.ValidationError('La descripción no puede superar 500 caracteres.')
        return value

    def validate_base_price(self, value):
        if not is_cop_price_valid(value):
            raise serializers.ValidationError('El precio en COP debe ser >= 50 y múltiplo de 50.')
        return value

    def _set_categories(self, product, category_ids):
        ProductCategory.objects.filter(product=product).delete()
        for category in category_ids:
            ProductCategory.objects.create(product=product, category=category)

    def get_categories(self, obj):
        return CategorySerializer(
            [pc.category for pc in obj.categories.all()],
            many=True,
            context=self.context,
        ).data

    def create(self, validated_data):
        category_ids = validated_data.pop('categories', [])
        product = super().create(validated_data)
        self._set_categories(product, category_ids)
        return product

    def update(self, instance, validated_data):
        category_ids = validated_data.pop('categories', None)
        product = super().update(instance, validated_data)
        if category_ids is not None:
            self._set_categories(product, category_ids)
        return product


class ProductListSerializer(serializers.ModelSerializer):
    main_image = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()
    variants_count = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    checklist = serializers.SerializerMethodField()
    ready_to_publish = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'base_price', 'is_active', 'is_approved',
            'main_image', 'images_count', 'variants_count', 'total_stock',
            'checklist', 'ready_to_publish', 'categories',
            'created_at', 'updated_at',
        ]

    def get_main_image(self, obj):
        image = obj.main_image
        if not image:
            return None
        return image.image.url

    def get_images_count(self, obj):
        return obj.images.count()

    def get_variants_count(self, obj):
        return obj.variants.count()

    def get_total_stock(self, obj):
        return obj.total_stock

    def get_categories(self, obj):
        return CategorySerializer(
            [pc.category for pc in obj.categories.all()],
            many=True,
            context=self.context,
        ).data

    def get_checklist(self, obj):
        return obj.checklist

    def get_ready_to_publish(self, obj):
        return obj.can_be_published


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = VariantSerializer(many=True, read_only=True)
    related_products = serializers.SerializerMethodField()
    publication_message = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ['images', 'variants', 'related_products', 'publication_message']

    def get_publication_message(self, obj):
        return 'Listo para publicar' if obj.can_be_published else 'Faltan imagen principal o variante con stock'

    def get_related_products(self, obj):
        related_ids = (
            ProductCategory.objects
            .filter(product=obj)
            .values_list('category_id', flat=True)
        )
        related = Product.objects.filter(
            categories__category_id__in=list(related_ids),
            is_active=True,
            is_approved=True,
        ).exclude(pk=obj.pk).distinct()[:4]
        serializer = ProductListSerializer(related, many=True, context=self.context)
        return serializer.data


class ProductImageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'is_main', 'order']
        read_only_fields = ['id']

    def validate_image(self, value):
        if not value:
            raise serializers.ValidationError('La imagen es obligatoria.')
        
        # Validar formato
        allowed_formats = ['.jpg', '.jpeg', '.png']
        file_extension = value.name.lower().split('.')[-1]
        if f'.{file_extension}' not in allowed_formats:
            raise serializers.ValidationError('Solo se permiten imágenes JPG o PNG.')
        
        # Validar tamaño (2MB)
        if value.size > 2 * 1024 * 1024:
            raise serializers.ValidationError('La imagen no puede superar 2MB.')
        
        # Validar resolución mínima
        try:
            from PIL import Image
            image = Image.open(value)
            width, height = image.size
            if width < 400 or height < 400:
                raise serializers.ValidationError('La resolución mínima es 400x400 píxeles.')
        except Exception:
            raise serializers.ValidationError('No se pudo validar la imagen.')
        
        return value

    def validate(self, attrs):
        product = self.context['product']
        if product.images.count() >= 5:
            raise serializers.ValidationError({'image': 'Máximo 5 imágenes por producto.'})
        return attrs

    def create(self, validated_data):
        product = self.context['product']
        return ProductImage.objects.create(product=product, **validated_data)


class VariantCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Variant
        fields = ['id', 'size', 'color', 'color_hex', 'color_nombre', 'stock', 'price_variant']
        read_only_fields = ['id']

    def validate_size(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('La talla es obligatoria.')
        return value.strip()

    def validate_color(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('El color es obligatorio.')
        return value.strip()

    def validate_color_hex(self, value):
        if value and len(value) == 7:
            try:
                int(value.lstrip('#'), 16)
            except ValueError:
                raise serializers.ValidationError('El color HEX no es válido (ej. #RRGGBB).')
            return value
        raise serializers.ValidationError('El color HEX debe tener formato #RRGGBB.')

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock debe ser mayor o igual a 0.')
        return value

    def validate_price_variant(self, value):
        if value is not None and not is_cop_price_valid(value):
            raise serializers.ValidationError('El precio de la variante en COP debe ser >= 50 y múltiplo de 50, o dejarse vacío para usar el precio base.')
        return value

    def validate(self, attrs):
        product = self.context['product']
        sizes = set(product.variants.values_list('size', flat=True))
        colors = set(product.variants.values_list('color', flat=True))
        sizes.add(attrs['size'])
        colors.add(attrs['color'])

        if len(sizes) > 4:
            raise serializers.ValidationError({'size': 'Máximo 4 tallas por producto.'})
        if len(colors) > 10:
            raise serializers.ValidationError({'color': 'Máximo 10 colores por producto.'})
        if product.variants.filter(size=attrs['size'], color=attrs['color']).exists():
            raise serializers.ValidationError({'non_field_errors': 'Cada combinación talla/color debe ser única por producto.'})

        if not attrs.get('color_nombre'):
            attrs['color_nombre'] = attrs['color']
        return attrs

    def create(self, validated_data):
        product = self.context['product']
        return Variant.objects.create(product=product, **validated_data)


class VariantUpdateSerializer(serializers.ModelSerializer):
    """Permite editar stock, precio y color de una variante existente (RF-040)."""
    class Meta:
        model = Variant
        fields = ['id', 'size', 'color', 'color_hex', 'color_nombre', 'stock', 'price_variant']
        read_only_fields = ['id']

    def validate_size(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError('La talla es obligatoria.')
        return value.strip()

    def validate_color(self, value):
        if value is None or not value.strip():
            raise serializers.ValidationError('El color es obligatorio.')
        return value.strip()

    def validate_color_hex(self, value):
        if value and len(value) == 7:
            try:
                int(value.lstrip('#'), 16)
            except ValueError:
                raise serializers.ValidationError('El color HEX no es válido (ej. #RRGGBB).')
            return value
        raise serializers.ValidationError('El color HEX debe tener formato #RRGGBB.')

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock debe ser mayor o igual a 0.')
        return value

    def validate_price_variant(self, value):
        if value is not None and not is_cop_price_valid(value):
            raise serializers.ValidationError('El precio de la variante en COP debe ser >= 50 y múltiplo de 50, o dejarse vacío para usar el precio base.')
        return value


class ProductAuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductAudit
        fields = ['id', 'action', 'actor', 'before_data', 'after_data', 'motivo', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'count': {'type': 'integer'},
                'next': {'type': 'string', 'nullable': True},
                'previous': {'type': 'string', 'nullable': True},
                'results': schema,
            },
        }


class CartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('La cantidad mínima permitida es 1.')
        return value

    def validate(self, attrs):
        try:
            from apps.products.models import Product, Variant
            product = Product.objects.get(id=attrs['product_id'])
            variant = Variant.objects.get(id=attrs['variant_id'], product=product)
            
            if not product.is_active:
                raise serializers.ValidationError({'product_id': 'El producto debe estar activo.'})
            if not product.is_approved:
                raise serializers.ValidationError({'product_id': 'El producto debe estar aprobado para la venta.'})
            if attrs['quantity'] > variant.stock:
                raise serializers.ValidationError({'quantity': 'La cantidad no puede superar el stock disponible.'})
            
            attrs['product'] = product
            attrs['variant'] = variant
            return attrs
        except (Product.DoesNotExist, Variant.DoesNotExist):
            raise serializers.ValidationError('Producto o variante no encontrados.')
