from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.orders.models import Order
from apps.users.api.admin_viewset import AdminPermission
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
        if nuevo_status not in STATUS_MAP:
            return Response({'error': f'Estado invalido. Opciones: {", ".join(STATUS_MAP.keys())}'}, status=status.HTTP_400_BAD_REQUEST)

        if order.status == Order.STATUS_PAID:
            return Response({'error': 'No se puede modificar un pedido pagado.'}, status=status.HTTP_400_BAD_REQUEST)

        if order.status == Order.STATUS_CANCELLED:
            return Response({'error': 'Pedido cancelado. Use "Procesar nuevamente" para reactivarlo.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = nuevo_status
        order.save(update_fields=['status', 'updated_at'])
        return Response(AdminOrderSerializer(order).data)

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        order = self.get_object()

        if order.status != Order.STATUS_CANCELLED:
            return Response({'error': 'Solo se puede reprocesar pedidos cancelados.'}, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order.STATUS_PENDING
        order.save(update_fields=['status', 'updated_at'])
        return Response(AdminOrderSerializer(order).data)
