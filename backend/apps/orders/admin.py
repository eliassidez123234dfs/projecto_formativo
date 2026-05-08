from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
	model = OrderItem
	extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
	list_display = ('id', 'customer_name', 'customer_email', 'status', 'total', 'created_at')
	list_filter = ('status', 'created_at')
	search_fields = ('customer_name', 'customer_email')
	inlines = [OrderItemInline]


admin.site.register(OrderItem)
