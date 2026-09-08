"""
ViewSet de Carrito — Gestión del carrito de compras.

Proporciona endpoints para:
  - Consulta del carrito actual (sesión anónima o usuario autenticado).
  - Agregar, actualizar cantidad y eliminar ítems.
  - Vaciar el carrito completo.
  - Panel de administración para gestionar carritos de usuarios.

Patrón de diseño: Session-based Cart (carrito por cookie de sesión).
El carrito se asocia a una sesión de Django; al hacer login, se fusiona
con el carrito del usuario (migración anónimo → autenticado).
"""
from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.carts.models import Cart, CartItem
from apps.users.api.admin_viewset import AdminPermission
from apps.users.api.auth_backend import UsuarioJWTAuthentication

from .serializers import CartAddSerializer, CartItemSerializer, CartSerializer, AdminCartListSerializer, AdminCartDetailSerializer


# ═══════════════════════════════════════════════════════════════════════
# CartViewSet — Carrito de compras (sesión/usuario)
# ═══════════════════════════════════════════════════════════════════════
class CartViewSet(viewsets.ViewSet):
    """ViewSet del carrito con autenticación por sesión Django.
    
    Permite acceso anónimo (AllowAny) ya que el carrito se identifica
    por la cookie de sesión, no por JWT.
    """
    authentication_classes = [UsuarioJWTAuthentication, SessionAuthentication]
    permission_classes = [AllowAny]

    def _get_cart(self, request):
        """Resuelve el carrito del usuario actual.
        
        Lógica de resolución:
        1. Si está autenticado: busca carrito de sesión, fusiona si es necesario.
        2. Si es anónimo: crea o recupera carrito por session_key.
        """
        if request.user.is_authenticated:
            user_cart = Cart.objects.filter(user=request.user).first()
            session_key = request.session.session_key
            if session_key:
                session_cart = Cart.objects.filter(session_key=session_key).first()
                if session_cart:
                    if session_cart.user_id == request.user.id:
                        return session_cart
                    self._merge_into_user_cart(session_cart, request.user)
                    user_cart = Cart.objects.filter(user=request.user).first()
            if not user_cart:
                user_cart = Cart.objects.create(user=request.user, session_key=session_key)
            return user_cart
        if not request.session.session_key:
            request.session.save()
        cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
        return cart

    def _merge_into_user_cart(self, session_cart, user):
        """Fusiona el carrito de sesión anónimo en el carrito del usuario.
        Si ya existe un ítem duplicado, suma las cantidades."""
        user_cart = Cart.objects.filter(user=user).first()
        if not user_cart:
            session_cart.user = user
            session_cart.save()
            return
        for item in session_cart.items.all():
            existing = user_cart.items.filter(
                product=item.product,
                variant=item.variant,
                design_preview_url=item.design_preview_url,
            ).first()
            if existing:
                existing.quantity += item.quantity
                existing.save()
            else:
                item.cart = user_cart
                item.save()
        session_cart.delete()

    def _get_item_for_cart(self, request, item_id):
        """Resuelve un item aunque la sesión anónima haya cambiado tras login."""
        cart = self._get_cart(request)
        item = CartItem.objects.filter(pk=item_id, cart=cart).first()
        if item or not request.user.is_authenticated:
            return cart, item

        user_cart = Cart.objects.filter(user=request.user).first()
        if not user_cart:
            return cart, None
        return user_cart, CartItem.objects.filter(pk=item_id, cart=user_cart).first()

    # ── Consulta del carrito ──
    def list(self, request):
        """Retorna el carrito actual con todos sus ítems."""
        cart = self._get_cart(request)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    # ── Agregar ítem al carrito ──
    @action(detail=False, methods=['post'], url_path='add')
    def add(self, request):
        """Agrega un producto/variante al carrito.
        Si ya existe, suma la cantidad. Valida stock disponible."""
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

        return Response(CartItemSerializer(item, context={'request': request}).data, status=status.HTTP_201_CREATED)

    # ── Actualizar cantidad de un ítem ──
    @action(detail=False, methods=['patch'], url_path='items/(?P<item_id>[^/.]+)/quantity')
    def update_quantity(self, request, item_id=None):
        """Actualiza la cantidad de un ítem específico. Valida rango 1-999 y stock."""
        cart, item = self._get_item_for_cart(request, item_id)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)

        raw_qty = request.data.get('quantity', 1)
        try:
            quantity = int(raw_qty)
        except (TypeError, ValueError):
            return Response({'quantity': 'La cantidad debe ser un número entero.'}, status=status.HTTP_400_BAD_REQUEST)

        if quantity < 1:
            return Response({'quantity': 'La cantidad mínima permitida es 1.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity > 999:
            return Response({'quantity': 'La cantidad máxima permitida es 999.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity > item.variant.stock:
            return Response({'quantity': 'La cantidad no puede superar el stock disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        item.quantity = quantity
        item.save()
        return Response(CartItemSerializer(item, context={'request': request}).data)

    # ── Eliminar un ítem del carrito ──
    @action(detail=False, methods=['delete'], url_path='items/(?P<item_id>[^/.]+)/remove')
    def remove_item(self, request, item_id=None):
        """Elimina un ítem específico del carrito."""
        cart, item = self._get_item_for_cart(request, item_id)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Vaciar carrito completo ──
    @action(detail=False, methods=['delete'], url_path='clear')
    def clear(self, request):
        """Elimina todos los ítems del carrito."""
        cart = self._get_cart(request)
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ═══════════════════════════════════════════════════════════════════════
# AdminCartViewSet — Gestión de carritos por administrador
# ═══════════════════════════════════════════════════════════════════════
class AdminCartViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet de solo lectura para que los administradores consulten
    los carritos de los usuarios registrados."""
    permission_classes = [AdminPermission]
    pagination_class = PageNumberPagination
    serializer_class = AdminCartListSerializer

    def get_queryset(self):
        """Retorna solo carritos de usuarios reales (excluye anónimos/huérfanos)."""
        return (
            Cart.objects.filter(user__isnull=False, user__eliminado=False)
            .prefetch_related('items__product', 'items__variant')
            .select_related('user')
            .order_by('-created_at')
        )

    def list(self, request, *args, **kwargs):
        """Lista carritos con paginación configurable por query param."""
        self.pagination_class.page_size = request.query_params.get('page_size', 20)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        """Detalle de un carrito específico con todos sus ítems."""
        instance = self.get_object()
        serializer = AdminCartDetailSerializer(instance, context={'request': request})
        return Response(serializer.data)


