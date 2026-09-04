from __future__ import annotations

from rest_framework import serializers
from rest_framework.pagination import PageNumberPagination

from apps.catalog.models import Category, PopularSearch, SearchHistory
from apps.products.models import Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active', 'product_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'product_count', 'created_at', 'updated_at']


class CatalogProductSerializer(serializers.ModelSerializer):
    """Serializer del catálogo optimizado contra N+1 queries.

    Todas las relaciones se resuelven en UNA pasada en Python sobre las
    colecciones precargadas con `prefetch_related` (variants, images,
    categories, reviews). No se vuelve a consultar la BD por campo, lo que
    reduce drásticamente el tiempo de respuesta de la lista del catálogo."""
    main_image = serializers.SerializerMethodField()
    available_sizes = serializers.SerializerMethodField()
    available_colors = serializers.SerializerMethodField()
    color_hexes = serializers.SerializerMethodField()
    variants = serializers.SerializerMethodField()
    min_price = serializers.SerializerMethodField()
    max_price = serializers.SerializerMethodField()
    total_stock = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    stock_total = serializers.SerializerMethodField()
    variants_summary = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'base_price', 'is_active', 'is_approved',
            'main_image', 'available_sizes', 'available_colors', 'color_hexes', 'variants',
            'min_price', 'max_price', 'total_stock', 'stock_total', 'categories', 'variants_summary',
            'average_rating', 'total_reviews', 'created_at', 'updated_at'
        ]

    def _variants(self, obj):
        """Variantes precargadas (usa la caché de prefetch_related, sin SQL)."""
        return list(obj.variants.all())

    def _variants_with_stock(self, obj):
        """Variantes con stock > 0, derivadas de las precargadas."""
        return [v for v in self._variants(obj) if v.stock and v.stock > 0]

    def get_main_image(self, obj):
        images = list(obj.images.all())
        if not images:
            return None
        main = next((im for im in images if im.is_main), images[0])
        request = self.context.get('request')
        url = main.image_url
        return request.build_absolute_uri(url) if request else url

    def get_available_sizes(self, obj):
        return sorted({v.size for v in self._variants_with_stock(obj) if v.size})

    def get_available_colors(self, obj):
        return sorted({v.color for v in self._variants_with_stock(obj) if v.color})

    def get_color_hexes(self, obj):
        return {v.color: v.color_hex for v in self._variants_with_stock(obj) if v.color and v.color_hex}

    def get_variants(self, obj):
        return [
            {
                'id': variant.id,
                'size': variant.size,
                'color': variant.color,
                'color_hex': variant.color_hex,
                'stock': variant.stock,
            }
            for variant in sorted(self._variants(obj), key=lambda v: (v.size or '', v.color or ''))
        ]

    def get_min_price(self, obj):
        variants = self._variants_with_stock(obj)
        if not variants:
            return obj.base_price
        return min(variant.effective_price for variant in variants)

    def get_max_price(self, obj):
        variants = self._variants_with_stock(obj)
        if not variants:
            return obj.base_price
        return max(variant.effective_price for variant in variants)

    def get_total_stock(self, obj):
        return sum(v.stock or 0 for v in self._variants(obj))

    def get_stock_total(self, obj):
        return self.get_total_stock(obj)

    def get_categories(self, obj):
        return [pc.category.name for pc in obj.categories.all() if pc.category]

    def get_variants_summary(self, obj):
        sizes = {}
        colors = {}
        total = 0
        for variant in self._variants(obj):
            sizes[variant.size] = sizes.get(variant.size, 0) + (variant.stock or 0)
            colors[variant.color] = colors.get(variant.color, 0) + (variant.stock or 0)
            total += variant.stock or 0
        return {
            'sizes': sizes,
            'colors': colors,
            'total_stock': total,
        }

    def get_average_rating(self, obj):
        reviews = list(obj.reviews.all())
        if not reviews:
            return None
        return round(sum(r.rating for r in reviews) / len(reviews), 1)

    def get_total_reviews(self, obj):
        return len(list(obj.reviews.all()))


class SearchHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchHistory
        fields = ['id', 'query', 'filters', 'results_count', 'created_at']
        read_only_fields = ['id', 'created_at']


class PopularSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = PopularSearch
        fields = ['id', 'query', 'search_count', 'last_searched', 'is_active']
        read_only_fields = ['id', 'search_count', 'last_searched']


class CatalogPagination(PageNumberPagination):
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


class CatalogSearchSerializer(serializers.Serializer):
    q = serializers.CharField(required=False, allow_blank=True)
    category = serializers.IntegerField(required=False)
    min_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    max_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    size = serializers.CharField(required=False)
    color = serializers.CharField(required=False)
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
