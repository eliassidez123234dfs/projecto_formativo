from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.orders.models import Order
from .serializers import OrderSerializer, MyOrderSerializer


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # Map camelCase payload (from frontend) to snake_case expected by serializer
        data = request.data.copy()
        if 'imageUrl' in data and 'image_url' not in data:
            data['image_url'] = data.get('imageUrl')
        if 'cloudinaryPublicId' in data and 'cloudinary_public_id' not in data:
            data['cloudinary_public_id'] = data.get('cloudinaryPublicId')

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=['get'])
    def mis(self, request):
        """Pedidos del usuario autenticado, del más reciente al más antiguo."""
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return Response([])
        orders = Order.objects.filter(user=user)[:50]
        return Response(MyOrderSerializer(orders, many=True).data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def factura_pdf(self, request, pk=None):
        """Descargar directamente la factura PDF de una orden."""
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

