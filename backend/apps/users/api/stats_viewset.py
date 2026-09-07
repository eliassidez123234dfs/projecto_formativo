# ==============================================================================
# ViewSet de Estadísticas — Panel de Administración
# ==============================================================================
# Proporciona estadísticas agregadas del sistema para el dashboard del
# panel de administración: conteo de usuarios (por estado y rol), productos
# (por estado y aprobación) y órdenes (por estado y ventas del mes).
#
# Solo accesible por administradores activos (AdminPermission).
# ==============================================================================
from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.response import Response

from apps.orders.models import Order
from apps.products.models import Product

from ..models import Usuario
from .admin_viewset import AdminPermission


# ─────────────────────────────────────────────────────────────────────────────
# ViewSet: AdminStatsViewSet
# ─────────────────────────────────────────────────────────────────────────────
# Endpoint único GET que retorna estadísticas consolidadas de:
#
#   Usuarios:
#     - total, activos, administradores, bloqueados, inactivos, eliminados.
#
#   Productos:
#     - total, activos, inactivos, aprobados, no aprobados.
#
#   Órdenes:
#     - total_ordenes, del_mes (desde inicio de mes), total_ventas (Sum),
#       pendientes, pagadas, completadas, canceladas.
#
# Requiere rol Administrador + estado Activo (AdminPermission).
# ─────────────────────────────────────────────────────────────────────────────
class AdminStatsViewSet(viewsets.ViewSet):
    """ViewSet para estadísticas del dashboard de administración (usuarios, productos y órdenes). Requiere AdminPermission."""
    permission_classes = [AdminPermission]

    def list(self, request):
        """
        Retorna estadísticas agregadas del sistema.
        
        Agrupa conteos y sumas de usuarios (por estado/rol), productos
        (por estado/aprobación) y órdenes (por estado/ventas del mes).
        """
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # ── Estadísticas de usuarios ──
        # Conteos por estado (Activo/Bloqueado/Inactivo), rol (Administrador)
        # y soft-delete (eliminados).
        user_stats = Usuario.objects.aggregate(
            total=Count('id'),
            activos=Count('id', filter=Q(estado='Activo')),
            administradores=Count('id', filter=Q(rol='Administrador')),
            bloqueados=Count('id', filter=Q(estado='Bloqueado')),
            inactivos=Count('id', filter=Q(estado='Inactivo')),
            eliminados=Count('id', filter=Q(eliminado=True)),
        )

        # ── Estadísticas de productos ──
        # Conteos por estado de activación y aprobación.
        product_stats = Product.objects.aggregate(
            total=Count('id'),
            activos=Count('id', filter=Q(is_active=True)),
            inactivos=Count('id', filter=Q(is_active=False)),
            aprobados=Count('id', filter=Q(is_approved=True)),
            no_aprobados=Count('id', filter=Q(is_approved=False)),
        )

        # ── Estadísticas de órdenes ──
        # Conteos por estado (pending/paid/completed/cancelled) y
        # ventas del mes en curso (del_mes) + total_ventas (Sum).
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
