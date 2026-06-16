from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.carts.models import Cart
from apps.orders.models import Order, OrderItem


def _get_cart_from_session(request):
	if request.user.is_authenticated:
		if request.session.session_key:
			session_cart = Cart.objects.filter(session_key=request.session.session_key).first()
			if session_cart and session_cart.user_id != request.user.id:
				_merge_into_user_cart(session_cart, request.user)
		cart = Cart.objects.filter(user=request.user).first()
		if not cart:
			cart = Cart.objects.create(user=request.user)
		return cart
	if not request.session.session_key:
		request.session.save()
	cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
	return cart


def _merge_into_user_cart(session_cart, user):
	user_cart = Cart.objects.filter(user=user).first()
	if not user_cart:
		user_cart = Cart.objects.create(user=user)
	for item in session_cart.items.all():
		existing = user_cart.items.filter(product=item.product, variant=item.variant).first()
		if existing:
			existing.quantity += item.quantity
			existing.save()
		else:
			item.cart = user_cart
			item.save()
	session_cart.delete()


@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def checkout_summary(request):
	cart = _get_cart_from_session(request)
	items_payload = []
	for item in cart.items.select_related('product', 'variant').all():
		items_payload.append(
			{
				'id': item.id,
				'product_name': item.product.name,
				'variant': f'{item.variant.size} / {item.variant.color}',
				'quantity': item.quantity,
				'unit_price': str(item.unit_price),
				'subtotal': str(item.subtotal),
			}
		)

	return Response(
		{
			'items': items_payload,
			'total_items': cart.total_items,
			'total_amount': str(cart.total_amount),
		}
	)


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def checkout_confirm(request):
	cart = _get_cart_from_session(request)
	items = list(cart.items.select_related('product', 'variant').all())
	if not items:
		return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

	customer_name = (request.data.get('customer_name') or '').strip()
	customer_email = (request.data.get('customer_email') or '').strip()
	if not customer_name:
		return Response({'customer_name': 'El nombre del cliente es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

	with transaction.atomic():
		order = Order.objects.create(
			user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None,
			customer_name=customer_name,
			customer_email=customer_email,
			status=Order.STATUS_PENDING,
			total=Decimal('0.00'),
		)

		running_total = Decimal('0.00')
		for item in items:
			if item.quantity > item.variant.stock:
				return Response(
					{'detail': f'Stock insuficiente para {item.product.name} ({item.variant.size}/{item.variant.color}).'},
					status=status.HTTP_400_BAD_REQUEST,
				)

			OrderItem.objects.create(
				order=order,
				product=item.product,
				variant=item.variant,
				quantity=item.quantity,
				unit_price=item.unit_price,
			)

			item.variant.stock -= item.quantity
			item.variant.save(update_fields=['stock'])
			running_total += item.subtotal

		order.total = running_total
		order.save(update_fields=['total'])

		cart.items.all().delete()

	return Response(
		{
			'order_id': order.id,
			'status': order.status,
			'total': str(order.total),
			'detail': 'Orden creada exitosamente.',
		},
		status=status.HTTP_201_CREATED,
	)
