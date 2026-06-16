from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Product(models.Model):
	name = models.CharField(max_length=100, unique=True)
	description = models.CharField(max_length=500)
	base_price = models.DecimalField(
		max_digits=10,
		decimal_places=2,
		validators=[MinValueValidator(Decimal('0.01'))],
	)
	is_active = models.BooleanField(default=False)
	is_approved = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return self.name

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

		extension = Path(self.image.name).suffix.lower()
		if extension not in {'.jpg', '.jpeg', '.png'}:
			raise ValidationError({'image': 'Solo se permiten imágenes JPG o PNG.'})

		if getattr(self.image, 'size', 0) > 2 * 1024 * 1024:
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
		super().save(*args, **kwargs)

		if self.is_main:
			self.product.images.exclude(pk=self.pk).update(is_main=False)


class Variant(models.Model):
	product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
	size = models.CharField(max_length=20)
	color = models.CharField(max_length=20)
	stock = models.PositiveIntegerField(default=0, validators=[MinValueValidator(0)])
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['size', 'color']
		constraints = [
			models.UniqueConstraint(fields=['product', 'size', 'color'], name='unique_product_variant_color_size'),
		]

	def __str__(self) -> str:
		return f'{self.product.name} — Talla {self.size} — {self.color}'

	def clean(self):
		super().clean()
		if not self.size or not self.size.strip():
			raise ValidationError({'size': 'La talla es obligatoria.'})
		if not self.color or not self.color.strip():
			raise ValidationError({'color': 'El color es obligatorio.'})
		if self.stock < 0:
			raise ValidationError({'stock': 'El stock debe ser mayor o igual a 0.'})

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

	ACTION_CHOICES = [
		(ACTION_CREATED, 'Creado'),
		(ACTION_UPDATED, 'Actualizado'),
		(ACTION_PUBLISHED, 'Publicado'),
	]

	product = models.ForeignKey(Product, related_name='audit_entries', on_delete=models.CASCADE)
	action = models.CharField(max_length=20, choices=ACTION_CHOICES)
	actor = models.CharField(max_length=150, blank=True)
	before_data = models.JSONField(default=dict, blank=True)
	after_data = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f'{self.product.name} - {self.action}'
