from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.products.models import Product, Variant


class Order(models.Model):
	STATUS_PENDING = 'pending'
	STATUS_PAID = 'paid'
	STATUS_PROCESSING = 'processing'
	STATUS_COMPLETED = 'completed'
	STATUS_CANCELLED = 'cancelled'

	STATUS_CHOICES = [
		(STATUS_PENDING, 'Pendiente'),
		(STATUS_PAID, 'Pagado'),
		(STATUS_PROCESSING, 'En proceso'),
		(STATUS_COMPLETED, 'Completado'),
		(STATUS_CANCELLED, 'Cancelado'),
	]

	user = models.ForeignKey(
		settings.AUTH_USER_MODEL,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='orders',
	)
	customer_name = models.CharField(max_length=150)
	customer_email = models.EmailField(blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
	total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f'Orden #{self.pk or "nueva"}'

	@property
	def is_active_order(self) -> bool:
		return self.status in {self.STATUS_PENDING, self.STATUS_PAID, self.STATUS_PROCESSING}


class OrderItem(models.Model):
	order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
	product = models.ForeignKey(Product, on_delete=models.PROTECT)
	variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)

	def __str__(self) -> str:
		return f'{self.product.name} x {self.quantity}'
