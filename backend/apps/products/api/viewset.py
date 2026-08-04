from __future__ import annotations

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils.timezone import now
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from apps.products.models import Product, ProductAudit, ProductImage, Variant

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
    VariantSerializer,
    VariantUpdateSerializer,
)


def _actor_name(request) -> str:
    """Nombre legible del usuario autenticado (Usuario custom o auth.User)."""
    user = getattr(request, 'user', None)
    if user is None or not getattr(user, 'is_authenticated', False):
        return 'anonymous'
    if hasattr(user, 'rol'):
        return getattr(user, 'usuario', '') or 'usuario'
    return getattr(user, 'username', '') or 'usuario'


def _resolve_creator(request):
    user = getattr(request, 'user', None)
    if user is None or not getattr(user, 'is_authenticated', False):
        return None
    if hasattr(user, 'rol'):
        return user
    return None


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().prefetch_related('images', 'variants', 'audit_entries')
    pagination_class = ProductPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        search = params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )

        is_active = params.get('is_active')
        if is_active in {'true', 'false'}:
            queryset = queryset.filter(is_active=is_active == 'true')

        is_approved = params.get('is_approved')
        if is_approved in {'true', 'false'}:
            queryset = queryset.filter(is_approved=is_approved == 'true')

        min_price = params.get('min_price')
        if min_price:
            queryset = queryset.filter(base_price__gte=min_price)

        max_price = params.get('max_price')
        if max_price:
            queryset = queryset.filter(base_price__lte=max_price)

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
        if self.action == 'list':
            return ProductListSerializer
        if self.action in {'create', 'update', 'partial_update'}:
            return ProductWriteSerializer
        return ProductDetailSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.kwargs.get('pk'):
            context['product'] = self.get_object()
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(creator=_resolve_creator(request))
        product = serializer.instance
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_CREATED,
            actor=_actor_name(request),
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
        )
        response_serializer = ProductDetailSerializer(product, context=self.get_serializer_context())
        headers = self.get_success_headers(response_serializer.data)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        product = self.get_object()
        before_data = ProductDetailSerializer(product, context=self.get_serializer_context()).data

        if product.has_active_order_items and 'name' in request.data:
            return Response(
                {'name': 'No se puede editar el nombre si existen pedidos activos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(product, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_UPDATED,
            actor=_actor_name(request),
            before_data=before_data,
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
        )
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'images/(?P<image_id>[0-9]+)')
    def update_image(self, request, pk=None, image_id=None):
        product = self.get_object()
        image = get_object_or_404(ProductImage, pk=image_id, product=product)

        if request.method == 'DELETE':
            was_main = image.is_main
            image.delete()

            if was_main:
                first_image = product.images.order_by('order', 'id').first()
                if first_image:
                    first_image.is_main = True
                    first_image.save(update_fields=['is_main'])

            return Response(status=status.HTTP_204_NO_CONTENT)

        order = request.data.get('order')
        is_main = request.data.get('is_main')

        if order not in {None, ''}:
            image.order = int(order)
        if is_main not in {None, ''}:
            image.is_main = str(is_main).lower() in {'true', '1', 'yes'}

        image.save()
        return Response(ProductImageSerializer(image, context={'request': request}).data)

    @action(detail=True, methods=['patch'], url_path='images/reorder')
    def reorder_images(self, request, pk=None):
        product = self.get_object()
        items = request.data.get('items', [])
        if not isinstance(items, list) or not items:
            return Response({'items': 'Debe enviar una lista de imágenes.'}, status=status.HTTP_400_BAD_REQUEST)

        images = {str(image.id): image for image in product.images.all()}
        ids = [str(item.get('id')) for item in items]
        if set(ids) != set(images.keys()):
            return Response({'items': 'La lista debe incluir todas las imágenes del producto.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            for image in images.values():
                image.order = image.order + 1000
                image.save(update_fields=['order'])

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
        product = self.get_object()
        product.is_active = not product.is_active
        product.save(update_fields=['is_active', 'updated_at'])
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['get'], url_path='checklist')
    def checklist(self, request, pk=None):
        product = self.get_object()
        return Response(product.checklist)

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
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
        product.approved_by = _resolve_creator(request)
        product.approved_at = now()
        product.save()
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_PUBLISHED,
            actor=_actor_name(request),
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
        )
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='disapprove')
    def disapprove(self, request, pk=None):
        """Desaprueba un producto con motivo, lo quita de la tienda (RF-044/045)."""
        product = self.get_object()
        motivo = (request.data.get('motivo') or request.data.get('reason') or '').strip()
        if not motivo:
            return Response({'motivo': 'El motivo de desaprobación es obligatorio.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(motivo) > 255:
            return Response({'motivo': 'El motivo no puede superar 255 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)

        before_data = ProductDetailSerializer(product, context=self.get_serializer_context()).data
        product.is_active = False
        product.is_approved = False
        product.approved_by = None
        product.approved_at = None
        product.save(update_fields=['is_active', 'is_approved', 'approved_by', 'approved_at', 'updated_at'])
        ProductAudit.objects.create(
            product=product,
            action=ProductAudit.ACTION_DISAPPROVED,
            actor=_actor_name(request),
            before_data=before_data,
            after_data=ProductDetailSerializer(product, context=self.get_serializer_context()).data,
            motivo=motivo,
        )
        return Response(ProductDetailSerializer(product, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='images')
    def add_image(self, request, pk=None):
        product = self.get_object()
        serializer = ProductImageCreateSerializer(data=request.data, context={'product': product, 'request': request})
        serializer.is_valid(raise_exception=True)
        image = serializer.save()
        return Response(ProductImageCreateSerializer(image, context={'product': product}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='variants')
    def add_variant(self, request, pk=None):
        product = self.get_object()
        serializer = VariantCreateSerializer(data=request.data, context={'product': product})
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()
        return Response(VariantSerializer(variant, context={'product': product}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch', 'delete'], url_path=r'variants/(?P<variant_id>[0-9]+)')
    def update_variant(self, request, pk=None, variant_id=None):
        """Edita (stock/precio/color) o elimina una variante (RF-040)."""
        product = self.get_object()
        variant = get_object_or_404(Variant, pk=variant_id, product=product)

        if request.method == 'DELETE':
            if variant.orderitem_set.filter(order__status__in={'pending', 'paid', 'processing'}).exists():
                return Response(
                    {'variant': 'No se puede eliminar una variante con pedidos activos.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            variant.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = VariantUpdateSerializer(variant, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        variant = serializer.save()
        return Response(VariantSerializer(variant, context={'product': product}).data)

    @action(detail=True, methods=['get'], url_path='audits')
    def audits(self, request, pk=None):
        product = self.get_object()
        serializer = ProductAuditSerializer(product.audit_entries.all(), many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add-to-cart')
    def add_to_cart(self, request):
        """Agregar producto al carrito desde catálogo o editor 3D"""
        serializer = CartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        product = serializer.validated_data['product']
        variant = serializer.validated_data['variant']
        quantity = serializer.validated_data['quantity']
        
        # Obtener o crear carrito (sesión o usuario)
        from apps.carts.models import Cart, CartItem
        
        session_key = request.session.session_key
        if not session_key:
            request.session.create()
            session_key = request.session.session_key
        
        cart, created = Cart.objects.get_or_create(session_key=session_key)
        
        # Verificar si ya existe el item en el carrito
        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={'quantity': quantity, 'unit_price': variant.effective_price}
        )
        
        if not created:
            # Actualizar cantidad si ya existe
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
        """Búsqueda avanzada con filtros combinables"""
        queryset = self.get_queryset()
        
        # Búsqueda parcial insensible a mayúsculas
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search) |
                Q(variants__size__icontains=search) |
                Q(variants__color__icontains=search)
            ).distinct()
        
        # Filtros combinables
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
        
        # Paginación
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = ProductListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)
