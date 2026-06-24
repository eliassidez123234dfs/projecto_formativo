from __future__ import annotations

import json
import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.carts.models import Cart
from apps.checkout.models import TransactionLog
from apps.orders.models import Order, OrderItem

from .serializers import (
    CheckoutSummaryItemSerializer,
    PaymentInitSerializer,
    PaymentStatusSerializer,
    ShippingSerializer,
)
from .wompi import (
    create_transaction,
    get_public_key,
    get_transaction,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)


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
    items = cart.items.select_related('product', 'variant').all()
    serializer = CheckoutSummaryItemSerializer(items, many=True)

    return Response(
        {
            'items': serializer.data,
            'total_items': cart.total_items,
            'total_amount': str(cart.total_amount),
        }
    )


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def checkout_init(request):
    cart = _get_cart_from_session(request)
    items = list(cart.items.select_related('product', 'variant').all())

    if not items:
        return Response({'detail': 'El carrito está vacío.'}, status=status.HTTP_400_BAD_REQUEST)

    shipping_serializer = ShippingSerializer(data=request.data)
    if not shipping_serializer.is_valid():
        return Response(shipping_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    validated = shipping_serializer.validated_data

    with transaction.atomic():
        running_total = Decimal('0.00')
        for item in items:
            if item.quantity > item.variant.stock:
                return Response(
                    {'detail': f'Stock insuficiente para {item.product.name} ({item.variant.size}/{item.variant.color}).'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            running_total += item.subtotal

        order = Order.objects.create(
            user=request.user if getattr(request, 'user', None) and request.user.is_authenticated else None,
            customer_name=validated['shipping_name'],
            customer_email=validated['shipping_email'],
            status=Order.STATUS_PENDING,
            total=running_total,
            shipping_name=validated['shipping_name'],
            shipping_email=validated['shipping_email'],
            shipping_phone=validated['shipping_phone'],
            shipping_address=validated['shipping_address'],
            shipping_city=validated['shipping_city'],
            shipping_zipcode=validated['shipping_zipcode'],
        )

        for item in items:
            OrderItem.objects.create(
                order=order,
                product=item.product,
                variant=item.variant,
                quantity=item.quantity,
                unit_price=item.unit_price,
            )
            item.variant.stock -= item.quantity
            item.variant.save(update_fields=['stock'])

        cart.order = order
        cart.save(update_fields=['order'])
        cart.items.all().delete()

    return Response(
        {
            'order_id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'total': str(order.total),
            'detail': 'Pedido creado exitosamente.',
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(['POST'])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def create_payment(request):
    serializer = PaymentInitSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    order_id = serializer.validated_data['order_id']

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({'detail': 'Pedido no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

    if order.status != Order.STATUS_PENDING:
        return Response({'detail': 'El pedido ya fue procesado.'}, status=status.HTTP_400_BAD_REQUEST)

    if order.total <= 0:
        return Response({'detail': 'El total del pedido debe ser mayor a cero.'}, status=status.HTTP_400_BAD_REQUEST)

    redirect_url = settings.WOMPI_REDIRECT_URL
    reference = order.order_number

    result = create_transaction(
        amount=order.total,
        reference=reference,
        customer_email=order.shipping_email or order.customer_email,
        redirect_url=redirect_url,
        customer_full_name=order.shipping_name or order.customer_name,
        customer_phone=order.shipping_phone,
    )

    if not result or 'data' not in result:
        logger.error('Fallo al crear transaccion Wompi para orden %s', order.order_number)
        return Response(
            {'detail': 'No se pudo iniciar el pago. Intente nuevamente.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    transaction_data = result['data']
    transaction_id = transaction_data.get('id')
    payment_reference = transaction_data.get('reference')

    order.payment_transaction_id = transaction_id
    order.payment_reference = payment_reference
    order.payment_wompi_status = transaction_data.get('status', 'PENDING')
    order.save(update_fields=['payment_transaction_id', 'payment_reference', 'payment_wompi_status'])

    if 'redirect_url' in transaction_data:
        wompi_redirect = transaction_data['redirect_url']
    else:
        wompi_redirect = f"{settings.WOMPI_API_URL}/checkout/{transaction_id}"

    return Response(
        {
            'transaction_id': transaction_id,
            'redirect_url': wompi_redirect,
            'order_number': order.order_number,
            'total': str(order.total),
            'public_key': get_public_key(),
            'reference': reference,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['GET'])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def payment_status(request):
    serializer = PaymentStatusSerializer(data=request.query_params)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    reference = serializer.validated_data['reference']

    try:
        order = Order.objects.get(order_number=reference)
    except Order.DoesNotExist:
        try:
            order = Order.objects.get(payment_reference=reference)
        except Order.DoesNotExist:
            return Response({'detail': 'Referencia no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

    items_data = []
    for item in order.items.select_related('product', 'variant').all():
        items_data.append(
            {
                'product_name': item.product.name,
                'variant_label': f'{item.variant.size} / {item.variant.color}',
                'quantity': item.quantity,
                'unit_price': str(item.unit_price),
                'subtotal': str(item.subtotal),
            }
        )

    return Response(
        {
            'order_id': order.id,
            'order_number': order.order_number,
            'status': order.status,
            'total': str(order.total),
            'items': items_data,
            'shipping_name': order.shipping_name or order.customer_name,
            'shipping_email': order.shipping_email or order.customer_email,
            'shipping_phone': order.shipping_phone,
            'shipping_address': order.shipping_address,
            'shipping_city': order.shipping_city,
            'shipping_zipcode': order.shipping_zipcode,
            'payment_transaction_id': order.payment_transaction_id,
            'payment_reference': order.payment_reference,
            'payment_wompi_status': order.payment_wompi_status,
            'payment_confirmed_at': order.payment_confirmed_at.isoformat() if order.payment_confirmed_at else None,
            'payment_rejection_reason': order.payment_rejection_reason,
            'created_at': order.created_at.isoformat(),
        }
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def wompi_webhook(request):
    try:
        raw_body = request.body
        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError:
            return Response({'error': 'Invalid JSON'}, status=status.HTTP_400_BAD_REQUEST)

        signature_header = request.META.get('HTTP_X_SIGNATURE', '')
        if settings.WOMPI_WEBHOOK_SECRET:
            is_valid = verify_webhook_signature(raw_body, signature_header)
            if not is_valid:
                logger.warning('Webhook con firma invalida rechazado')
                TransactionLog.objects.create(
                    estado='INVALID_SIGNATURE',
                    evento='webhook - firma invalida',
                    raw_response=body,
                )
                return Response({'error': 'Invalid signature'}, status=status.HTTP_401_UNAUTHORIZED)

        event = body.get('event', '')
        data = body.get('data', {})
        transaction_data = data.get('transaction', data)

        transaction_id = transaction_data.get('id', '')
        transaction_reference = transaction_data.get('reference', '')
        wompi_status = transaction_data.get('status', '')
        amount_cents = transaction_data.get('amount_in_cents', None)
        valor_pagado = Decimal(str(amount_cents / 100)) if amount_cents else None

        if not transaction_reference:
            logger.warning('Webhook sin referencia')
            TransactionLog.objects.create(
                estado='MISSING_REFERENCE',
                evento=event,
                raw_response=body,
            )
            return Response({'error': 'Missing reference'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(order_number=transaction_reference)
        except Order.DoesNotExist:
            try:
                order = Order.objects.get(payment_reference=transaction_reference)
            except Order.DoesNotExist:
                logger.warning('Webhook: orden no encontrada para ref %s', transaction_reference)
                TransactionLog.objects.create(
                    reference_wompi=transaction_reference,
                    estado='ORDER_NOT_FOUND',
                    valor_pagado=valor_pagado,
                    evento=event,
                    raw_response=body,
                )
                return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        if order.status == Order.STATUS_PAID:
            logger.info('Webhook: orden %s ya esta pagada, ignorando', order.order_number)
            TransactionLog.objects.create(
                order=order,
                reference_wompi=transaction_reference,
                estado='ALREADY_PAID',
                valor_pagado=valor_pagado,
                evento=event,
                raw_response=body,
            )
            return Response({'status': 'already_processed'})

        if event == 'transaction.updated' or wompi_status:
            if wompi_status == 'APPROVED':
                order.status = Order.STATUS_PAID
                order.payment_wompi_status = 'APPROVED'
                order.payment_confirmed_at = transaction_data.get('created_at', None)
                from django.utils import timezone
                order.payment_confirmed_at = timezone.now()
                order.payment_rejection_reason = ''
                logger.info('Pago aprobado para orden %s (tx: %s)', order.order_number, transaction_id)
            elif wompi_status in ('DECLINED', 'REJECTED', 'ERROR', 'VOIDED'):
                order.status = Order.STATUS_CANCELLED
                order.payment_wompi_status = wompi_status
                rejection = transaction_data.get('status_message', '')
                status_detail = transaction_data.get('status_detail', '')
                order.payment_rejection_reason = rejection or status_detail or 'Pago rechazado'
                logger.info('Pago rechazado para orden %s: %s', order.order_number, order.payment_rejection_reason)

                with transaction.atomic():
                    for item in order.items.select_related('variant').all():
                        item.variant.stock += item.quantity
                        item.variant.save(update_fields=['stock'])
            else:
                order.payment_wompi_status = wompi_status

            order.save(
                update_fields=[
                    'status',
                    'payment_wompi_status',
                    'payment_confirmed_at',
                    'payment_rejection_reason',
                    'updated_at',
                ]
            )

            TransactionLog.objects.create(
                order=order,
                reference_wompi=transaction_reference,
                estado=wompi_status or event,
                valor_pagado=valor_pagado,
                evento=event,
                raw_response=body,
            )

        return Response({'status': 'received'})

    except Exception as exc:
        logger.error('Error procesando webhook Wompi: %s', exc, exc_info=True)
        return Response({'error': 'Internal error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
