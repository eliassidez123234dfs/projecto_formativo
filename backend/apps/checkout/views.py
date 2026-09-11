"""
Vistas del Checkout — Proceso de compra y generación de facturas.

Proporciona endpoints para:
  - Resumen del carrito antes de confirmar el pedido.
  - Confirmación del checkout con validación de datos y reducción de stock.
  - Descarga de factura PDF con firma de acceso temporal.

Patrón de diseño: Function-Based Views (FBV) con decoradores DRF.
El checkout usa transacciones atómicas para garantizar integridad
(carrito → orden → ítems → stock → factura en una sola operación).
"""
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
from apps.users.api.auth_backend import UsuarioJWTAuthentication
from .utils import generate_order_invoice_pdf
from .wompi import create_transaction

# Firmante para URLs de descarga de factura (token temporal de 1 hora)
invoice_signer = TimestampSigner(salt='order-invoice')


# ═══════════════════════════════════════════════════════════════════════
# Funciones auxiliares — Resolución de carrito
# ═══════════════════════════════════════════════════════════════════════

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
	"""Fusiona carrito de sesión anónimo en el carrito del usuario autenticado."""
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


# ═══════════════════════════════════════════════════════════════════════
# Resumen del checkout — GET /api/checkout/summary/
# ═══════════════════════════════════════════════════════════════════════
@api_view(['GET'])
@authentication_classes([UsuarioJWTAuthentication, SessionAuthentication])
@permission_classes([AllowAny])
def checkout_summary(request):
	"""Retorna el resumen del carrito actual para mostrar antes de confirmar.
	Accesible tanto para usuarios anónimos como autenticados."""
	cart = _get_cart_from_session(request)
	items_payload = []
	for item in cart.items.select_related('product', 'variant').all():
		prod_name = "Camiseta Estampado Personalizado" if (item.design_preview_url or bool(item.design_data)) else item.product.name
		items_payload.append(
			{
				'id': item.id,
				'product_name': prod_name,
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


# ═══════════════════════════════════════════════════════════════════════
# Confirmación del checkout — POST /api/checkout/confirm/
# ═══════════════════════════════════════════════════════════════════════
@api_view(['POST'])
@authentication_classes([UsuarioJWTAuthentication, SessionAuthentication])
@permission_classes([AllowAny])
def checkout_confirm(request):
	"""
	Finaliza el pedido (checkout).
	Valida datos de contacto y entrega del cliente (incluyendo datos de Colombia).
	Disminuye el stock del producto según la cantidad comprada.
	Registra la orden en estado 'pendiente' y genera la factura asociada.
	Retorna la información del pedido y la URL de descarga de la factura.
	"""
	cart = _get_cart_from_session(request)
	items = list(cart.items.select_related('product', 'variant').all())
	if not items:
		return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

	data = request.data or {}
	customer_name = (data.get('customer_name') or '').strip()
	customer_email = (data.get('customer_email') or '').strip()
	shipping_address = (data.get('address') or data.get('shipping_address') or '').strip()
	shipping_city = (data.get('city') or data.get('shipping_city') or '').strip()
	shipping_department = (data.get('department') or '').strip()
	shipping_phone = (data.get('phone') or data.get('shipping_phone') or '').strip()
	shipping_zipcode = (data.get('postalCode') or data.get('postal_code') or data.get('shipping_zipcode') or '').strip()
	reference = (data.get('reference') or '').strip()

	# Validaciones de los datos ingresados
	errors = {}
	if not customer_name:
		errors['customer_name'] = 'El nombre completo es requerido.'
	elif len(customer_name) < 3:
		errors['customer_name'] = 'El nombre debe tener al menos 3 caracteres.'

	email_pattern = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
	if not customer_email:
		errors['customer_email'] = 'El correo electrónico es requerido.'
	elif not re.match(email_pattern, customer_email):
		errors['customer_email'] = 'Por favor ingresa un correo electrónico válido.'

	if not shipping_address:
		errors['address'] = 'La dirección de entrega es requerida.'
	if not shipping_city:
		errors['city'] = 'La ciudad es requerida.'
	if not shipping_department:
		errors['department'] = 'El departamento es requerido.'

	if errors:
		return Response({'errors': errors, 'detail': next(iter(errors.values()))}, status=status.HTTP_400_BAD_REQUEST)

	full_city = f"{shipping_city}, {shipping_department}" if shipping_department else shipping_city
	full_address = f"{shipping_address} (Ref: {reference})" if reference else shipping_address

	matched_user = None
	if getattr(request, 'user', None) and request.user.is_authenticated:
		matched_user = request.user
	elif customer_email:
		from apps.users.models import Usuario
		matched_user = Usuario.objects.filter(correo__iexact=customer_email).first()

	custom_image_url = None
	custom_design_color = None
	for item in items:
		if getattr(item, 'design_preview_url', None):
			custom_image_url = item.design_preview_url
			custom_design_color = getattr(item.variant, 'color', '')
			break

	with transaction.atomic():
		order = Order.objects.create(
			user=matched_user,
			customer_name=customer_name,
			customer_email=customer_email,
			shipping_name=customer_name,
			shipping_email=customer_email,
			shipping_phone=shipping_phone,
			shipping_address=full_address,
			shipping_city=full_city,
			shipping_zipcode=shipping_zipcode,
			image_url=custom_image_url,
			design_color=custom_design_color,
			status=Order.STATUS_PENDING_VALIDATION,
			total=Decimal('0.00'),
			notes=reference if reference else 'Tipo: Orden de demostración',
		)

		running_total = Decimal('0.00')
		for item in items:
			# Validar stock disponible con bloqueo para evitar race condition
			variant = item.variant.__class__.objects.select_for_update().get(pk=item.variant.pk)
			if item.quantity > variant.stock:
				return Response(
					{'detail': f'Stock insuficiente para {item.product.name} ({variant.size}/{variant.color}). Disponible: {variant.stock}.'},
					status=status.HTTP_400_BAD_REQUEST,
				)

			# Crear ítem de la orden
			OrderItem.objects.create(
				order=order,
				product=item.product,
				variant=variant,
				quantity=item.quantity,
				unit_price=item.unit_price,
			)

			# Disminuir el inventario del producto
			variant.stock -= item.quantity
			variant.save(update_fields=['stock'])
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

		# Vaciar el carrito de la sesión
		cart.items.all().delete()

	return Response(
		{
			'order_id': order.id,
			'order_number': order.order_number or f'ORD-{order.id:06d}',
			'status': order.status,
			'status_display': 'Pendiente de Validación',
			'total': str(order.total),
			'customer_name': order.customer_name,
			'customer_email': order.customer_email,
			'download_pdf_url': f'/api/checkout/orders/{order.id}/invoice-pdf/?access={invoice_signer.sign(order.id)}',
			'detail': '¡Pedido registrado con éxito para validación! Nuestro equipo de administración revisará la viabilidad del diseño. Una vez aprobado, podrás proceder con el pago.',
		},
		status=status.HTTP_201_CREATED,
	)


@api_view(['POST'])
@authentication_classes([UsuarioJWTAuthentication, SessionAuthentication])
@permission_classes([AllowAny])
def create_wompi_payment(request, order_id):
	"""Tokeniza una tarjeta en Wompi y crea su transacción sandbox.
	
	Solo permite pago si la orden ha sido aprobada por un administrador.
	El backend recibe únicamente el token de tarjeta; nunca recibe PAN, CVC
	ni fecha de vencimiento.
	"""
	order = get_object_or_404(Order, pk=order_id)
	if request.user.is_authenticated and order.user_id not in (None, request.user.id):
		return Response({'detail': 'No tienes permiso para pagar esta orden.'}, status=status.HTTP_403_FORBIDDEN)
	if order.status != Order.STATUS_APPROVED:
		return Response({'detail': f'El pago solo está disponible después de aprobación. Estado actual: {order.status}'}, status=status.HTTP_400_BAD_REQUEST)

	card_token = (request.data.get('card_token') or '').strip()
	if not card_token:
		return Response({'detail': 'Falta el token de tarjeta de Wompi.'}, status=status.HTTP_400_BAD_REQUEST)

	result = create_transaction(
		amount=order.total,
		reference=order.order_number or f'ORD-{order.id:06d}',
		customer_email=order.customer_email,
		redirect_url=request.data.get('redirect_url') or '',
		customer_full_name=order.customer_name,
		customer_phone=order.shipping_phone,
		card_token=card_token,
	)
	if not result:
		return Response({'detail': 'Wompi no pudo crear la transacción de prueba.'}, status=status.HTTP_502_BAD_GATEWAY)

	transaction_data = result.get('data', {})
	order.payment_transaction_id = transaction_data.get('id')
	order.payment_reference = transaction_data.get('reference')
	order.payment_wompi_status = transaction_data.get('status')
	order.payment_rejection_reason = transaction_data.get('status_message')
	order.save(update_fields=[
		'payment_transaction_id', 'payment_reference', 'payment_wompi_status',
		'payment_rejection_reason', 'updated_at',
	])
	return Response({
		'transaction_id': transaction_data.get('id'),
		'reference': transaction_data.get('reference'),
		'status': transaction_data.get('status'),
		'status_message': transaction_data.get('status_message'),
	}, status=status.HTTP_201_CREATED)


# ═══════════════════════════════════════════════════════════════════════
# Descarga de factura PDF — GET /api/checkout/orders/<id>/invoice-pdf/
# ═══════════════════════════════════════════════════════════════════════
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def download_order_invoice_pdf(request, order_id):
	"""Genera y entrega la factura PDF para descarga.
	
	Control de acceso:
	  - Propietario de la orden (autenticado).
	  - Administrador (autenticado).
	  - Invitado con token temporal válido (1 hora).
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
