"""
Serializers del módulo de Catálogo (público).

Define la serialización de datos para el catálogo público de productos:
  - CategorySerializer: categorías de productos con conteo.
  - CatalogProductSerializer: productos para el catálogo público con filtros dinámicos.
  - CatalogSearchSerializer: validación de parámetros de búsqueda avanzada.
  - CatalogPagination: paginación personalizada para catálogo.

Patrón de diseño: Read-Only Serializer con campos derivados (mín/máx stock, precios).
Todos los campos de escritura están excluidos del catálogo público.
"""
from __future__ import annotations

from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination

from apps.catalog.models import Category, PopularSearch, SearchHistory
from apps.products.models import Product


# ═══════════════════════════════════════════════════════════════════════
# CategorySerializer — Categorías de productos
# ═══════════════════════════════════════════════════════════════════════
class CategorySerializer(serializers.ModelSerializer):
    """Serializer de categorías con conteo de productos asociados."""
    product_count = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active', 'product_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'product_count', 'created_at', 'updated_at']


# ═══════════════════════════════════════════════════════════════════════
# CatalogProductSerializer — Productos del catálogo público
# ═══════════════════════════════════════════════════════════════════════
class CatalogProductSerializer(serializers.ModelSerializer):
    """Serializer de productos para el catálogo público.
    
    Incluye campos derivados:
      - main_image: URL de la imagen principal.
      - available_sizes/colors: opciones disponibles (con stock).
      - color_hexes: mapeo color → hex.
      - min/max_price: rango de precios de variantes.
      - total_stock: stock total del producto.
      - categories: nombres de categorías asociadas.
    """
    main_image = serializers.SerializerMethodField()
    available_sizes = serializers.SerializerMethodField()
    available_colors = serializers.SerializerMethodField()
    color_hexes = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'base_price', 'is_active', 'is_approved',
            'main_image', 'available_sizes', 'available_colors', 'color_hexes', 'variants',
            'min_price', 'max_price', 'total_stock', 'categories', 'created_at', 'updated_at'
        ]

    def get_main_image(self, obj):
        image = obj.main_image
        if not image:
            return None
        return image.image.url

    def get_available_sizes(self, obj):
        """Tallas disponibles (con stock > 0)."""
        return list(obj.variants.filter(stock__gt=0).values_list('size', flat=True).distinct())

    def get_available_colors(self, obj):
        """Colores disponibles (con stock > 0)."""
        return list(obj.variants.filter(stock__gt=0).values_list('color', flat=True).distinct())

    def get_color_hexes(self, obj):
        """Mapeo color → código hexadecimal."""
        return dict(obj.variants.filter(stock__gt=0).values_list('color', 'color_hex').distinct())

    def get_variants(self, obj):
        """Lista de variantes ordenadas por talla y color."""
        return [
            {
                'id': variant.id,
                'size': variant.size,
                'color': variant.color,
                'color_hex': variant.color_hex,
                'stock': variant.stock,
            }
            for variant in obj.variants.all().order_by('size', 'color')
        ]

    def get_min_price(self, obj):
        """Precio mínimo entre variantes con stock."""
        variants = list(obj.variants.filter(stock__gt=0))
        if not variants:
            return obj.base_price
        return min(variant.effective_price for variant in variants)

    def get_max_price(self, obj):
        """Precio máximo entre variantes con stock."""
        variants = list(obj.variants.filter(stock__gt=0))
        if not variants:
            return obj.base_price
        return max(variant.effective_price for variant in variants)

    def get_total_stock(self, obj):
        return obj.total_stock

    def get_categories(self, obj):
        return [pc.category.name for pc in obj.categories.all()]


# ═══════════════════════════════════════════════════════════════════════
# Serializers de historial y búsquedas populares
# ═══════════════════════════════════════════════════════════════════════

class SearchHistorySerializer(serializers.ModelSerializer):
    """Historial de búsquedas del usuario (solo lectura)."""
    class Meta:
        model = SearchHistory
        fields = ['id', 'query', 'filters', 'results_count', 'created_at']
        read_only_fields = ['id', 'created_at']


class PopularSearchSerializer(serializers.ModelSerializer):
    """Búsquedas más populares (solo lectura)."""
    class Meta:
        model = PopularSearch
        fields = ['id', 'query', 'search_count', 'last_searched', 'is_active']
        read_only_fields = ['id', 'search_count', 'last_searched']


# ═══════════════════════════════════════════════════════════════════════
# Paginación del catálogo
# ═══════════════════════════════════════════════════════════════════════

class CatalogPagination(PageNumberPagination):
    """Paginación para el catálogo público — 20 elementos por página."""
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
                'filters': {
                    'type': 'object',
                    'properties': {
                        'categories': {'type': 'array'},
                        'sizes': {'type': 'array'},
                        'colors': {'type': 'array'},
                        'price_range': {'type': 'object'},
                    }
                },
                'popular_searches': {'type': 'array'},
            },
        }


# ═══════════════════════════════════════════════════════════════════════
# CatalogSearchSerializer — Búsqueda avanzada con filtros
# ═══════════════════════════════════════════════════════════════════════
class CatalogSearchSerializer(serializers.Serializer):
    """Valida y parsea parámetros de búsqueda del catálogo.
    
    Soporta multi-selección: category, size y color llegan como
    valores separados por comas (ej. ?category=4,2 o ?size=M,S)
    y se convierten a listas para aplicar OR dentro de cada faceta.
    """
    q = serializers.CharField(required=False, allow_blank=True)
    category = serializers.CharField(required=False, allow_blank=True)
    min_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    max_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    size = serializers.CharField(required=False, allow_blank=True)
    color = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    is_approved = serializers.BooleanField(required=False)
    has_stock = serializers.BooleanField(required=False)
    ordering = serializers.ChoiceField(
        required=False,
        choices=[
            'name', '-name', 'base_price', '-base_price',
            'created_at', '-created_at', 'popularity'
        ],
        default='-created_at'
    )
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100)

    def _parse_csv(self, value):
        """Convierte valores separados por comas en lista de strings."""
        if not value:
            return []
        return [v.strip() for v in str(value).split(',') if v.strip()]

    def validate(self, attrs):
        """Parsea category, size y color como listas para filtros multi-selección."""
        attrs['category'] = self._parse_csv(attrs.get('category'))
        attrs['size'] = self._parse_csv(attrs.get('size'))
        attrs['color'] = self._parse_csv(attrs.get('color'))
        return attrs
