from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from apps.orders.models import Invoice, Order
from apps.orders.api.serializers import InvoiceSerializer
from rest_framework.permissions import IsAuthenticated
from apps.users.api.admin_viewset import AdminPermission


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'generate']:
            return [IsAuthenticated(), AdminPermission()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.all()
        if getattr(user, 'rol', '') != 'Administrador':
            qs = qs.filter(order__user=user)
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({'error': 'order_id es requerido.'}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, pk=order_id)

        if hasattr(order, 'invoice'):
            return Response({'error': 'Esta orden ya tiene una factura.'}, status=status.HTTP_400_BAD_REQUEST)

        items_total = sum(
            (item.unit_price * item.quantity) for item in order.items.all()
        )

        invoice = Invoice.objects.create(
            order=order,
            subtotal=items_total,
            total=order.total or items_total,
        )

        serializer = self.get_serializer(invoice)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
