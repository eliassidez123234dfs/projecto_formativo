"""
ViewSet de Órdenes — Gestión de pedidos y facturación.

Proporciona endpoints para:
  - CRUD de órdenes con filtrado por usuario o administrador.
  - Consulta de pedidos propios del usuario autenticado.
  - Generación de parámetros de pago Wompi.
  - Simulación de pago en sandbox para pruebas.
  - Descarga de factura PDF.

Patrón de diseño: ModelViewSet con permisos por acción.
Los administradores ven todas las órdenes; los usuarios solo las propias.
"""
from django.db.models import Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .serializers import OrderSerializer, MyOrderSerializer
from apps.orders.models import Order
from apps.users.models import Usuario


class OrderViewSet(viewsets.ModelViewSet):
    """ViewSet de órdenes con permisos adaptativos y acciones de pago/facturación."""
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Admin ve todas las órdenes; usuarios solo las propias."""
        if getattr(self.request.user, 'rol', None) == 'Administrador':
            return self.queryset
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Asigna automáticamente el usuario autenticado a la orden."""
        serializer.save(user=self.request.user)

    # ── Creación de orden con mapeo camelCase/snake_case ──
    def create(self, request, *args, **kwargs):
        """Crea una orden. Mapea camelCase del frontend a snake_case del serializer.
        Si el usuario no está autenticado, intenta vincular por email."""
        data = request.data.copy()
        if 'imageUrl' in data and 'image_url' not in data:
            data['image_url'] = data.get('imageUrl')
        if 'cloudinaryPublicId' in data and 'cloudinary_public_id' not in data:
            data['cloudinary_public_id'] = data.get('cloudinaryPublicId')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)

        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            order = serializer.save(user=user)
        else:
            email = data.get('customer_email') or data.get('shipping_email')
            matched_user = Usuario.objects.filter(correo=email).first() if email else None
            order = serializer.save(user=matched_user) if matched_user else serializer.save()

        headers = self.get_success_headers(serializer.data)
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED, headers=headers)

    # ── Consulta de pedidos propios ──
    @action(detail=False, methods=['get'])
    def mis(self, request):
        """Retorna las órdenes del usuario autenticado (máx 50).
        Busca por usuario, email de cliente y email de envío para cubrir
        órdenes creadas sin autenticación pero con el mismo email."""
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return Response([])
        email = (getattr(user, 'correo', None) or getattr(user, 'email', None) or '').strip()
        if email:
            orders = Order.objects.filter(
                Q(user=user) | Q(customer_email__iexact=email) | Q(shipping_email__iexact=email)
            ).order_by('-created_at')[:50]
        else:
            orders = Order.objects.filter(user=user).order_by('-created_at')[:50]
        return Response(MyOrderSerializer(orders, many=True).data)

    # ── Integración con Wompi — Parámetros de pago ──
    @action(detail=True, methods=['get', 'post'])
    def wompi_checkout_data(self, request, pk=None):
        """Genera firma de integridad y parámetros para el checkout de Wompi.
        Retorna publicKey, reference, amountInCents, currency y signature."""
        from apps.checkout.wompi import generate_signature, get_public_key
        order = self.get_object()
        amount_in_cents = int(order.total * 100)
        ref = order.order_number or f"ORD-{order.id:06d}"
        sig = generate_signature(ref, amount_in_cents, 'COP')
        return Response({
            'publicKey': get_public_key(),
            'reference': ref,
            'amountInCents': amount_in_cents,
            'currency': 'COP',
            'signature': sig,
            'customerEmail': order.customer_email or (request.user.correo if getattr(request, 'user', None) and request.user.is_authenticated else ''),
            'customerName': order.customer_name or '',
        })

    # ── Simulación de pago en sandbox ──
    @action(detail=True, methods=['post'])
    def pay_wompi_sandbox(self, request, pk=None):
        """Simula un pago exitoso en sandbox. Cambia estado a 'paid' y
        registra datos de transacción ficticios para pruebas."""
        from django.utils import timezone
        order = self.get_object()
        order.status = Order.STATUS_PAID
        order.payment_transaction_id = f"wompi-test-{order.id}-{int(timezone.now().timestamp())}"
        order.payment_reference = order.order_number or f"ORD-{order.id:06d}"
        order.payment_wompi_status = 'APPROVED'
        order.payment_confirmed_at = timezone.now()
        order.save(update_fields=['status', 'payment_transaction_id', 'payment_reference', 'payment_wompi_status', 'payment_confirmed_at', 'updated_at'])
        return Response({
            'status': 'success',
            'message': f'¡Pago de la orden #{order.id} procesado con éxito vía Wompi Sandbox!',
            'order': MyOrderSerializer(order).data,
        })

    # ── Descarga de factura PDF ──
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def factura_pdf(self, request, pk=None):
        """Genera y descarga la factura PDF de una orden.
        Crea la factura automáticamente si no existe."""
        from django.http import HttpResponse
        from apps.orders.invoice_service import generate_invoice_pdf
        from apps.orders.models import Invoice

        order = self.get_object()
        invoice = getattr(order, 'invoice', None)
        if not invoice:
            items_total = sum((item.unit_price * item.quantity) for item in order.items.all())
            invoice = Invoice.objects.create(
                order=order,
                subtotal=items_total,
                total=order.total or items_total
            )

        pdf_bytes = generate_invoice_pdf(order, invoice)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        filename = f"Factura_{order.order_number or f'ORD-{order.id:06d}'}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
