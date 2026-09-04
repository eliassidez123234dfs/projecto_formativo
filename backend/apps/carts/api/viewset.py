"""
ViewSets del módulo de carritos.
CartViewSet: CRUD del carrito de compras para usuarios anónimos y autenticados.
  Soporta migración anónimo→autenticado, sincronización con MongoDB.
AdminCartViewSet: Vista administrativa para gestionar carritos y su conversión
  a pedidos (flujo completo de creación de orden con transacción atómica).
"""

from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.carts.models import Cart, CartItem
from apps.orders.models import Order, OrderItem
from apps.users.api.admin_viewset import AdminPermission
from apps.users.api.auth_backend import UsuarioJWTAuthentication
from apps.users.mongo_service import upsert_cart as mongo_upsert_cart, \
    get_cart as mongo_get_cart, merge_carts as mongo_merge_carts

from .serializers import CartAddSerializer, CartItemSerializer, CartSerializer, AdminCartListSerializer, AdminCartDetailSerializer


# ═══════════════════════════════════════════════════════════════════════
# CartViewSet: carrito de compras (público, anónimos y autenticados)
# ═══════════════════════════════════════════════════════════════════════


class CartViewSet(viewsets.ViewSet):
    """ViewSet del carrito de compras. Soporta usuarios anónimos (session_key)
    y autenticados (JWT/Session). Sincroniza con MongoDB para persistencia."""
    authentication_classes = [UsuarioJWTAuthentication, SessionAuthentication]
    permission_classes = [AllowAny]

    def _get_cart(self, request):
        """Obtiene o crea el carrito para el usuario/sesión actual.
        Si el usuario se autentica teniendo un carrito anónimo, lo migra
        automáticamente al carrito del usuario (_merge_into_user_cart)."""
        if request.user.is_authenticated:
            session_key = request.session.session_key
            if session_key:
                session_cart = Cart.objects.filter(session_key=session_key).first()
                if session_cart:
                    if session_cart.user_id == request.user.id:
                        return session_cart
                    self._merge_into_user_cart(session_cart, request.user)
            cart = Cart.objects.filter(user=request.user).first()
            if not cart:
                cart = Cart.objects.create(user=request.user, session_key=session_key)
            return cart
        # Usuario anónimo: carrito por session_key
        if not request.session.session_key:
            request.session.save()
        cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
        return cart

    def _merge_into_user_cart(self, session_cart, user):
        """Fusiona los items de un carrito anónimo en el carrito del usuario autenticado.
        Si el mismo producto+variante ya existe, suma cantidades.
        Luego elimina el carrito anónimo y sincroniza en MongoDB."""
        user_cart = Cart.objects.filter(user=user).first()
        if not user_cart:
            session_cart.user = user
            session_cart.save()
            return
        for item in session_cart.items.all():
            existing = user_cart.items.filter(product=item.product, variant=item.variant).first()
            if existing:
                existing.quantity += item.quantity
                existing.save()
            else:
                item.cart = user_cart
                item.save()
        session_cart.delete()
        # Sincronizar fusión en MongoDB
        mongo_merge_carts(user.id, session_cart.session_key)

    # Helper: sincronizar carrito con MongoDB tras cada modificación
    def _sync_cart_to_mongo(self, cart):
        """Envía el estado actual del carrito a MongoDB para persistencia
        y consultas desde el frontend/servicios externos."""
        mongo_upsert_cart(
            user_id=cart.user_id if hasattr(cart, 'user_id') else None,
            session_key=self.request.session.session_key,
            items=[{
                'product_id': i.product_id,
                'variant_id': i.variant_id,
                'product_name': i.product.name,
                'quantity': i.quantity,
                'unit_price': str(i.unit_price),
            } for i in cart.items.select_related('product').all()],
        )

    def list(self, request):
        """Retorna el carrito actual con todos sus items (cantidad, subtotal,
        total). Crea el carrito si no existe."""
        cart = self._get_cart(request)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add')
    def add(self, request):
        """Agrega un producto+variante al carrito. Si ya existe, incrementa
        la cantidad (validando stock disponible). Sincroniza con MongoDB."""
        cart = self._get_cart(request)
        serializer = CartAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        variant = serializer.validated_data['variant']
        quantity = serializer.validated_data['quantity']

        if quantity < 1:
            return Response({'quantity': 'La cantidad mínima permitida es 1.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity > variant.stock:
            return Response({'quantity': 'La cantidad no puede superar el stock disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={'quantity': quantity, 'unit_price': variant.effective_price},
        )

        if not created:
            new_quantity = item.quantity + quantity
            if new_quantity > variant.stock:
                return Response(
                    {'quantity': 'La cantidad no puede superar el stock disponible.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            item.quantity = new_quantity
            item.save()

        self._sync_cart_to_mongo(cart)
        return Response(CartItemSerializer(item, context={'request': request}).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['patch'], url_path='items/(?P<item_id>[^/.]+)/quantity')
    def update_quantity(self, request, item_id=None):
        """Actualiza la cantidad de un item específico en el carrito.
        Valida cantidad mínima 1 y stock disponible."""
        cart = self._get_cart(request)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        quantity = int(request.data.get('quantity', 1))

        if quantity < 1:
            return Response({'quantity': 'La cantidad mínima permitida es 1.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity > item.variant.stock:
            return Response({'quantity': 'La cantidad no puede superar el stock disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        item.quantity = quantity
        item.save()
        self._sync_cart_to_mongo(cart)
        return Response(CartItemSerializer(item, context={'request': request}).data)

    @action(detail=False, methods=['delete'], url_path='items/(?P<item_id>[^/.]+)/remove')
    def remove_item(self, request, item_id=None):
        """Elimina un item específico del carrito. Sincroniza con MongoDB."""
        cart = self._get_cart(request)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        item.delete()
        self._sync_cart_to_mongo(cart)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear(self, request):
        """Vacía todos los items del carrito actual. Sincroniza con MongoDB."""
        cart = self._get_cart(request)
        cart.items.all().delete()
        self._sync_cart_to_mongo(cart)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# AdminCartViewSet: gestión administrativa de carritos
# ═══════════════════════════════════════════════════════════════════════


class AdminCartViewSet(viewsets.ReadOnlyModelViewSet):
    """Vista administrativa para gestionar carritos y convertirlos en pedidos.
    Accesible solo para administradores (AdminPermission).
    El action status() ejecuta el flujo completo: carrito → orden (transacción atómica)."""
    permission_classes = [AdminPermission]
    pagination_class = PageNumberPagination
    serializer_class = AdminCartListSerializer

    def get_queryset(self):
        """Retorna todos los carritos con relaciones precargadas (items, user)."""
        return Cart.objects.prefetch_related('items__product', 'items__variant').select_related('user').all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        """Lista carritos con page_size configurable vía query param."""
        self.pagination_class.page_size = request.query_params.get('page_size', 20)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """Detalle completo de un carrito con todos sus items."""
        instance = self.get_object()
        serializer = AdminCartDetailSerializer(instance, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        """Cambia el estado de un carrito/pedido. Todo en una transacción atómica.

        Si el carrito NO tiene pedido asociado (cart.order is None):
          - Crea una nueva Order con los items del carrito.
          - Valida stock disponible para cada item.
          - Descuenta stock de cada variante.
          - Vacía los items del carrito y asocia la orden.
          - Si el estado es 'pagado', crea automáticamente un nuevo carrito vacío.

        Si el carrito YA tiene pedido asociado:
          - Actualiza el estado del pedido.
          - No permite modificar pedidos pagados o cancelados.
          - Si pasa a 'pagado', vacía items y crea nuevo carrito."""
        cart = self.get_object()
        nuevo_status = request.data.get('status')

        STATUS_MAP = dict(Order.STATUS_CHOICES)
        if not nuevo_status or nuevo_status not in STATUS_MAP:
            return Response({'error': f'Estado invalido. Opciones: {", ".join(STATUS_MAP.keys())}'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            if not cart.order_id:
                # ── Crear nuevo pedido desde el carrito ──
                items = list(cart.items.select_related('product', 'variant').all())
                if not items:
                    return Response({'error': 'El carrito esta vacio.'}, status=status.HTTP_400_BAD_REQUEST)

                order = Order.objects.create(
                    user=cart.user,
                    customer_name=cart.user.usuario if cart.user else 'Administrador',
                    customer_email=cart.user.correo if cart.user else '',
                    status=nuevo_status,
                    total=Decimal('0.00'),
                )

                running_total = Decimal('0.00')
                for item in items:
                    if item.quantity > item.variant.stock:
                        return Response(
                            {'error': f'Stock insuficiente para {item.product.name} ({item.variant.size}/{item.variant.color}).'},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    OrderItem.objects.create(
                        order=order,
                        product=item.product,
                        variant=item.variant,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                    )

                    # Descontar stock
                    item.variant.stock -= item.quantity
                    item.variant.save(update_fields=['stock'])
                    running_total += item.subtotal

                order.total = running_total
                order.save(update_fields=['total'])

                # Vaciar carrito y asociar orden
                cart.items.all().delete()
                cart.order = order
                cart.save(update_fields=['order'])

                # Si el estado es 'pagado', generar nuevo carrito vacío automáticamente
                if nuevo_status == Order.STATUS_PAID:
                    new_order = Order.objects.create(
                        user=cart.user,
                        customer_name=cart.user.usuario if cart.user else 'Administrador',
                        customer_email=cart.user.correo if cart.user else '',
                        status=Order.STATUS_PENDING,
                        total=Decimal('0.00'),
                    )
                    cart.order = new_order
                    cart.save(update_fields=['order'])
            else:
                # ── Actualizar estado de pedido existente ──
                order = cart.order

                if order.status == Order.STATUS_PAID:
                    return Response({'error': 'No se puede modificar un pedido pagado.'}, status=status.HTTP_400_BAD_REQUEST)

                if order.status == Order.STATUS_CANCELLED:
                    return Response({'error': 'Pedido cancelado. Use "Procesar nuevamente" para reactivarlo.'}, status=status.HTTP_400_BAD_REQUEST)

                order.status = nuevo_status
                order.save(update_fields=['status', 'updated_at'])

                if nuevo_status == Order.STATUS_PAID:
                    cart.items.all().delete()
                    new_order = Order.objects.create(
                        user=cart.user,
                        customer_name=cart.user.usuario if cart.user else 'Administrador',
                        customer_email=cart.user.correo if cart.user else '',
                        status=Order.STATUS_PENDING,
                        total=Decimal('0.00'),
                    )
                    cart.order = new_order
                    cart.save(update_fields=['order'])

        serializer = AdminCartDetailSerializer(cart, context={'request': request})
        return Response(serializer.data)


