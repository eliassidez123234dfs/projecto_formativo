from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.products.models import Product, Variant


class Order(models.Model):
	STATUS_PENDING = 'pendiente'
	STATUS_PAID = 'pagado'
	STATUS_PRODUCTION = 'produccion'
	STATUS_SHIPPED = 'enviado'
	STATUS_DELIVERED = 'entregado'
	STATUS_CANCELLED = 'cancelado'

	STATUS_CHOICES = [
		(STATUS_PENDING, 'Pendiente'),
		(STATUS_PAID, 'Pagado'),
		(STATUS_PRODUCTION, 'Producción'),
		(STATUS_SHIPPED, 'Enviado'),
		(STATUS_DELIVERED, 'Entregado'),
		(STATUS_CANCELLED, 'Cancelado'),
	]

	order_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='orders',
	)
	customer_name = models.CharField(max_length=150, blank=True, null=True)
	customer_email = models.EmailField(blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
	total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

	shipping_name = models.CharField(max_length=150, blank=True, null=True)
	shipping_email = models.EmailField(blank=True, null=True)
	shipping_phone = models.CharField(max_length=20, blank=True, null=True)
	shipping_address = models.TextField(blank=True, null=True)
	shipping_city = models.CharField(max_length=100, blank=True, null=True)
	shipping_zipcode = models.CharField(max_length=20, blank=True, null=True)

	payment_transaction_id = models.CharField(max_length=100, blank=True, null=True)
	payment_reference = models.CharField(max_length=100, blank=True, null=True)
	payment_wompi_status = models.CharField(max_length=50, blank=True, null=True)
	payment_confirmed_at = models.DateTimeField(blank=True, null=True)
	payment_rejection_reason = models.TextField(blank=True, null=True)

	image = models.TextField(blank=True, null=True, help_text='Imagen capturada del pedido en Base64')
	image_url = models.URLField(blank=True, null=True, help_text='URL segura de Cloudinary')
	cloudinary_public_id = models.CharField(max_length=255, blank=True, null=True)
	design_color = models.CharField(max_length=50, blank=True, null=True)
	logo_texture = models.TextField(blank=True, null=True)
	full_texture = models.TextField(blank=True, null=True)
	logo_scale = models.FloatField(blank=True, null=True)
	notes = models.TextField(blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f'Orden #{self.order_number or self.pk or "nueva"}'

	def save(self, *args, **kwargs):
		is_new = self.pk is None
		super().save(*args, **kwargs)
		if is_new and not self.order_number:
			self.order_number = f'ORD-{self.pk:06d}'
			super().save(update_fields=['order_number'])

	@property
	def is_active_order(self) -> bool:
		return self.status in {self.STATUS_PENDING, self.STATUS_PAID, self.STATUS_PRODUCTION, self.STATUS_SHIPPED}


class Invoice(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='invoice')
    invoice_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    generated_at = models.DateTimeField(auto_now_add=True)
    pdf_url = models.URLField(max_length=500, blank=True, null=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f'Factura #{self.invoice_number or self.pk}'

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.invoice_number:
            self.invoice_number = f'FAC-{self.pk:06d}'
            super().save(update_fields=['invoice_number'])


class OrderItem(models.Model):
	order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
	product = models.ForeignKey(Product, on_delete=models.PROTECT)
	variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)

	@property
	def subtotal(self):
		return self.unit_price * self.quantity

	def __str__(self) -> str:
		return f'{self.product.name} x {self.quantity}'
