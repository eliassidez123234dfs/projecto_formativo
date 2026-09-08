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
from apps.users.api.auth_backend import UsuarioJWTAuthentication


def _get_cart_from_session(request):
	if request.user.is_authenticated:
		session_key = request.session.session_key
		if session_key:
			session_cart = Cart.objects.filter(session_key=session_key).first()
			if session_cart:
				if session_cart.user_id == request.user.id:
					return session_cart
				_merge_into_user_cart(session_cart, request.user)
		cart = Cart.objects.filter(user=request.user).first()
		if not cart:
			cart = Cart.objects.create(user=request.user, session_key=session_key)
		return cart
	if not request.session.session_key:
		request.session.save()
	cart, _ = Cart.objects.get_or_create(session_key=request.session.session_key)
	return cart


def _merge_into_user_cart(session_cart, user):
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
@authentication_classes([UsuarioJWTAuthentication, SessionAuthentication])
@permission_classes([AllowAny])
def checkout_confirm(request):
	cart = _get_cart_from_session(request)
	items = list(cart.items.select_related('product', 'variant').all())
	if not items:
		return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

	customer_name = (request.data.get('customer_name') or '').strip()
	customer_email = (request.data.get('customer_email') or '').strip()
	shipping_address = (request.data.get('address') or request.data.get('shipping_address') or '').strip()
	shipping_city = (request.data.get('city') or request.data.get('shipping_city') or '').strip()
	shipping_department = (request.data.get('department') or '').strip()
	shipping_phone = (request.data.get('phone') or request.data.get('shipping_phone') or '').strip()
	shipping_zipcode = (request.data.get('postalCode') or request.data.get('shipping_zipcode') or '').strip()
	reference = (request.data.get('reference') or '').strip()

	# Validaciones estrictas
	errors = {}
	if not customer_name:
		errors['customer_name'] = 'El nombre completo es obligatorio.'

	# Validación estricta de correo real
	import re
	email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
	if not customer_email:
		errors['customer_email'] = 'El correo electrónico es obligatorio.'
	elif not re.match(email_pattern, customer_email):
		errors['customer_email'] = 'Ingrese un correo electrónico válido con formato nombre@dominio.com.'
	else:
		domain = customer_email.split('@')[-1].lower()
		fake_domains = ['test.com', 'ejemplo.com', 'example.com', 'correo.com', 'tempmail.com', 'mailinator.com', '123.com', 'fake.com']
		tld = domain.split('.')[-1]
		if domain in fake_domains or len(tld) < 2:
			errors['customer_email'] = 'El dominio del correo ingresado no es válido o es temporal. Por favor use un correo real.'

	if not shipping_address:
		errors['address'] = 'La dirección de entrega es obligatoria.'
	if not shipping_city:
		errors['city'] = 'La ciudad es obligatoria.'
	if not shipping_department:
		errors['department'] = 'El departamento es obligatorio.'

	if errors:
		return Response({'errors': errors, 'detail': next(iter(errors.values()))}, status=status.HTTP_400_BAD_REQUEST)

	full_city = f"{shipping_city}, {shipping_department}" if shipping_department else shipping_city
	full_address = f"{shipping_address} (Ref: {reference})" if reference else shipping_address

	with transaction.atomic():
		order = Order.objects.create(
			user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None,
			customer_name=customer_name,
			customer_email=customer_email,
			shipping_name=customer_name,
			shipping_email=customer_email,
			shipping_phone=shipping_phone,
			shipping_address=full_address,
			shipping_city=full_city,
			shipping_zipcode=shipping_zipcode,
			notes=reference if reference else '',
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

		# Generar automáticamente la factura (Invoice) asociada
		from apps.orders.models import Invoice
		Invoice.objects.get_or_create(
			order=order,
			defaults={
				'subtotal': running_total,
				'total': running_total,
			}
		)

		cart.items.all().delete()

	return Response(
		{
			'order_id': order.id,
			'order_number': order.order_number or f'ORD-{order.id:06d}',
			'status': order.status,
			'total': str(order.total),
			'detail': 'Orden creada exitosamente.',
		},
		status=status.HTTP_201_CREATED,
	)

