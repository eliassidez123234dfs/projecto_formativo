"""
Serializadores para la app de productos.
Define serializadores para Product, ProductImage, Variant, auditoría y carrito.
"""

from __future__ import annotations

from django.db import transaction
from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination
from rest_framework.validators import UniqueValidator

from apps.products.models import Product, ProductAudit, ProductImage, Variant


class ProductImageSerializer(serializers.ModelSerializer):
    """Serializador de lectura para imágenes de producto con URL resuelta."""
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'image_url', 'cloudinary_url', 'is_main', 'order', 'created_at']
        read_only_fields = ['id', 'image_url', 'created_at']

    def get_image_url(self, obj):
        return obj.image_url


class VariantSerializer(serializers.ModelSerializer):
    """Serializador de lectura para variantes con etiqueta descriptiva."""
    display_label = serializers.SerializerMethodField()

    class Meta:
        model = Variant
        fields = ['id', 'size', 'color', 'stock', 'precio_variante', 'display_label', 'created_at']
        read_only_fields = ['id', 'display_label', 'created_at']

    def get_display_label(self, obj):
        return f'Talla {obj.size} — {obj.color}'


class ProductWriteSerializer(serializers.ModelSerializer):
    """Serializador de escritura para crear/actualizar productos."""
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'base_price', 'is_active', 'is_approved', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        name_field = self.fields.get('name')
        if name_field:
            for i, validator in enumerate(name_field.validators):
                if isinstance(validator, UniqueValidator):
                    name_field.validators[i] = UniqueValidator(
                        queryset=Product.objects.all(),
                        message='Ya existe un producto con este nombre.'
                    )

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
        if value <= 0:
            raise serializers.ValidationError('El precio base debe ser mayor a 0.')
        return value


class ProductListSerializer(serializers.ModelSerializer):
    """Serializador de listado con resumen de imágenes, variantes y checklist de publicación."""
    main_image = serializers.SerializerMethodField()
    images_count = serializers.SerializerMethodField()
    variants_count = serializers.SerializerMethodField()
    checklist = serializers.SerializerMethodField()
    ready_to_publish = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'base_price', 'is_active', 'is_approved',
            'main_image', 'images_count', 'variants_count', 'checklist', 'ready_to_publish',
            'created_at', 'updated_at',
        ]

    def get_main_image(self, obj):
        image = obj.main_image
        if not image:
            return None
        return image.image_url

    def get_images_count(self, obj):
        return obj.images.count()

    def get_variants_count(self, obj):
        return obj.variants.count()

    def get_checklist(self, obj):
        return obj.checklist

    def get_ready_to_publish(self, obj):
        return obj.can_be_published


class ProductDetailSerializer(ProductListSerializer):
    """Serializador de detalle con imágenes, variantes, rating y estado de publicación."""
    images = ProductImageSerializer(many=True, read_only=True)
    variants = VariantSerializer(many=True, read_only=True)
    publication_message = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + ['images', 'variants', 'publication_message', 'average_rating', 'total_reviews']

    def get_publication_message(self, obj):
        return 'Listo para publicar' if obj.can_be_published else 'Faltan imagen principal o variante con stock'

    def get_average_rating(self, obj):
        return obj.average_rating

    def get_total_reviews(self, obj):
        return obj.total_reviews


class ProductImageCreateSerializer(serializers.ModelSerializer):
    """Serializador de creación de imágenes con validación de formato, tamaño y resolución."""
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'cloudinary_url', 'is_main', 'order']
        read_only_fields = ['id']

    def validate(self, attrs):
        product = self.context['product']
        if product.images.count() >= 5:
            raise serializers.ValidationError({'image': 'Máximo 5 imágenes por producto.'})
        
        if not attrs.get('image') and not attrs.get('cloudinary_url'):
            raise serializers.ValidationError({'image': 'Debe proporcionar una imagen o una URL de Cloudinary.'})
        
        if attrs.get('image'):
            value = attrs['image']
            if not value.name:
                raise serializers.ValidationError({'image': 'El archivo no tiene un nombre válido.'})
            allowed_formats = ['.jpg', '.jpeg', '.png', '.webp']
            parts = value.name.lower().rsplit('.', 1)
            if len(parts) < 2 or f'.{parts[-1]}' not in allowed_formats:
                raise serializers.ValidationError({'image': 'Solo se permiten imágenes JPG, PNG o WebP.'})
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError({'image': 'La imagen no puede superar 5MB.'})
            try:
                from PIL import Image, UnidentifiedImageError
                try:
                    image = Image.open(value)
                    image.load()
                except UnidentifiedImageError:
                    raise serializers.ValidationError({'image': 'El archivo no es una imagen válida. Usa JPG, PNG o WebP.'})
                width, height = image.size
                if width < 100 or height < 100:
                    raise serializers.ValidationError({'image': 'La resolución mínima es 100x100 píxeles.'})
            except serializers.ValidationError:
                raise
            except Exception as e:
                raise serializers.ValidationError({'image': f'No se pudo procesar la imagen: {e}'})
        
        return attrs

    def create(self, validated_data):
        product = self.context['product']
        return ProductImage.objects.create(product=product, **validated_data)


class VariantCreateSerializer(serializers.ModelSerializer):
    """Serializador de creación de variantes con límite de 4 tallas y 10 colores por producto."""
    class Meta:
        model = Variant
        fields = ['id', 'size', 'color', 'stock', 'precio_variante']
        read_only_fields = ['id']

    def validate_size(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('La talla es obligatoria.')
        return value.strip()

    def validate_color(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('El color es obligatorio.')
        return value.strip()

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError('El stock debe ser mayor o igual a 0.')
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
        return attrs

    def create(self, validated_data):
        product = self.context['product']
        return Variant.objects.create(product=product, **validated_data)


class ProductAuditSerializer(serializers.ModelSerializer):
    """Serializador de solo lectura para entradas de auditoría de productos."""
    class Meta:
        model = ProductAudit
        fields = ['id', 'action', 'actor', 'before_data', 'after_data', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProductPagination(PageNumberPagination):
    """Paginación personalizada con parámetro page_size y máximo 100 elementos."""
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
    """Serializador para añadir items al carrito. Valida stock y estado del producto."""
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
