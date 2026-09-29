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
	# Las dos FK son NULLABLES a propósito. En la rama java/mongoDB el producto y
	# la variante viven en MongoDB, no en products_product / products_variant, así
	# que no hay fila local que apuntar: la referencia real va en *_ref con el
	# ObjectId. Si estas FK fueran NOT NULL, la fila no se podría ni guardar.
	#
	# En la rama PostgreSQL (java/microservicio) el flujo sigue siendo el de
	# siempre: product_id y variant_id resuelven contra las tablas locales y los
	# *_ref quedan en NULL. Los dos modos conviven en el mismo esquema.
	product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True)
	product_ref = models.CharField(max_length=24, blank=True, null=True, db_index=True)
	variant = models.ForeignKey(Variant, on_delete=models.CASCADE, null=True, blank=True)
	variant_ref = models.CharField(max_length=24, blank=True, null=True, db_index=True)
	# Snapshot del producto al meterlo al carrito. Sigue el mismo patrón que
	# OrderItem.product_name: en la rama java/mongoDB no hay Product local del
	# que leer el nombre, así que el nombre travels en la fila. Así el carrito se
	# puede listar, totalizar y facturar sin volver a preguntar a MongoDB.
	product_name = models.CharField(max_length=200, blank=True, default='')
	product_image = models.URLField(blank=True, null=True)
	variant_label = models.CharField(max_length=100, blank=True, default='')
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)
	design_preview_url = models.URLField(blank=True, null=True)
	design_data = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		constraints = [
			# Rama PostgreSQL: producto y variante locales.
			models.UniqueConstraint(fields=['cart', 'product', 'variant'], name='unique_cart_product_variant'),
			# Rama MongoDB: con product_id y variant_id a NULL, la restricción
			# anterior no protege nada (en SQL NULL != NULL), así que el mismo
			# invariante se impone sobre los ObjectId.
			models.UniqueConstraint(fields=['cart', 'product_ref', 'variant_ref'], name='unique_cart_productref_variantref'),
			# Un item tiene que apuntar a algo, del lado que sea.
			models.CheckConstraint(
				condition=(models.Q(product__isnull=False) | models.Q(product_ref__isnull=False)),
				name='cartitem_tiene_producto',
			),
		]

	def __str__(self) -> str:
		return f'{self.display_name} x {self.quantity}'

	@property
	def display_name(self) -> str:
		"""Nombre para UI/facturación: producto local o snapshot.

		Mismo criterio que OrderItem.display_name: si la FK no resuelve (rama
		MongoDB, o producto purgado) se cae al snapshot y, en último caso, a una
		etiqueta con el ObjectId, para que listar el carrito nunca reviente.
		"""
		if self.product_id and self.product:
			return self.product.name
		return self.product_name or (f'producto {self.product_ref}' if self.product_ref else 'Producto eliminado')

	@property
	def display_variant(self) -> str:
		"""Etiqueta de variante local o snapshot, para las mismas dos ramas."""
		if self.variant_id and self.variant:
			return f'Talla {self.variant.size} — {self.variant.color}'
		return self.variant_label or ''

	@property
	def subtotal(self):
		return self.unit_price * self.quantity

	def clean(self):
		super().clean()
		if self.quantity < 1:
			raise ValidationError({'quantity': 'La cantidad mínima permitida es 1.'})
		# Modo MongoDB: producto y variante viven fuera de PostgreSQL, así que
		# solo se valida lo que sí está en la base local. El stock, el precio y
		# el estado los resuelve el microservicio contra MongoDB.
		if not self.product_id:
			return
		if self.variant_id and self.quantity > self.variant.stock:
			raise ValidationError({'quantity': 'La cantidad no puede superar el stock disponible.'})
		if not self.product.is_active:
			raise ValidationError({'product': 'El producto debe estar activo.'})
		if not self.product.is_approved:
			raise ValidationError({'product': 'El producto debe estar aprobado para la venta.'})
		if self.variant_id and self.variant.product_id != self.product_id:
			raise ValidationError({'variant': 'La variante no pertenece al producto seleccionado.'})

	def save(self, *args, **kwargs):
		# El precio y el snapshot solo se pueden derivar del producto local; en
		# modo MongoDB los envía el cliente (los resuelve el microservicio).
		if self.product_id:
			if not self.unit_price:
				self.unit_price = self.product.base_price
			if not self.product_name:
				self.product_name = self.product.name
			if self.variant_id and not self.variant_label:
				self.variant_label = f'Talla {self.variant.size} — {self.variant.color}'
		self.full_clean()
		super().save(*args, **kwargs)

