from django.contrib import admin

from .models import Product, ProductAudit, ProductImage, Variant


class ProductImageInline(admin.TabularInline):
	model = ProductImage
	extra = 0
	fields = ('image', 'is_main', 'order')


class VariantInline(admin.TabularInline):
	model = Variant
	extra = 0
	fields = ('size', 'color', 'stock')


class ProductAuditInline(admin.TabularInline):
	model = ProductAudit
	extra = 0
	readonly_fields = ('action', 'actor', 'before_data', 'after_data', 'created_at')
	can_delete = False
	fields = ('action', 'actor', 'before_data', 'after_data', 'created_at')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
	list_display = ('name', 'base_price', 'is_active', 'is_approved', 'created_at', 'updated_at')
	list_filter = ('is_active', 'is_approved', 'created_at')
	search_fields = ('name', 'description')
	inlines = [ProductImageInline, VariantInline, ProductAuditInline]

	def save_model(self, request, obj, form, change):
		before_data = {}
		if change and obj.pk:
			original = Product.objects.get(pk=obj.pk)
			before_data = {
				'name': original.name,
				'description': original.description,
				'base_price': str(original.base_price),
				'is_active': original.is_active,
				'is_approved': original.is_approved,
			}
		super().save_model(request, obj, form, change)
		ProductAudit.objects.create(
			product=obj,
			action=ProductAudit.ACTION_UPDATED if change else ProductAudit.ACTION_CREATED,
			actor=getattr(request.user, 'username', '') or 'admin',
			before_data=before_data,
			after_data={
				'name': obj.name,
				'description': obj.description,
				'base_price': str(obj.base_price),
				'is_active': obj.is_active,
				'is_approved': obj.is_approved,
			},
		)


admin.site.register(ProductImage)
admin.site.register(Variant)
admin.site.register(ProductAudit)
