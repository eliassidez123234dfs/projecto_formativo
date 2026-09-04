from django.shortcuts import render
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.db.models import Sum, Count
from apps.users.models import Usuario
from apps.products.models import Product
from apps.orders.models import Order


def dev_landing(request):
    return render(request, 'admin/dev_landing.html')


@staff_member_required
def dev_dashboard(request):
    total_users = Usuario.objects.count()
    active_users = Usuario.objects.filter(estado='Activo').count()
    total_products = Product.objects.count()
    active_products = Product.objects.filter(is_active=True).count()
    total_orders = Order.objects.count()
    total_revenue = Order.objects.aggregate(total=Sum('total'))['total'] or 0
    recent_orders = Order.objects.order_by('-created_at')[:10]

    return render(request, 'admin/dev_dashboard.html', {
        'total_users': total_users,
        'active_users': active_users,
        'total_products': total_products,
        'active_products': active_products,
        'total_orders': total_orders,
        'total_revenue': total_revenue,
        'recent_orders': recent_orders,
    })
