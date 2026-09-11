from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.orders.models import Order
from apps.users.api.admin_viewset import AdminPermission
from apps.users.services.email_service import EmailService
from .serializers import AdminOrderSerializer, AdminOrderDetailSerializer


class AdminOrderViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AdminPermission]
    serializer_class = AdminOrderSerializer

    def get_queryset(self):
        qs = Order.objects.prefetch_related('items__product', 'items__variant')
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs.order_by('-created_at')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = AdminOrderDetailSerializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        order = self.get_object()
        nuevo_status = request.data.get('status')

        if not nuevo_status:
            return Response({'error': 'El campo status es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        STATUS_MAP = dict(Order.STATUS_CHOICES)
        # Soportar también alias en inglés por compatibilidad con clientes frontend viejos
        ALIAS_MAP = {
            'pending': Order.STATUS_PENDING_VALIDATION,
            'pending_validation': Order.STATUS_PENDING_VALIDATION,
            'approved': Order.STATUS_APPROVED,
            'pending_payment': Order.STATUS_PENDING_PAYMENT,
            'paid': Order.STATUS_PAID,
            'processing': Order.STATUS_PRODUCTION,
            'completed': Order.STATUS_DELIVERED,
            'cancelled': Order.STATUS_CANCELLED,
        }
        final_status = ALIAS_MAP.get(nuevo_status, nuevo_status)

        if final_status not in STATUS_MAP:
            return Response({'error': f'Estado inválido. Opciones permitidas: {", ".join(STATUS_MAP.keys())}'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = final_status
        order.save(update_fields=['status', 'updated_at'])

        # Si el estado cambia a producción o pagado, notificar al cliente si tiene email
        if final_status in [Order.STATUS_PAID, Order.STATUS_PRODUCTION]:
            EmailService.send_design_approval_email(order)

        return Response(AdminOrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Aprueba un pedido de diseño, permitiendo que el cliente proceda con el pago."""
        order = self.get_object()
        
        if order.status != Order.STATUS_PENDING_VALIDATION:
            return Response(
                {'error': f'La orden debe estar en estado "{Order.STATUS_PENDING_VALIDATION}" para ser aprobada. Estado actual: {order.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        order.status = Order.STATUS_APPROVED
        order.admin_approved_at = timezone.now()
        order.admin_approved_by = request.user
        order.save(update_fields=['status', 'admin_approved_at', 'admin_approved_by', 'updated_at'])

        # Enviar notificación al cliente indicando que puede proceder con el pago
        EmailService.send_design_approval_email(order)
        return Response({
            'message': f'La orden #{order.order_number or order.id} ha sido aprobada. El cliente puede proceder con el pago.',
            'order': AdminOrderSerializer(order).data
        })

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        order = self.get_object()

        if order.status != Order.STATUS_CANCELLED:
            return Response({'error': 'Solo se puede reprocesar pedidos cancelados.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order.STATUS_PENDING_VALIDATION
        order.save(update_fields=['status', 'updated_at'])
        return Response(AdminOrderSerializer(order).data)

    @action(detail=True, methods=['get'])
    def factura_pdf(self, request, pk=None):
        """Descargar directamente la factura PDF de una orden desde el panel de admin."""
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
