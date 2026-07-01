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

from .serializers import CartAddSerializer, CartItemSerializer, CartSerializer, AdminCartListSerializer, AdminCartDetailSerializer


class CartViewSet(viewsets.ViewSet):
    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    def _get_cart(self, request):
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
        if not request.session.session_key:
            request.session.save()
        cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
        return cart

    def _merge_into_user_cart(self, session_cart, user):
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

    def list(self, request):
        cart = self._get_cart(request)
        serializer = CartSerializer(cart, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='add')
    def add(self, request):
        cart = self._get_cart(request)
        serializer = CartAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        variant = serializer.validated_data['variant']
        quantity = serializer.validated_data['quantity']

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            product=product,
            variant=variant,
            defaults={'quantity': quantity, 'unit_price': product.base_price},
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

    @action(detail=False, methods=['patch'], url_path='items/(?P<item_id>[^/.]+)/quantity')
    def update_quantity(self, request, item_id=None):
        cart = self._get_cart(request)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        quantity = int(request.data.get('quantity', 1))

        if quantity < 1:
            return Response({'quantity': 'La cantidad mínima permitida es 1.'}, status=status.HTTP_400_BAD_REQUEST)
        if quantity > item.variant.stock:
            return Response({'quantity': 'La cantidad no puede superar el stock disponible.'}, status=status.HTTP_400_BAD_REQUEST)

        item.quantity = quantity
        item.save()
        return Response(CartItemSerializer(item, context={'request': request}).data)

    @action(detail=False, methods=['delete'], url_path='items/(?P<item_id>[^/.]+)/remove')
    def remove_item(self, request, item_id=None):
        cart = self._get_cart(request)
        item = get_object_or_404(CartItem, pk=item_id, cart=cart)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['delete'], url_path='clear')
    def clear(self, request):
        cart = self._get_cart(request)
        cart.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminCartViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AdminPermission]
    pagination_class = PageNumberPagination
    serializer_class = AdminCartListSerializer

    def get_queryset(self):
        return Cart.objects.prefetch_related('items__product', 'items__variant').select_related('user').all().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        self.pagination_class.page_size = request.query_params.get('page_size', 20)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = AdminCartDetailSerializer(instance, context={'request': request})
        return Response(serializer.data)


