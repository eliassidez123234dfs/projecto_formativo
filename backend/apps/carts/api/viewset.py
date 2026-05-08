from __future__ import annotations

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.carts.models import Cart, CartItem

from .serializers import CartAddSerializer, CartItemSerializer, CartSerializer


class CartViewSet(viewsets.ViewSet):
    def _get_cart(self, request):
        if not request.session.session_key:
            request.session.save()
        cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
        return cart

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


