from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum

from apps.products.models import Product, Variant


class Cart(models.Model):
	session_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
	user = models.ForeignKey('users.Usuario', null=True, blank=True, on_delete=models.SET_NULL, related_name='carts')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:
		return f'Cart {self.session_key or "—"}'

	@property
	def total_items(self) -> int:
		return self.items.aggregate(total=Sum('quantity'))['total'] or 0

	@property
	def total_amount(self):
		total = Decimal('0.00')
		for item in self.items.all():
			total += item.subtotal
		return total


class CartItem(models.Model):
	cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			models.UniqueConstraint(fields=['cart', 'product', 'variant'], name='unique_cart_product_variant'),
		]

	def __str__(self) -> str:
		return f'{self.product.name} x {self.quantity}'

	@property
	def subtotal(self):
		return self.unit_price * self.quantity

	def clean(self):
		super().clean()
		if self.quantity < 1:
			raise ValidationError({'quantity': 'La cantidad mínima permitida es 1.'})
		if self.variant_id and self.quantity > self.variant.stock:
			raise ValidationError({'quantity': 'La cantidad no puede superar el stock disponible.'})
		if self.product_id and not self.product.is_active:
			raise ValidationError({'product': 'El producto debe estar activo.'})
		if self.product_id and not self.product.is_approved:
			raise ValidationError({'product': 'El producto debe estar aprobado para la venta.'})
		if self.variant_id and self.variant.product_id != self.product_id:
			raise ValidationError({'variant': 'La variante no pertenece al producto seleccionado.'})

	def save(self, *args, **kwargs):
		if not self.unit_price:
			self.unit_price = self.product.base_price
		self.full_clean()
		super().save(*args, **kwargs)

