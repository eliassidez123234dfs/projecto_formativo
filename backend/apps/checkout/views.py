from __future__ import annotations

import re
from decimal import Decimal

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.carts.models import Cart
from apps.orders.models import Order, OrderItem
from .utils import generate_order_invoice_pdf

invoice_signer = TimestampSigner(salt='order-invoice')


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
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def checkout_confirm(request):
	"""
	Finaliza el pedido de prueba simulando el checkout.
	Valida los datos de contacto y entrega del cliente.
	Disminuye el stock del producto según la cantidad comprada.
	Registra la orden en estado 'pending' (Pendiente) para el administrador.
	Retorna la información del pedido y la URL para descargar el comprobante en PDF.
	"""
	cart = _get_cart_from_session(request)
	items = list(cart.items.select_related('product', 'variant').all())
	if not items:
		return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

	data = request.data or {}
	customer_name = (data.get('customer_name') or '').strip()
	customer_email = (data.get('customer_email') or '').strip()
	address = (data.get('address') or '').strip()
	city = (data.get('city') or '').strip()
	department = (data.get('department') or '').strip()
	postal_code = (data.get('postal_code') or '').strip()
	reference = (data.get('reference') or '').strip()

	# Validaciones estrictas de los datos ingresados
	errors = {}
	if not customer_name:
		errors['customer_name'] = 'El nombre completo es requerido.'
	elif len(customer_name) < 3:
		errors['customer_name'] = 'El nombre debe tener al menos 3 caracteres.'

	email_regex = r'^[\w\.-]+@[\w\.-]+\.\w+$'
	if not customer_email:
		errors['customer_email'] = 'El correo electrónico es requerido.'
	elif not re.match(email_regex, customer_email):
		errors['customer_email'] = 'Por favor ingresa un correo electrónico válido.'

	if not address:
		errors['address'] = 'La dirección de entrega es requerida.'

	if not city:
		errors['city'] = 'La ciudad es requerida.'

	if not department:
		errors['department'] = 'El departamento es requerido.'

	if errors:
		return Response({'errors': errors, 'detail': 'Por favor corrige los datos del formulario.'}, status=status.HTTP_400_BAD_REQUEST)

	# Formatear notas y detalles de envío para persistir en la orden
	notes_lines = [
		f"Dirección: {address}",
		f"Ciudad: {city}, {department}",
	]
	if postal_code:
		notes_lines.append(f"Cód. Postal: {postal_code}")
	if reference:
		notes_lines.append(f"Referencia: {reference}")
	notes_lines.append("Tipo: Orden de demostración (sin pasarela Wompi - pago pendiente)")
	notes_content = "\n".join(notes_lines)

	with transaction.atomic():
		# 1. Crear la orden con estado 'pending'
		order = Order.objects.create(
			user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None,
			customer_name=customer_name,
			customer_email=customer_email,
			status=Order.STATUS_PENDING,
			total=Decimal('0.00'),
			notes=notes_content,
		)

		running_total = Decimal('0.00')
		for item in items:
			# Validar stock disponible
			if item.quantity > item.variant.stock:
				return Response(
					{'detail': f'Stock insuficiente para {item.product.name} ({item.variant.size}/{item.variant.color}). Disponible: {item.variant.stock}.'},
					status=status.HTTP_400_BAD_REQUEST,
				)

			# Crear ítem de la orden
			OrderItem.objects.create(
				order=order,
				product=item.product,
				variant=item.variant,
				quantity=item.quantity,
				unit_price=item.unit_price,
			)

			# Disminuir el inventario del producto
			item.variant.stock -= item.quantity
			item.variant.save(update_fields=['stock'])
			running_total += item.subtotal

		order.total = running_total
		order.save(update_fields=['total'])

		# Vaciar el carrito de la sesión para permitir nuevas compras
		cart.items.all().delete()

	return Response(
		{
			'order_id': order.id,
			'status': order.status,
			'status_display': 'Pendiente',
			'total': str(order.total),
			'customer_name': order.customer_name,
			'customer_email': order.customer_email,
			'download_pdf_url': f'/api/checkout/orders/{order.id}/invoice-pdf/?access={invoice_signer.sign(order.id)}',
			'detail': '¡Pedido confirmado con éxito! Se ha registrado en estado pendiente y el stock fue actualizado.',
		},
		status=status.HTTP_201_CREATED,
	)


@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def download_order_invoice_pdf(request, order_id):
	"""
	Genera y entrega para descarga la factura personalizada en PDF para la orden especificada.
	"""
	order = get_object_or_404(Order.objects.prefetch_related('items__product', 'items__variant').select_related('user'), pk=order_id)
	user_is_owner = request.user.is_authenticated and order.user_id == request.user.id
	user_is_admin = request.user.is_authenticated and getattr(request.user, 'rol', None) == 'Administrador'
	access_token = request.GET.get('access', '')
	guest_access = False
	if access_token:
		try:
			guest_access = int(invoice_signer.unsign(access_token, max_age=60 * 60)) == order.id
		except (BadSignature, SignatureExpired, ValueError):
			guest_access = False
	if not (user_is_owner or user_is_admin or (order.user_id is None and guest_access)):
		return Response({'detail': 'No tienes permiso para descargar esta factura.'}, status=403)
	pdf_content = generate_order_invoice_pdf(order)

	response = HttpResponse(pdf_content, content_type='application/pdf')
	response['Content-Disposition'] = f'attachment; filename="Factura_Orden_{order.id}.pdf"'
	return response
