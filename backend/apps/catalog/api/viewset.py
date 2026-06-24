from __future__ import annotations

from django.db.models import Q, Count, Min, Max
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.catalog.models import Category, PopularSearch, SearchHistory
from apps.products.models import Product

from .serializers import (
    CatalogPagination,
    CatalogProductSerializer,
    CatalogSearchSerializer,
    CategorySerializer,
    PopularSearchSerializer,
    SearchHistorySerializer,
)


class CatalogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Product.objects.filter(is_active=True, is_approved=True).prefetch_related(
        'images', 'variants', 'categories'
    )
    pagination_class = CatalogPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        serializer = CatalogSearchSerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        # Búsqueda parcial insensible a mayúsculas
        if params.get('q'):
            query = params['q'].strip()
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(variants__size__icontains=query) |
                Q(variants__color__icontains=query) |
                Q(categories__category__name__icontains=query)
            ).distinct()

        # Filtros
        if params.get('category'):
            queryset = queryset.filter(categories__category_id=params['category'])

        if params.get('min_price'):
            queryset = queryset.filter(base_price__gte=params['min_price'])

        if params.get('max_price'):
            queryset = queryset.filter(base_price__lte=params['max_price'])

        if params.get('size'):
            queryset = queryset.filter(variants__size__iexact=params['size'])

        if params.get('color'):
            queryset = queryset.filter(variants__color__iexact=params['color'])

        if params.get('has_stock'):
            queryset = queryset.filter(variants__stock__gt=0).distinct()

        # Ordenamiento
        ordering = params.get('ordering', '-created_at')
        if ordering == 'popularity':
            queryset = queryset.annotate(
                popularity=Count('cart_items')
            ).order_by('-popularity')
        else:
            queryset = queryset.order_by(ordering)

        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Guardar historial de búsqueda
        session_key = request.session.session_key
        if session_key and request.query_params.get('q'):
            SearchHistory.objects.create(
                session_key=session_key,
                query=request.query_params.get('q', ''),
                filters=dict(request.query_params),
                results_count=queryset.count()
            )
            
            # Registrar búsqueda popular
            PopularSearch.record_search(request.query_params.get('q', ''))

        # Paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CatalogProductSerializer(page, many=True, context={'request': request})
            
            # Obtener filtros disponibles
            filters_data = self.get_available_filters()
            
            # Búsquedas populares
            popular_searches = PopularSearch.objects.filter(is_active=True)[:10]
            popular_serializer = PopularSearchSerializer(popular_searches, many=True)
            
            response_data = self.get_paginated_response(serializer.data).data
            response_data['filters'] = filters_data
            response_data['popular_searches'] = popular_serializer.data
            
            return Response(response_data)

        serializer = CatalogProductSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = CatalogProductSerializer(instance, context={'request': request})
        return Response(serializer.data)

    def get_available_filters(self):
        """Obtener filtros disponibles para el catálogo"""
        queryset = self.get_queryset()
        
        # IDs de productos actualmente en el queryset
        product_ids = queryset.values_list('id', flat=True)
        
        # Categorías disponibles a través del modelo intermedio (related_name='products')
        categories = Category.objects.filter(
            is_active=True,
            products__product__in=product_ids
        ).distinct()
        
        # Tallas disponibles
        sizes = queryset.filter(
            variants__stock__gt=0
        ).values_list('variants__size', flat=True).distinct()
        
        # Colores disponibles
        colors = queryset.filter(
            variants__stock__gt=0
        ).values_list('variants__color', flat=True).distinct()
        
        # Rango de precios
        price_range = queryset.aggregate(
            min_price=Min('base_price'),
            max_price=Max('base_price')
        )
        
        return {
            'categories': CategorySerializer(categories, many=True).data,
            'sizes': list(set(sizes)),
            'colors': list(set(colors)),
            'price_range': {
                'min': float(price_range['min_price'] or 0),
                'max': float(price_range['max_price'] or 0)
            }
        }

    @action(detail=False, methods=['get'], url_path='filters')
    def filters(self, request):
        """Obtener filtros disponibles sin paginación"""
        return Response(self.get_available_filters())

    @action(detail=False, methods=['get'], url_path='popular-searches')
    def popular_searches(self, request):
        """Obtener búsquedas populares"""
        searches = PopularSearch.objects.filter(is_active=True)[:20]
        serializer = PopularSearchSerializer(searches, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='search-history')
    def search_history(self, request):
        """Obtener historial de búsqueda del usuario"""
        session_key = request.session.session_key
        if not session_key:
            return Response([])
        
        history = SearchHistory.objects.filter(session_key=session_key)[:50]
        serializer = SearchHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='featured')
    def featured(self, request):
        """Productos destacados (con stock e imágenes)"""
        queryset = self.get_queryset().filter(
            variants__stock__gt=0,
            images__isnull=False
        ).distinct().order_by('-created_at')[:12]
        
        serializer = CatalogProductSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='deals')
    def deals(self, request):
        """Productos en oferta (los más recientes con stock)"""
        queryset = self.get_queryset().filter(
            variants__stock__gt=0
        ).distinct().order_by('-created_at')[:8]
        
        serializer = CatalogProductSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer

    @action(detail=True, methods=['get'], url_path='products')
    def products(self, request, pk=None):
        """Obtener productos de una categoría específica"""
        category = self.get_object()
        products = Product.objects.filter(
            categories__category=category,
            is_active=True,
            is_approved=True
        ).prefetch_related('images', 'variants')
        
        # Aplicar filtros adicionales
        serializer = CatalogSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        if params.get('min_price'):
            products = products.filter(base_price__gte=params['min_price'])
        if params.get('max_price'):
            products = products.filter(base_price__lte=params['max_price'])
        if params.get('size'):
            products = products.filter(variants__size__iexact=params['size'])
        if params.get('color'):
            products = products.filter(variants__color__iexact=params['color'])
        if params.get('has_stock'):
            products = products.filter(variants__stock__gt=0).distinct()

        # Paginación
        paginator = CatalogPagination()
        page = paginator.paginate_queryset(products, request)
        if page is not None:
            serializer = CatalogProductSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = CatalogProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
