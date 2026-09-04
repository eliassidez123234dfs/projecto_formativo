from django.contrib import admin

from .models import Cart, CartItem


class CartItemInline(admin.TabularInline):
	model = CartItem
	extra = 0
	readonly_fields = ('product', 'variant', 'quantity', 'unit_price', 'created_at', 'updated_at')


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
	list_display = ('session_key', 'total_items', 'created_at', 'updated_at')
	inlines = [CartItemInline]


admin.site.register(CartItem)
