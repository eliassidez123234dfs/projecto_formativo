"""
ViewSets del módulo de catálogo.
CatalogViewSet: navegación pública del catálogo con búsqueda, filtros combinables,
  paginación, registro de sesión (RF-052), historial, búsquedas populares,
  productos destacados y ofertas.
CategoryViewSet: CRUD de categorías con action para listar productos por categoría.

RF-052: Patrón de búsqueda con filtros combinables:
  q (texto), category, min_price, max_price, size, color, has_stock, ordering.
  Los filtros se aplican mediante AND sobre el queryset base (is_active + is_approved).
"""

from __future__ import annotations

from django.db.models import Q, Count, Min, Max
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.catalog.models import CatalogSession, Category, PopularSearch, SearchHistory
from apps.products.models import Product
from apps.users.api.admin_viewset import AdminPermission
from config.cache_utils import cache_view_action

from .serializers import (
    CatalogPagination,
    CatalogProductSerializer,
    CatalogSearchSerializer,
    CategorySerializer,
    PopularSearchSerializer,
    SearchHistorySerializer,
)


# ═══════════════════════════════════════════════════════════════════════
# CatalogViewSet: navegación pública del catálogo (RF-052)
# ═══════════════════════════════════════════════════════════════════════


class CatalogViewSet(viewsets.ReadOnlyModelViewSet):
    """Catálogo público de productos. Solo muestra productos activos y aprobados.
    Soporta búsqueda textual, filtros combinables, ordenación, paginación,
    registro de sesión, historial y búsquedas populares."""
    queryset = Product.objects.filter(is_active=True, is_approved=True).prefetch_related(
        'images', 'variants', 'categories', 'categories__category'
    )
    pagination_class = CatalogPagination

    def get_queryset(self):
        """Aplica filtros combinables al queryset base (RF-052):
        - q: búsqueda textual en nombre, descripción, talla, color, categoría.
        - category: filtro por ID de categoría.
        - min_price / max_price: rango de precio.
        - size / color: filtro exacto (insensible a mayúsculas).
        - has_stock: solo productos con stock > 0.
        - ordering: '-created_at' (defecto), 'popularity' (por cantidad en carritos)."""
        queryset = super().get_queryset()
        serializer = CatalogSearchSerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        # ── Búsqueda textual (insensible a mayúsculas) ──
        if params.get('q'):
            query = params['q'].strip()
            queryset = queryset.filter(
                Q(name__icontains=query) |
                Q(description__icontains=query) |
                Q(variants__size__icontains=query) |
                Q(variants__color__icontains=query) |
                Q(categories__category__name__icontains=query)
            ).distinct()

        # ── Filtros combinables ──
        # category / size / color soportan multi-selección (CSV → lista).
        if params.get('category'):
            category_ids = [int(c) for c in params['category'] if c.strip().isdigit()]
            if category_ids:
                queryset = queryset.filter(categories__category_id__in=category_ids).distinct()

        if params.get('min_price'):
            queryset = queryset.filter(base_price__gte=params['min_price'])

        if params.get('max_price'):
            queryset = queryset.filter(base_price__lte=params['max_price'])

        if params.get('size'):
            size_q = Q()
            for size in params['size']:
                size_q |= Q(variants__size__iexact=size)
            queryset = queryset.filter(size_q).distinct()

        if params.get('color'):
            color_q = Q()
            for color in params['color']:
                color_q |= Q(variants__color__iexact=color)
            queryset = queryset.filter(color_q).distinct()

        if params.get('has_stock'):
            queryset = queryset.filter(variants__stock__gt=0).distinct()

        # ── Ordenamiento ──
        ordering = params.get('ordering', '-created_at')
        if ordering == 'popularity':
            queryset = queryset.annotate(
                popularity=Count('cartitem')
            ).order_by('-popularity')
        else:
            queryset = queryset.order_by(ordering)

        return queryset

    def list(self, request, *args, **kwargs):
        """Lista productos del catálogo aplicando filtros y paginación (RF-052).
        Efectos secundarios:
          - Crea CatalogSession para registrar la navegación.
          - Si hay búsqueda (q), guarda SearchHistory y actualiza PopularSearch.
        Retorna: productos paginados + filtros disponibles + búsquedas populares."""
        queryset = self.get_queryset()
        
        # ── Registrar sesión de catálogo (RF-052) ──
        session_key = request.session.session_key
        CatalogSession.objects.create(
            user=request.user if request.user.is_authenticated else None,
            session_key=session_key,
            products_viewed=queryset.count(),
        )
        
        # ── Guardar historial de búsqueda ──
        session_key = request.session.session_key
        if session_key and request.query_params.get('q'):
            SearchHistory.objects.create(
                session_key=session_key,
                query=request.query_params.get('q', ''),
                filters=dict(request.query_params),
                results_count=queryset.count()
            )
            
            # Registrar/actualizar búsqueda popular
            PopularSearch.record_search(request.query_params.get('q', ''))

        # ── Paginación ──
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = CatalogProductSerializer(page, many=True, context={'request': request})
            
            # Obtener filtros disponibles para el conjunto actual
            filters_data = self.get_available_filters()
            
            # Búsquedas populares (top 10)
            popular_searches = PopularSearch.objects.filter(is_active=True)[:10]
            popular_serializer = PopularSearchSerializer(popular_searches, many=True)
            
            response_data = self.get_paginated_response(serializer.data).data
            response_data['filters'] = filters_data
            response_data['popular_searches'] = popular_serializer.data
            
            return Response(response_data)

        serializer = CatalogProductSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @cache_view_action(timeout=300, prefix='catalog:retrieve')
    def retrieve(self, request, *args, **kwargs):
        """Detalle de un producto del catálogo."""
        instance = self.get_object()
        serializer = CatalogProductSerializer(instance, context={'request': request})
        return Response(serializer.data)

    def get_available_filters(self):
        """Calcula los filtros disponibles dinámicamente basados en el
        conjunto actual de productos (queryset filtrado). Retorna:
        - categories: categorías activas con productos en el conjunto.
        - sizes: tallas disponibles (con stock).
        - colors: colores disponibles (con stock).
        - price_range: precio mínimo y máximo del conjunto."""
        queryset = self.get_queryset()
        
        # IDs de productos actualmente en el queryset
        product_ids = queryset.values_list('id', flat=True)
        
        # Categorías disponibles a través del modelo intermedio ProductCategory
        categories = Category.objects.filter(
            is_active=True,
            products__product__in=product_ids
        ).distinct()
        
        # Tallas disponibles (solo con stock)
        sizes = queryset.filter(
            variants__stock__gt=0
        ).values_list('variants__size', flat=True).distinct()
        
        # Colores disponibles (solo con stock)
        colors = queryset.filter(
            variants__stock__gt=0
        ).values_list('variants__color', flat=True).distinct()
        
        # Rango de precios del conjunto actual
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
    @cache_view_action(timeout=600, prefix='catalog:filters')
    def filters(self, request):
        """Obtener filtros estáticos del catálogo completo (sin filtros activos).
        Los facets se cargan una sola vez al montar el frontend y nunca
        se recalculan en base a los filtros del usuario."""
        base_qs = Product.objects.filter(is_active=True, is_approved=True)

        product_ids = base_qs.values_list('id', flat=True)

        categories = Category.objects.filter(
            is_active=True,
            products__product__in=product_ids
        ).distinct()

        size_counts = (
            base_qs
            .filter(variants__stock__gt=0)
            .values('variants__size')
            .annotate(count=Count('id'))
            .order_by('variants__size')
        )

        color_counts = (
            base_qs
            .filter(variants__stock__gt=0)
            .values('variants__color')
            .annotate(count=Count('id'))
            .order_by('variants__color')
        )

        price_range = base_qs.aggregate(
            min_price=Min('base_price'),
            max_price=Max('base_price')
        )

        return Response({
            'categories': [
                {'id': c.id, 'name': c.name, 'product_count': c.products.count()}
                for c in categories
            ],
            'sizes': [
                {'value': s['variants__size'], 'count': s['count']}
                for s in size_counts if s['variants__size']
            ],
            'colors': [
                {'value': c['variants__color'], 'count': c['count']}
                for c in color_counts if c['variants__color']
            ],
            'price_range': {
                'min': float(price_range['min_price'] or 0),
                'max': float(price_range['max_price'] or 0)
            }
        })

    @action(detail=False, methods=['get'], url_path='popular-searches')
    @cache_view_action(timeout=600, prefix='catalog:popular')
    def popular_searches(self, request):
        """Retorna las búsquedas más populares (top 20) para sugerencias
        de autocompletado en el frontend."""
        searches = PopularSearch.objects.filter(is_active=True)[:20]
        serializer = PopularSearchSerializer(searches, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='search-history')
    def search_history(self, request):
        """Retorna el historial de búsquedas del usuario actual (por sesión).
        Útil para mostrar búsquedas recientes."""
        session_key = request.session.session_key
        if not session_key:
            return Response([])
        
        history = SearchHistory.objects.filter(session_key=session_key)[:50]
        serializer = SearchHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='featured')
    @cache_view_action(timeout=300, prefix='catalog:featured')
    def featured(self, request):
        """Productos destacados: activos, aprobados, con stock e imágenes.
        Limitado a los 12 más recientes. Para sección "Destacados" del frontend."""
        queryset = self.get_queryset().filter(
            variants__stock__gt=0,
            images__isnull=False
        ).distinct().order_by('-created_at')[:12]
        
        serializer = CatalogProductSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='deals')
    @cache_view_action(timeout=300, prefix='catalog:deals')
    def deals(self, request):
        """Productos en oferta: los 8 más recientes con stock disponible.
        Para sección "Ofertas" del frontend."""
        queryset = self.get_queryset().filter(
            variants__stock__gt=0
        ).distinct().order_by('-created_at')[:8]
        
        serializer = CatalogProductSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    """CRUD de categorías del catálogo. Action adicional products()
    para listar productos activos de una categoría con filtros."""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'products']:
            permission_classes = []
        else:
            permission_classes = [IsAuthenticated, AdminPermission]
        return [p() for p in permission_classes]

    @action(detail=True, methods=['get'], url_path='products')
    @cache_view_action(timeout=300, prefix='catalog:cat_products')
    def products(self, request, pk=None):
        """Retorna los productos activos y aprobados de una categoría específica.
        Acepta los mismos filtros que CatalogViewSet (min_price, max_price,
        size, color, has_stock) y aplica paginación."""
        category = self.get_object()
        products = Product.objects.filter(
            categories__category=category,
            is_active=True,
            is_approved=True
        ).prefetch_related('images', 'variants', 'categories__category')
        
        # ── Filtros adicionales sobre la categoría ──
        serializer = CatalogSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        params = serializer.validated_data

        if params.get('min_price'):
            products = products.filter(base_price__gte=params['min_price'])
        if params.get('max_price'):
            products = products.filter(base_price__lte=params['max_price'])
        if params.get('size'):
            size_q = Q()
            for size in params['size']:
                size_q |= Q(variants__size__iexact=size)
            products = products.filter(size_q).distinct()
        if params.get('color'):
            color_q = Q()
            for color in params['color']:
                color_q |= Q(variants__color__iexact=color)
            products = products.filter(color_q).distinct()
        if params.get('has_stock'):
            products = products.filter(variants__stock__gt=0).distinct()

        # ── Paginación ──
        paginator = CatalogPagination()
        page = paginator.paginate_queryset(products, request)
        if page is not None:
            serializer = CatalogProductSerializer(page, many=True, context={'request': request})
            return paginator.get_paginated_response(serializer.data)

        serializer = CatalogProductSerializer(products, many=True, context={'request': request})
        return Response(serializer.data)
