"""
ViewSets del módulo de productos.
ProductViewSet: CRUD completo con acciones personalizadas para gestión de imágenes,
variantes, publicación/aprobación, auditoría (SQL + MongoDB) y búsqueda avanzada.
ReviewViewSet: CRUD de reseñas filtradas por producto.

Requerimientos funcionales (RF) cubiertos:
  - RF-048: Búsqueda de productos con filtros combinables (search, price, active, approved).
  - RF-049: Publicación/aprobación de productos con checklist de requisitos.
  - RF-050: Gestión de imágenes (subir, reordenar, eliminar, marcar principal).
  - RF-051: Auditoría dual: ProductAudit (SQL) + log_event en MongoDB.
  - RF-052: Catálogo público con filtros avanzados (search action).
"""

from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.products.models import Product, ProductAudit, ProductImage, MotivoDesaprobacion, Review
from apps.users.mongo_service import log_event as mongo_log_event

from .review_serializers import ReviewSerializer
from .serializers import (
    CartItemSerializer,
    ProductAuditSerializer,
    ProductDetailSerializer,
    ProductImageCreateSerializer,
    ProductImageSerializer,
    ProductListSerializer,
    ProductPagination,
    ProductWriteSerializer,
    VariantCreateSerializer,
)


# ═══════════════════════════════════════════════════════════════════════
# ProductViewSet: CRUD + acciones personalizadas de producto
# ═══════════════════════════════════════════════════════════════════════


class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet principal de productos. Soporta CRUD con filtros, búsqueda,

    paginación, y acciones personalizadas para el ciclo de vida completo."""

    queryset = Product.objects.all().prefetch_related('images', 'variants', 'audit_entries')

    pagination_class = ProductPagination

    def get_queryset(self):
        """Filtra productos por: search (nombre/descripción), is_active,
        is_approved, min_price, max_price. Ordenación controlada por 'ordering'
        con lista blanca de campos permitidos."""
        queryset = super().get_queryset()
        params = self.request.query_params

        # ── Búsqueda textual (insensible a mayúsculas) ──
        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )

        # ── Filtros de estado ──
        is_active = params.get('is_active')
        if is_active in {'true', 'false'}:
            queryset = queryset.filter(is_active=is_active == 'true')

        is_approved = params.get('is_approved')
        if is_approved in {'true', 'false'}:
            queryset = queryset.filter(is_approved=is_approved == 'true')

        # ── Filtros de precio ──
        min_price = params.get('min_price')
        if min_price:
            queryset = queryset.filter(base_price__gte=min_price)

        max_price = params.get('max_price')
        if max_price:
            queryset = queryset.filter(base_price__lte=max_price)

        # ── Ordenación con lista blanca ──
        ordering = params.get('ordering', '-created_at')
        allowed_ordering = {
            'name', '-name', 'base_price', '-base_price', 
            'created_at', '-created_at', 'updated_at', '-updated_at',
            'is_active', '-is_active', 'is_approved', '-is_approved'
        }
        if ordering not in allowed_ordering:
            ordering = '-created_at'

        return queryset.order_by(ordering)

    def get_serializer_class(self):
        """Selecciona el serializer según la acción:
        - list → ProductListSerializer (resumido)
        - create/update/partial_update → ProductWriteSerializer (escritura)
        - retrieve/detail actions → ProductDetailSerializer (completo)"""
        if self.action == 'list':
            return ProductListSerializer
        if self.action in {'create', 'update', 'partial_update'}:
            return ProductWriteSerializer
        return ProductDetailSerializer

    def get_serializer_context(self):
        return super().get_serializer_context()

    def create(self, request, *args, **kwargs):
        """Crea un producto y registra auditoría dual:
        - ProductAudit en SQL con instantánea 'after' del producto creado.
        - mongo_log_event en MongoDB con metadatos (severity='info')."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        # ── Auditoría SQL ──
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_CREATED,
            actor=getattr(request.user, 'username', '') or 'anonymous',
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
        )
        # ── Auditoría MongoDB ──
        mongo_log_event(
            action='product.created',
            actor_id=getattr(request.user, 'id', None),
            target_type='product',
            target_id=str(product.id),
            metadata={'name': product.name},
            severity='info',
        )
        response_serializer = ProductDetailSerializer(product, context=self.get_serializer_context())
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Actualiza un producto con protección: si tiene pedidos activos,
        no permite cambiar el nombre. Registra auditoría dual con instantánea
        antes/después (before_data/after_data)."""
        product = self.get_object()
        before_data = ProductDetailSerializer(product, context=self.get_serializer_context()).data

        # Protección: no permitir renombrar si hay pedidos activos (pending/paid/processing).
        if product.has_active_order_items and 'name' in request.data:
            return Response(
                {'name': 'No se puede editar el nombre si existen pedidos activos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(product, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        # ── Auditoría SQL con instantáneas before/after ──
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_UPDATED,
            actor=getattr(request.user, 'username', '') or 'anonymous',
            before_data=before_data,
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
        )
        # ── Auditoría MongoDB ──
        mongo_log_event(
            action='product.updated',
            actor_id=getattr(request.user, 'id', None),
            target_type='product',
            target_id=str(product.id),
            metadata={'name': product.name, 'changed_fields': list(request.data.keys())},
            severity='info',
        )
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'images/(?P<image_id>\d+)')

    def manage_image(self, request, pk=None, image_id=None):
        """Endpoint unificado para actualizar o eliminar una imagen de producto.
        PATCH → actualiza order y/o is_main.
        DELETE → elimina la imagen; si era la principal, asigna la primera disponible."""
        if request.method == 'PATCH':
            return self._update_image(request, pk, image_id)
        return self._delete_image(request, pk, image_id)

    def _update_image(self, request, pk=None, image_id=None):
        """Actualiza orden (order) y/o marca como principal (is_main) de una imagen."""
        product = self.get_object()
        image = get_object_or_404(ProductImage, pk=image_id, product=product)

        order = request.data.get('order')
        is_main = request.data.get('is_main')

        if order not in {None, ''}:
            image.order = int(order)
        if is_main not in {None, ''}:
            image.is_main = str(is_main).lower() in {'true', '1', 'yes'}

        image.save()
        return Response(ProductImageSerializer(image, context={'request': request}).data)

    def _delete_image(self, request, pk=None, image_id=None):
        """Elimina una imagen. Si era la principal, asigna la primera imagen restante."""
        product = self.get_object()
        image = get_object_or_404(ProductImage, pk=image_id, product=product)

        was_main = image.is_main
        image.delete()

        if was_main:
            first_image = product.images.order_by('order', 'id').first()
            if first_image:
                first_image.is_main = True
                first_image.save(update_fields=['is_main'])

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['patch'], url_path='images/reorder')

    def reorder_images(self, request, pk=None):
        """Reordena las imágenes de un producto usando transacción atómica.
        Patrón: primero suma 1000 a todos los órdenes (evita conflictos UNIQUE),
        luego asigna los nuevos órdenes. Requiere enviar TODAS las imágenes."""
        product = self.get_object()
        items = request.data.get('items', [])
        if not isinstance(items, list) or not items:
            return Response({'items': 'Debe enviar una lista de imágenes.'}, status=status.HTTP_400_BAD_REQUEST)

        images = {str(image.id): image for image in product.images.all()}
        ids = [str(item.get('id')) for item in items]
        if set(ids) != set(images.keys()):
            return Response({'items': 'La lista debe incluir todas las imágenes del producto.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Primera pasada: desplazar órdenes para evitar violaciones de unique_constraint.
            for image in images.values():
                image.order = image.order + 1000
                image.save(update_fields=['order'])

            # Segunda pasada: asignar los nuevos órdenes.
            for item in items:
                image = images.get(str(item.get('id')))
                if image is None:
                    continue
                image.order = int(item.get('order', image.order))
                image.save(update_fields=['order'])

        ordered_images = product.images.order_by('order', 'id')
        return Response(ProductImageSerializer(ordered_images, many=True, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='toggle-active')

    def toggle_active(self, request, pk=None):
        """Activa/desactiva la visibilidad del producto en tienda.
        No requiere pasar por el flujo de aprobación completo."""
        product = self.get_object()
        product.is_active = not product.is_active
        product.save(update_fields=['is_active', 'updated_at'])
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['get'], url_path='checklist')

    def checklist(self, request, pk=None):
        """Retorna el checklist de requisitos del producto para publicación.
        Útil para mostrar al vendedor/revisor qué falta."""
        product = self.get_object()
        return Response(product.checklist)

    @action(detail=True, methods=['post'], url_path='publish')

    def publish(self, request, pk=None):
        """Publica un producto: requiere cumplir can_be_published (imagen principal
        + variante con stock). Establece is_active=True e is_approved=True.
        Registra dos entradas de auditoría (published + approved) y log en MongoDB."""
        product = self.get_object()
        if not product.can_be_published:
            return Response(
                {
                    'detail': 'El producto no cumple la configuración mínima.',
                    'checklist': product.checklist,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        product.is_active = True
        product.is_approved = True
        product.save()
        # ── Auditoría SQL: publicación ──
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_PUBLISHED,
            actor=getattr(request.user, 'username', '') or 'anonymous',
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
        )
        # ── Auditoría SQL: aprobación ──
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_APPROVED,
            actor=getattr(request.user, 'username', '') or 'anonymous',
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
        )
        # ── Auditoría MongoDB ──
        mongo_log_event(
            action='product.published',
            actor_id=getattr(request.user, 'id', None),
            target_type='product',
            target_id=str(product.id),
            metadata={'name': product.name},
            severity='info',
        )
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='disapprove')

    def disapprove(self, request, pk=None):
        """Desaprueba un producto: establece is_approved=False, guarda el motivo
        de rechazo (MotivoDesaprobacion), registra auditoría SQL y MongoDB.
        severity='warning' en MongoDB para alertar al equipo."""
        product = self.get_object()
        motivo = request.data.get('motivo', '').strip()
        if not motivo:
            return Response({'motivo': 'El motivo es requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(motivo) > 200:
            return Response({'motivo': 'El motivo no puede superar 200 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        product.is_approved = False
        product.save(update_fields=['is_approved', 'updated_at'])

        # ── Guardar motivo de rechazo ──
        MotivoDesaprobacion.objects.create(
            product=product,
            motivo=motivo,
            usuario_id_revisor=request.user if request.user.is_authenticated else None,
        )

        # ── Auditoría SQL ──
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_DISAPPROVED,
            actor=getattr(request.user, 'username', '') or 'anonymous',
            after_data={'motivo': motivo},
        )
        # ── Auditoría MongoDB (severity warning) ──
        mongo_log_event(
            action='product.disapproved',
            actor_id=getattr(request.user, 'id', None),
            target_type='product',
            target_id=str(product.id),
            metadata={'name': product.name, 'motivo': motivo},
            severity='warning',
        )
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['get', 'post'], url_path='images')

    def add_image(self, request, pk=None):
        """Agrega una imagen a un producto existente. Usa ProductImageCreateSerializer
        que valida el límite de 5 imágenes y los requisitos de formato/tamaño."""
        product = self.get_object()
        serializer = ProductImageCreateSerializer(data=request.data, context={'product': product, 'request': request})
        serializer.is_valid(raise_exception=True)
        image = serializer.save()
        return Response(ProductImageCreateSerializer(image, context={'product': product}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='variants')

    def add_variant(self, request, pk=None):
        """Agrega una variante (talla+color+stock) a un producto.
        Usa VariantCreateSerializer que valida los límites de 4 tallas y 10 colores."""
        product = self.get_object()
        serializer = VariantCreateSerializer(data=request.data, context={'product': product})
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()
        return Response(VariantCreateSerializer(variant, context={'product': product}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='audits')

    def audits(self, request, pk=None):
        """Retorna el historial completo de auditoría del producto
        (eventos created/updated/published/approved/disapproved)."""
        product = self.get_object()
        serializer = ProductAuditSerializer(product.audit_entries.all(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add-to-cart')

    def add_to_cart(self, request):
        """Agrega un producto al carrito directamente desde el catálogo o editor 3D.
        Prioriza carrito del usuario autenticado; si no, usa la sesión anónima.
        Si el item ya existe, incrementa la cantidad (valida contra stock disponible)."""
        from apps.carts.models import Cart, CartItem

        serializer = CartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        product = serializer.validated_data['product']
        variant = serializer.validated_data['variant']
        quantity = serializer.validated_data['quantity']
        
        # Priorizar carrito del usuario autenticado sobre el de sesión
        user = request.user
        if user.is_authenticated:
            cart, _ = Cart.objects.get_or_create(usuario=user)
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            cart, _ = Cart.objects.get_or_create(session_key=session_key)
        
        # Verificar si ya existe el item en el carrito
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={'quantity': quantity, 'unit_price': product.base_price}
        )
        
        if not created:
            new_quantity = cart_item.quantity + quantity
            if new_quantity > variant.stock:
                return Response(
                    {'error': 'La cantidad total supera el stock disponible.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            cart_item.quantity = new_quantity
            cart_item.save()
        
        return Response({
            'message': 'Producto agregado al carrito',
            'cart_items': cart.total_items,
            'cart_total': str(cart.total_amount),
            'item_quantity': cart_item.quantity
        })

    @action(detail=False, methods=['get'], url_path='search')

    def search(self, request):
        """Búsqueda avanzada con filtros combinables (RF-052).
        Busca en nombre, descripción, talla y color. Filtros adicionales:
        is_active, is_approved, min_price, max_price, has_images, has_stock.
        Retorna resultados paginados con ProductListSerializer."""
        queryset = self.get_queryset()
        
        # ── Búsqueda textual en múltiples campos ──
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(variants__size__icontains=search) |
                Q(variants__color__icontains=search)
            ).distinct()
        
        # ── Filtros combinables ──
        filters = {
            'is_active': request.query_params.get('is_active'),
            'is_approved': request.query_params.get('is_approved'),
            'min_price': request.query_params.get('min_price'),
            'max_price': request.query_params.get('max_price'),
            'has_images': request.query_params.get('has_images'),
            'has_stock': request.query_params.get('has_stock'),
        }
        
        if filters['is_active'] in {'true', 'false'}:
            queryset = queryset.filter(is_active=filters['is_active'] == 'true')
        
        if filters['is_approved'] in {'true', 'false'}:
            queryset = queryset.filter(is_approved=filters['is_approved'] == 'true')
        
        if filters['min_price']:
            try:
                queryset = queryset.filter(base_price__gte=float(filters['min_price']))
            except ValueError:
                pass
        
        if filters['max_price']:
            try:
                queryset = queryset.filter(base_price__lte=float(filters['max_price']))
            except ValueError:
                pass
        
        if filters['has_images'] == 'true':
            queryset = queryset.filter(images__isnull=False).distinct()
        
        if filters['has_stock'] == 'true':
            queryset = queryset.filter(variants__stock__gt=0).distinct()
        
        # ── Paginación ──
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def manage_images(self, request, pk=None):
        product = self.get_object()
        if request.method == 'GET':
            serializer = ProductImageSerializer(product.images.all(), many=True, context={'request': request})
            return Response(serializer.data)
        serializer = ProductImageCreateSerializer(data=request.data, context={'product': product, 'request': request})
        serializer.is_valid(raise_exception=True)
        image = serializer.save()
        return Response(ProductImageCreateSerializer(image, context={'product': product}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='variants')


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet para reseñas de productos. Filtrable por product_id.
    El usuario se asigna automáticamente desde request.user al crear."""
    queryset = Review.objects.select_related('user').all()
    serializer_class = ReviewSerializer

    def get_queryset(self):
        """Filtra reseñas por producto si se pasa el parámetro 'product'."""
        qs = super().get_queryset()
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(product_id=product_id)
        return qs

    def perform_create(self, serializer):
        """Asigna automáticamente el usuario autenticado a la reseña."""
        serializer.save(user=self.request.user)

# ═══════════════════════════════════════════════════════════════════════
# ProductImageViewSet: Listado y eliminación de imágenes Cloudinary
# ═══════════════════════════════════════════════════════════════════════

class ProductImageViewSet(viewsets.ModelViewSet):
    """ViewSet para consultar y eliminar imágenes de productos (Cloudinary)."""
    queryset = ProductImage.objects.all().select_related('product').order_by('product', 'order')
    serializer_class = ProductImageSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return []
        from rest_framework.permissions import IsAuthenticated
        return [IsAuthenticated()]

    def perform_destroy(self, instance):
        super().perform_destroy(instance)
