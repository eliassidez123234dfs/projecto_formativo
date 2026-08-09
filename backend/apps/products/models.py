"""
Módulo de modelos para la gestión del catálogo de productos.
Define Product (producto), Variant (tallas/colores/stock), ProductImage (imágenes
con integración Cloudinary), ProductAudit (eventos del ciclo de vida),
MotivoDesaprobacion (motivos de rechazo) y Review (valoraciones de usuarios).

Flujo de aprobación de productos:
  1. Se crea un Product con is_active=False, is_approved=False.
  2. El vendedor/revisor verifica que cumpla los requisitos (checklist).
  3. Se llama a publish() → is_active=True, is_approved=True (visible en tienda).
  4. Si no cumple, se llama a disapprove() → is_approved=False + motivo de rechazo.
  5. Tras corregir, se puede volver a publish().
"""

from __future__ import annotations

import decimal
from decimal import Decimal
from pathlib import Path

from django.conf import settings
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
	"""Producto del catálogo. Núcleo del inventario con control de publicación y validación.
	Soporta flujo de aprobación (is_approved) antes de estar visible (is_active)."""
	# ── Información básica ──
	# name: nombre único del producto (max 100 caracteres).
	# description: descripción textual (max 500 caracteres).
	# base_price: precio base en COP. Mínimo $0.01. Las variantes pueden sobrescribirlo.
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
		"""Imagen principal del producto (is_main=True). Si no hay marcada como
		principal, retorna la primera por orden. Retorna None si no hay imágenes."""
		return self.images.filter(is_main=True).order_by('order', 'id').first() or self.images.order_by('order', 'id').first()

	@property
	def has_main_image(self) -> bool:
		"""Indica si el producto tiene al menos una imagen marcada como principal."""
		return self.images.filter(is_main=True).exists()

	@property
	def has_valid_variant(self) -> bool:
		"""Indica si existe al menos una variante con stock > 0."""
		return self.variants.filter(stock__gt=0).exists()

	@property
	def can_be_published(self) -> bool:
		"""Condiciones mínimas para publicar: tener imagen principal y
		al menos una variante con stock."""
		return self.has_main_image and self.has_valid_variant

	@property
	def checklist(self):
		"""Diccionario con el estado de cada requisito de publicación.
		Útil para mostrar al vendedor/revisor qué falta para publicar."""
		return {
			'name': bool(self.name),
			'description': bool(self.description),
			'main_image': self.has_main_image,
			'variant_with_stock': self.has_valid_variant,
			'ready_to_publish': self.can_be_published,
		}

	@property
	def has_active_order_items(self) -> bool:
		"""Indica si el producto tiene ítems en pedidos activos (pendiente,
		pagado, en producción). Se usa para bloquear ciertas ediciones."""
		return self.orderitem_set.filter(order__status__in={'pending', 'paid', 'processing'}).exists()

	def clean(self):
		"""Validaciones de negocio del producto:
		- nombre obligatorio (max 100 caracteres)
		- descripción obligatoria (max 500 caracteres)
		- precio base debe ser un Decimal > 0"""
		super().clean()
		if not self.name or not self.name.strip():
			raise ValidationError({'name': 'El nombre es requerido.'})
		if len(self.name) > 100:
			raise ValidationError({'name': 'El nombre no puede superar 100 caracteres.'})
		if not self.description or not self.description.strip():
			raise ValidationError({'description': 'La descripción es requerida.'})
		if len(self.description) > 500:
			raise ValidationError({'description': 'La descripción no puede superar 500 caracteres.'})
		price = self.base_price
		if price is None:
			raise ValidationError({'base_price': 'Precio base inválido.'})
		try:
			price = Decimal(str(price))
		except Exception:
			raise ValidationError({'base_price': 'Precio base inválido.'})
		if price is None or price <= 0:
			raise ValidationError({'base_price': 'El precio base debe ser mayor a 0.'})
		if not is_cop_price_valid(self.base_price):
			raise ValidationError({'base_price': f'El precio en COP debe ser >= {CURRENCY_MIN} y múltiplo de {CURRENCY_STEP}.'})

	def save(self, *args, **kwargs):
		self.full_clean()
		super().save(*args, **kwargs)


class ProductImage(models.Model):
	"""Imágenes asociadas a un producto. Soporta almacenamiento local y Cloudinary.
	Máximo 5 imágenes por producto. Una imagen puede marcarse como principal (is_main).
	Validaciones: formato JPG/PNG, tamaño ≤ 2MB, resolución mínima 400x400 píxeles."""
	product = models.ForeignKey(Product, related_name='images', on_delete=models.CASCADE)
	# ── Almacenamiento ──
	# image: archivo local subido al servidor. cloudinary_url: URL directa de Cloudinary.
	# Ambos son opcionales, pero al menos uno debe estar presente.
	image = models.ImageField(upload_to='products/%Y/%m', blank=True, null=True)
	cloudinary_url = models.URLField(max_length=500, blank=True, null=True, help_text='URL directa de Cloudinary')
	# ── Metadatos ──
	# is_main: marca esta imagen como principal del producto. Solo una puede serlo.
	#   Al guardar una imagen con is_main=True, las demás se actualizan a False.
	# order: orden de visualización en la galería (1 = primera). unique_together con product.
	is_main = models.BooleanField(default=False)
	order = models.PositiveSmallIntegerField(default=1)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['order', 'id']
		constraints = [
			# Garantiza que no haya dos imágenes con el mismo orden en un producto.
			models.UniqueConstraint(fields=['product', 'order'], name='unique_product_image_order'),
		]

	def __str__(self) -> str:
		return f'{self.product.name} - imagen {self.order}'

	@property
	def image_url(self):
		"""Retorna la URL de la imagen: prioriza Cloudinary, luego la local."""
		if self.cloudinary_url:
			return self.cloudinary_url
		if self.image:
			try:
				return self.image.url
			except Exception:
				pass
		return None

	def clean(self):
		"""Validaciones de imagen:
		- Máximo 5 imágenes por producto.
		- Debe tener al menos image o cloudinary_url.
		- Solo formatos JPG/JPEG/PNG.
		- Tamaño máximo 2 MB.
		- Resolución mínima 400x400 píxeles (validado con Pillow)."""
		super().clean()
		if self.product_id and self.product.images.exclude(pk=self.pk).count() >= 5:
			raise ValidationError({'image': 'Máximo 5 imágenes por producto.'})
		if not self.image and not self.cloudinary_url:
			raise ValidationError({'image': 'Debe proporcionar una imagen o una URL de Cloudinary.'})

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
				if width < 100 or height < 100:
					raise ValidationError({'image': 'La resolución mínima es 100x100 píxeles.'})
			except ValidationError:
				raise
			except Exception as exc:
				raise ValidationError({'image': f'No se pudo validar la imagen: {exc}'})

	def save(self, *args, **kwargs):
		# Asigna orden automático si no se especificó o hay conflicto.
		if self.product_id and (not self.order or ProductImage.objects.filter(product=self.product, order=self.order).exclude(pk=self.pk).exists()):
			last_order = self.product.images.exclude(pk=self.pk).aggregate(models.Max('order'))['order__max'] or 0
			self.order = last_order + 1

		# Si no hay imagen principal, la primera imagen se marca como principal automáticamente.
		if self.product_id and not self.is_main and not self.product.images.filter(is_main=True).exists():
			self.is_main = True

		self.full_clean()

		# PIL deja el puntero del archivo a mitad de la lectura al validar la
		# imagen; si no se rebobina, Cloudinary recibe un stream truncado y
		# responde "Invalid image file". Se rebobina justo antes de subir.
		if self.image:
			self.image.seek(0)

		super().save(*args, **kwargs)

		# Si esta imagen se marca como principal, desmarca todas las demás.
		if self.is_main:
			self.product.images.exclude(pk=self.pk).update(is_main=False)


class Variant(models.Model):
	"""Variante de producto por talla y color. Controla stock y precio diferenciado.
	Cada combinación product + size + color debe ser única (unique_together).
	Restricciones: máximo 4 tallas distintas y 10 colores distintos por producto."""
	product = models.ForeignKey(Product, related_name='variants', on_delete=models.CASCADE)
	# ── Atributos de variante ──
	# size: talla de la prenda (ej: S, M, L, XL).
	# color: color de la variante (ej: Rojo, Azul).
	# stock: unidades disponibles. Mínimo 0.
	# precio_variante: precio opcional diferenciado. Si es null, se usa base_price del producto.
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
			# Garantiza que no haya dos variantes con la misma talla y color para un producto.
			models.UniqueConstraint(fields=['product', 'size', 'color'], name='unique_product_variant_color_size'),
		]

	def __str__(self) -> str:
		return f'{self.product.name} — Talla {self.size} — {self.color}'

	@property
	def effective_price(self) -> Decimal:
		"""Precio efectivo: el de la variante si existe, si no el base del producto."""
		return self.price_variant if self.price_variant is not None else self.product.base_price

	def clean(self):
		"""Validaciones de variante:
		- talla y color obligatorios
		- stock ≥ 0
		- máximo 4 tallas distintas por producto
		- máximo 10 colores distintos por producto
		- combinación talla+color única por producto"""
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

		# Verifica que no exista ya la misma combinación talla+color para el producto.
		if self.product_id and self.product.variants.exclude(pk=self.pk).filter(size=self.size, color=self.color).exists():
			raise ValidationError({'__all__': 'Cada combinación talla/color debe ser única por producto.'})

	def save(self, *args, **kwargs):
		self.full_clean()
		super().save(*args, **kwargs)


# ═══════════════════════════════════════════════════════════════════════
# Auditoría y revisión de productos
# ═══════════════════════════════════════════════════════════════════════


class ProductAudit(models.Model):
	"""Registro de auditoría para eventos del ciclo de vida del producto.
	Captura created/updated/published/approved/disapproved con instantáneas
	JSON del antes y después para reconstrucción de cambios."""
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
	# Instantáneas JSON: antes y después de la acción para reconstruir cambios.
	before_data = models.JSONField(default=dict, blank=True)
	after_data = models.JSONField(default=dict, blank=True)
	# Motivo de desaprobación / nota de la acción (RF-044)
	motivo = models.CharField(max_length=255, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f'{self.product.name} - {self.action}'


class MotivoDesaprobacion(models.Model):
	"""Razón de rechazo cuando un producto no supera la revisión.
	Almacena el motivo textual, el revisor que lo desaprobó y su estado (approved).
	approved=False indica que el producto fue rechazado; al corregirse pasa a True.
	Se relaciona con ProductAudit (action=disapproved) para el registro completo."""
	product = models.ForeignKey(Product, related_name='disapproval_reasons', on_delete=models.CASCADE)
	# ── Motivo y revisor ──
	motivo = models.CharField(max_length=200)  # Razón textual del rechazo (max 200 caracteres).
	usuario_id_revisor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
	# approved: False = producto rechazado, True = aprobado tras corrección y re-evaluación.
	approved = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f'{self.product.name} - {self.motivo[:50]}'


class Review(models.Model):
	"""Reseña de usuario sobre un producto. Una reseña por usuario/producto (unique_together).
	Puntuación de 1 a 5 estrellas con comentario opcional de hasta 1000 caracteres.
	Se accede desde Product.reviews (related_name) y desde User.reviews."""
	product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews')
	# ── Contenido de la reseña ──
	# rating: puntuación de 1 a 5 estrellas (PositiveSmallIntegerField con choices).
	# comment: texto opcional del comentario (max 1000 caracteres).
	rating = models.PositiveSmallIntegerField(choices=[(i, str(i)) for i in range(1, 6)])
	comment = models.TextField(max_length=1000, blank=True)
	# ── Timestamps ──
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']
		constraints = [
			# Garantiza que un usuario solo pueda reseñar un producto una vez.
			models.UniqueConstraint(fields=['product', 'user'], name='unique_product_user_review')
		]

	def __str__(self):
		return f'{self.product.name} - {self.user} ({self.rating}★)'
