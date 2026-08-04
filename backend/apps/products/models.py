from __future__ import annotations

import decimal
from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from apps.users.models import Usuario

# Moneda: pesos colombianos (COP). Los precios deben ser >= 50 y múltiplos de 50.
CURRENCY_MIN = Decimal('50')
CURRENCY_STEP = Decimal('50')
DEFAULT_COLOR_HEX = '#6B7280'


def is_cop_price_valid(value) -> bool:
	"""True si el precio cumple la regla COP: >= 50 y múltiplo de 50."""
	try:
		value = Decimal(value)
	except (TypeError, ValueError, decimal.InvalidOperation):
		return False
	return value >= CURRENCY_MIN and value % CURRENCY_STEP == 0


class Product(models.Model):
	name = models.CharField(max_length=100, unique=True)
	description = models.CharField(max_length=500)
	base_price = models.DecimalField(
		max_digits=10,
		decimal_places=2,
		validators=[MinValueValidator(Decimal('0.01'))],
	)
	# stock = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
	is_active = models.BooleanField(default=False)
	is_approved = models.BooleanField(default=False)
	# Trazabilidad: quién crea/edita el producto y quién/aprobó cuándo (RF-044/045)
	creator = models.ForeignKey(
		Usuario,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='products_created',
	)
	approved_by = models.ForeignKey(
		Usuario,
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='products_approved',
	)
	approved_at = models.DateTimeField(null=True, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return self.name

	@property
	def total_stock(self) -> int:
		return sum(self.variants.values_list('stock', flat=True) or [0])

	@property
	def main_image(self):
		return self.images.filter(is_main=True).order_by('order', 'id').first() or self.images.order_by('order', 'id').first()

	@property
	def has_main_image(self) -> bool:
		return self.images.filter(is_main=True).exists()

	@property
	def has_valid_variant(self) -> bool:
		return self.variants.filter(stock__gt=0).exists()

	@property
	def can_be_published(self) -> bool:
		return self.has_main_image and self.has_valid_variant

	@property
	def checklist(self):
		return {
			'name': bool(self.name),
			'description': bool(self.description),
			'main_image': self.has_main_image,
			'variant_with_stock': self.has_valid_variant,
			'ready_to_publish': self.can_be_published,
		}

	@property
	def has_active_order_items(self) -> bool:
		return self.orderitem_set.filter(order__status__in={'pending', 'paid', 'processing'}).exists()

	def clean(self):
		super().clean()
		if not self.name or not self.name.strip():
			raise ValidationError({'name': 'El nombre es requerido.'})
		if len(self.name) > 100:
			raise ValidationError({'name': 'El nombre no puede superar 100 caracteres.'})
		if not self.description or not self.description.strip():
			raise ValidationError({'description': 'La descripción es requerida.'})
		if len(self.description) > 500:
			raise ValidationError({'description': 'La descripción no puede superar 500 caracteres.'})
		if self.base_price is None or self.base_price <= 0:
			raise ValidationError({'base_price': 'El precio base debe ser mayor a 0.'})
		if not is_cop_price_valid(self.base_price):
			raise ValidationError({'base_price': f'El precio en COP debe ser >= {CURRENCY_MIN} y múltiplo de {CURRENCY_STEP}.'})

	def save(self, *args, **kwargs):
		self.full_clean()
		super().save(*args, **kwargs)


class ProductImage(models.Model):
	product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
	image = models.ImageField(upload_to='products/%Y/%m')
	is_main = models.BooleanField(default=False)
	order = models.PositiveSmallIntegerField(default=1)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['order', 'id']
		constraints = [
			models.UniqueConstraint(fields=['product', 'order'], name='unique_product_image_order'),
		]

	def __str__(self) -> str:
		return f'{self.product.name} - imagen {self.order}'

	def clean(self):
		super().clean()
		if self.product_id and self.product.images.exclude(pk=self.pk).count() >= 5:
			raise ValidationError({'image': 'Máximo 5 imágenes por producto.'})
		if not self.image:
			raise ValidationError({'image': 'La imagen es obligatoria.'})

		file_name = self.image.name
		extension = Path(file_name).suffix.lower()
		if not extension:
			try:
				file_name = self.image.file.name
				extension = Path(file_name).suffix.lower()
			except (AttributeError, TypeError):
				pass
		if extension and extension not in {'.jpg', '.jpeg', '.png'}:
			raise ValidationError({'image': 'Solo se permiten imágenes JPG o PNG.'})

		file_size = getattr(self.image, 'size', 0) or getattr(self.image, 'file', None) and getattr(self.image.file, 'size', 0) or 0
		if file_size > 2 * 1024 * 1024:
			raise ValidationError({'image': 'La imagen no puede superar 2MB.'})

		try:
			from PIL import Image

			self.image.seek(0)
			with Image.open(self.image) as image_file:
				width, height = image_file.size
				if width < 400 or height < 400:
					raise ValidationError({'image': 'La resolución mínima es 400x400 píxeles.'})
		except ValidationError:
			raise
		except Exception as exc:
			raise ValidationError({'image': f'No se pudo validar la imagen: {exc}'})

	def save(self, *args, **kwargs):
		if self.product_id and (not self.order or ProductImage.objects.filter(product=self.product, order=self.order).exclude(pk=self.pk).exists()):
			last_order = self.product.images.exclude(pk=self.pk).aggregate(models.Max('order'))['order__max'] or 0
			self.order = last_order + 1

		if self.product_id and not self.is_main and not self.product.images.filter(is_main=True).exists():
			self.is_main = True

		self.full_clean()

		# PIL deja el puntero del archivo a mitad de la lectura al validar la
		# imagen; si no se rebobina, Cloudinary recibe un stream truncado y
		# responde "Invalid image file". Se rebobina justo antes de subir.
		if self.image:
			self.image.seek(0)

		super().save(*args, **kwargs)

		if self.is_main:
			self.product.images.exclude(pk=self.pk).update(is_main=False)


class Variant(models.Model):
	product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
	size = models.CharField(max_length=20)
	color = models.CharField(max_length=20)
	color_hex = models.CharField(max_length=7, blank=True, default=DEFAULT_COLOR_HEX)
	color_nombre = models.CharField(max_length=50, blank=True)
	stock = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
	# Precio específico por variante (COP); si es None se usa product.base_price
	price_variant = models.DecimalField(
		max_digits=10,
		decimal_places=2,
		null=True,
		blank=True,
		validators=[MinValueValidator(Decimal('0.01'))],
	)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['size', 'color']
		constraints = [
			models.UniqueConstraint(fields=['product', 'size', 'color'], name='unique_product_variant_color_size'),
		]

	def __str__(self) -> str:
		return f'{self.product.name} — Talla {self.size} — {self.color}'

	@property
	def effective_price(self) -> Decimal:
		"""Precio efectivo: el de la variante si existe, si no el base del producto."""
		return self.price_variant if self.price_variant is not None else self.product.base_price

	def clean(self):
		super().clean()
		if not self.size or not self.size.strip():
			raise ValidationError({'size': 'La talla es obligatoria.'})
		if not self.color or not self.color.strip():
			raise ValidationError({'color': 'El color es obligatorio.'})
		if self.stock < 0:
			raise ValidationError({'stock': 'El stock debe ser mayor o igual a 0.'})

		if self.color_hex and len(self.color_hex) == 7:
			hex_value = self.color_hex.lstrip('#')
			try:
				int(hex_value, 16)
			except ValueError:
				raise ValidationError({'color_hex': 'El color HEX no es válido (ej. #RRGGBB).'})
		else:
			raise ValidationError({'color_hex': 'El color HEX debe tener formato #RRGGBB.'})

		if not self.color_nombre or not self.color_nombre.strip():
			self.color_nombre = self.color

		if self.price_variant is not None and not is_cop_price_valid(self.price_variant):
			raise ValidationError({'price_variant': f'El precio de la variante en COP debe ser >= {CURRENCY_MIN} y múltiplo de {CURRENCY_STEP}, o dejarse vacío para usar el precio base.'})

		if self.product_id:
			existing_sizes = set(
				self.product.variants.exclude(pk=self.pk).values_list('size', flat=True)
			)
			existing_colors = set(
				self.product.variants.exclude(pk=self.pk).values_list('color', flat=True)
			)
			existing_sizes.add(self.size)
			existing_colors.add(self.color)

			if len(existing_sizes) > 4:
				raise ValidationError({'size': 'Máximo 4 tallas por producto.'})
			if len(existing_colors) > 10:
				raise ValidationError({'color': 'Máximo 10 colores por producto.'})

		if self.product_id and self.product.variants.exclude(pk=self.pk).filter(size=self.size, color=self.color).exists():
			raise ValidationError({'__all__': 'Cada combinación talla/color debe ser única por producto.'})

	def save(self, *args, **kwargs):
		self.full_clean()
		super().save(*args, **kwargs)


class ProductAudit(models.Model):
	ACTION_CREATED = 'created'
	ACTION_UPDATED = 'updated'
	ACTION_PUBLISHED = 'published'
	ACTION_DISAPPROVED = 'disapproved'

	ACTION_CHOICES = [
		(ACTION_CREATED, 'Creado'),
		(ACTION_UPDATED, 'Actualizado'),
		(ACTION_PUBLISHED, 'Publicado'),
		(ACTION_DISAPPROVED, 'Desaprobado'),
	]

	product = models.ForeignKey(Product, related_name='audit_entries', on_delete=models.CASCADE)
	action = models.CharField(max_length=20, choices=ACTION_CHOICES)
	actor = models.CharField(max_length=150, blank=True)
	before_data = models.JSONField(default=dict, blank=True)
	after_data = models.JSONField(default=dict, blank=True)
	# Motivo de desaprobación / nota de la acción (RF-044)
	motivo = models.CharField(max_length=255, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f'{self.product.name} - {self.action}'
