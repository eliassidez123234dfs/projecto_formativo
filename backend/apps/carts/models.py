"""
Módulo de modelos para la gestión de carritos de compra.
Define Cart (carrito vinculado a sesión anónima o usuario autenticado) y
CartItem (producto + variante + cantidad con precio congelado).

Flujo del carrito:
  1. Usuario anónimo: carrito vinculado a session_key.
  2. Al autenticarse: los items del carrito anónimo se fusionan al del usuario.
  3. Al crear pedido: el carrito se asocia a Order (cart.order) y se vacían los items.
"""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from apps.products.models import Product, Variant


class Cart(models.Model):
	"""Carrito de compras. Vinculado a sesión anónima (session_key) o a usuario autenticado.
	Al convertirse en pedido, se asocia mediante la relación 1:1 con Order.
	Si el usuario se autentica después de tener items en carrito anónimo,
	se fusionan mediante merge_into_user_cart()."""
	session_key = models.CharField(max_length=64, unique=True, null=True, blank=True)
	user = models.ForeignKey('users.Usuario', null=True, blank=True, on_delete=models.SET_NULL, related_name='carts')
	order = models.OneToOneField('orders.Order', null=True, blank=True, on_delete=models.SET_NULL, related_name='cart')
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self) -> str:
		return f'Cart {self.session_key or self.user_id or "new"}'

	@property
	def total_items(self) -> int:
		"""Suma agregada de cantidades de todos los items (consulta SQL SUM).
		Retorna 0 si el carrito está vacío."""
		return self.items.aggregate(total=models.Sum('quantity'))['total'] or 0

	@property
	def total_amount(self):
		"""Monto total calculado en SQL: SUM(quantity * unit_price).
		Usa expresiones F del ORM para evitar cargar todos los items en memoria.
		Retorna Decimal('0.00') si el carrito está vacío."""
		aggregate = self.items.aggregate(
			total=models.Sum(models.F('quantity') * models.F('unit_price'))
		)['total']
		return aggregate or Decimal('0.00')


class CartItem(models.Model):
	"""Producto con variante y cantidad dentro de un carrito.
	unique_together: solo una entrada por (cart, product, variant).
	unit_price se congela al añadir al carrito desde el precio base del producto.
	Validaciones de negocio en clean(): stock, producto activo/aprobado,
	variante pertenece al producto."""
	cart = models.ForeignKey(Cart, related_name='items', on_delete=models.CASCADE)
	product = models.ForeignKey(Product, on_delete=models.CASCADE)
	variant = models.ForeignKey(Variant, on_delete=models.CASCADE)
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			# Garantiza que un producto+variante solo aparezca una vez en un carrito.
			models.UniqueConstraint(fields=['cart', 'product', 'variant'], name='unique_cart_product_variant'),
		]

	def __str__(self) -> str:
		return f'{self.product.name} x {self.quantity}'

	@property
	def subtotal(self):
		"""Subtotal del item: unit_price × quantity."""
		return self.unit_price * self.quantity

	def clean(self):
		"""Validaciones de negocio del item del carrito:
		- Cantidad mínima 1.
		- La cantidad no puede superar el stock disponible de la variante.
		- El producto debe estar activo (is_active=True).
		- El producto debe estar aprobado (is_approved=True).
		- La variante debe pertenecer al producto seleccionado."""
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
		"""Congela el precio unitario desde el producto si no se especificó."""
		if not self.unit_price:
			self.unit_price = self.product.base_price
		self.clean()
		super().save(*args, **kwargs)

