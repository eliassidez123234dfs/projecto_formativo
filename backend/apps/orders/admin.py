from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
	model = OrderItem
	extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
	list_display = (
		'id',
		'order_number',
		'customer_name',
		'customer_email',
		'status',
		'total',
		'admin_approved_by',
		'admin_approved_at',
		'created_at'
	)
	list_filter = ('status', 'created_at', 'admin_approved_at')
	search_fields = ('customer_name', 'customer_email', 'order_number', 'image_url', 'cloudinary_public_id')
	readonly_fields = ('admin_approved_at', 'admin_approved_by', 'order_number', 'created_at', 'updated_at')
	fieldsets = (
		('Información Básica', {
			'fields': ('order_number', 'customer_name', 'customer_email', 'customer_phone', 'status', 'total')
		}),
		('Dirección de Envío', {
			'fields': ('customer_address', 'customer_city', 'customer_department', 'customer_postal_code'),
			'classes': ('collapse',)
		}),
		('Aprobación del Admin', {
			'fields': ('admin_approved_by', 'admin_approved_at'),
			'classes': ('collapse',)
		}),
		('Diseño Personalizado', {
			'fields': ('image_url', 'cloudinary_public_id', 'design_specs'),
			'classes': ('collapse',)
		}),
		('Pago', {
			'fields': ('payment_transaction_id', 'payment_wompi_status', 'payment_confirmed_at'),
			'classes': ('collapse',)
		}),
		('Auditoría', {
			'fields': ('created_at', 'updated_at'),
			'classes': ('collapse',)
		}),
	)
	inlines = [OrderItemInline]


admin.site.register(OrderItem)
