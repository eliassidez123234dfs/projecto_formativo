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
            'min_price', 'max_price', 'total_stock', 'categories', 'created_at', 'updated_at'
        ]

    def get_main_image(self, obj):
        image = obj.main_image
        if not image:
            return None
        request = self.context.get('request')
        url = image.image_url
        return request.build_absolute_uri(url) if request else url

    def get_available_sizes(self, obj):
        return list(obj.variants.filter(stock__gt=0).values_list('size', flat=True).distinct())

    def get_available_colors(self, obj):
        return list(obj.variants.filter(stock__gt=0).values_list('color', flat=True).distinct())

    def get_color_hexes(self, obj):
        return dict(obj.variants.filter(stock__gt=0).values_list('color', 'color_hex').distinct())

    def get_variants(self, obj):
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
        variants = list(obj.variants.filter(stock__gt=0))
        if not variants:
            return obj.base_price
        return min(variant.effective_price for variant in variants)

    def get_max_price(self, obj):
        variants = list(obj.variants.filter(stock__gt=0))
        if not variants:
            return obj.base_price
        return max(variant.effective_price for variant in variants)

    def get_total_stock(self, obj):
        return obj.total_stock

    def get_categories(self, obj):
        return [pc.category.name for pc in obj.categories.all()]


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
