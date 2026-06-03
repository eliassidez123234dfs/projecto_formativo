from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response

from apps.orders.models import Order
from apps.products.models import Product

from ..models import Usuario
from .admin_viewset import AdminPermission


class AdminStatsViewSet(viewsets.ViewSet):
    permission_classes = [AdminPermission]

    def list(self, request):
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        user_stats = Usuario.objects.aggregate(
            total=Count('id'),
            activos=Count('id', filter=Q(estado='Activo')),
            administradores=Count('id', filter=Q(rol='Administrador')),
            bloqueados=Count('id', filter=Q(estado='Bloqueado')),
            inactivos=Count('id', filter=Q(estado='Inactivo')),
            eliminados=Count('id', filter=Q(eliminado=True)),
        )

        product_stats = Product.objects.aggregate(
            total=Count('id'),
            activos=Count('id', filter=Q(is_active=True)),
            inactivos=Count('id', filter=Q(is_active=False)),
            aprobados=Count('id', filter=Q(is_approved=True)),
            no_aprobados=Count('id', filter=Q(is_approved=False)),
        )

        order_stats = Order.objects.aggregate(
            total_ordenes=Count('id'),
            del_mes=Count('id', filter=Q(created_at__gte=month_start)),
            total_ventas=Sum('total'),
            pendientes=Count('id', filter=Q(status='pending')),
            pagadas=Count('id', filter=Q(status='paid')),
            completadas=Count('id', filter=Q(status='completed')),
            canceladas=Count('id', filter=Q(status='cancelled')),
        )

        return Response({
            'usuarios': user_stats,
            'productos': product_stats,
            'ordenes': order_stats,
        })
