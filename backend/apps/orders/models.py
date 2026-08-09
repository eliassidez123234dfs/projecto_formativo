"""
Módulo de modelos para la gestión de pedidos.
Define Order (ciclo de vida completo: pendiente → pagado → producción → enviado
→ entregado/cancelado), Invoice (facturación) y OrderItem (líneas de detalle
con precio congelado).

Ciclo de vida del pedido:
  1. pendiente: recién creado, esperando pago.
  2. pagado: pago confirmado vía Wompi.
  3. produccion: en fabricación/estampación.
  4. enviado: despachado al cliente.
  5. entregado: recibido por el cliente (finalizado).
  6. cancelado: anulado antes de completarse.
"""

from __future__ import annotations

from django.db import models

from apps.products.models import Product, Variant


class Order(models.Model):
	"""Pedido completo con datos de envío, pago y diseño. Núcleo del proceso de compra.
	Ciclo de vida: pendiente → pagado → producción → enviado → entregado o cancelado."""

	# ── Estados del pedido ──
	STATUS_PENDING = 'pendiente'      # Recién creado, esperando confirmación de pago.
	STATUS_PAID = 'pagado'            # Pago confirmado vía Wompi.
	STATUS_PRODUCTION = 'produccion'  # En proceso de fabricación/estampación.
	STATUS_SHIPPED = 'enviado'        # Despachado al cliente.
	STATUS_DELIVERED = 'entregado'    # Recibido por el cliente (estado final exitoso).
	STATUS_CANCELLED = 'cancelado'    # Anulado antes de completarse.

	STATUS_CHOICES = [
		(STATUS_PENDING, 'Pendiente'),
		(STATUS_PAID, 'Pagado'),
		(STATUS_PRODUCTION, 'Producción'),
		(STATUS_SHIPPED, 'Enviado'),
		(STATUS_DELIVERED, 'Entregado'),
		(STATUS_CANCELLED, 'Cancelado'),
	]

	# ── Identificación ──
	# order_number: formato ORD-XXXXXX, generado automáticamente en save().
	order_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
	user = models.ForeignKey(
		'users.Usuario',
		null=True,
		blank=True,
		on_delete=models.SET_NULL,
		related_name='orders',
	)
	customer_name = models.CharField(max_length=150, blank=True, null=True)
	customer_email = models.EmailField(blank=True)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
	total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

	# ── Dirección de envío ──
	shipping_name = models.CharField(max_length=150, blank=True, null=True)
	shipping_email = models.EmailField(blank=True, null=True)
	shipping_phone = models.CharField(max_length=20, blank=True, null=True)
	shipping_address = models.TextField(blank=True, null=True)
	shipping_city = models.CharField(max_length=100, blank=True, null=True)
	shipping_zipcode = models.CharField(max_length=20, blank=True, null=True)

	# ── Información de pago (Wompi) ──
	# payment_transaction_id: ID de transacción en Wompi.
	# payment_reference: referencia única de la transacción.
	# payment_wompi_status: estado devuelto por Wompi (APPROVED, DECLINED, etc.).
	# payment_confirmed_at: timestamp de confirmación del pago.
	# payment_rejection_reason: motivo si Wompi rechazó el pago.
	payment_transaction_id = models.CharField(max_length=100, blank=True, null=True)
	payment_reference = models.CharField(max_length=100, blank=True, null=True)
	payment_wompi_status = models.CharField(max_length=50, blank=True, null=True)
	payment_confirmed_at = models.DateTimeField(blank=True, null=True)
	payment_rejection_reason = models.TextField(blank=True, null=True)

	# ── Personalización de diseño ──
	# image: captura en Base64 del diseño personalizado desde el editor 3D.
	# image_url: URL del diseño subido a Cloudinary (CDN).
	# cloudinary_public_id: ID público en Cloudinary para gestión del recurso.
	# design_color: color seleccionado para el diseño.
	# logo_texture / full_texture: texturas en Base64 (logo y fondo completo).
	# logo_scale: escala del logo en el diseño.
	# notes: notas adicionales del cliente para el pedido.
	image = models.TextField(blank=True, null=True, help_text='Imagen capturada del pedido en Base64')
	image_url = models.URLField(blank=True, null=True, help_text='URL segura de Cloudinary')
	cloudinary_public_id = models.CharField(max_length=255, blank=True, null=True)
	design_color = models.CharField(max_length=50, blank=True, null=True)
	logo_texture = models.TextField(blank=True, null=True)
	full_texture = models.TextField(blank=True, null=True)
	logo_scale = models.FloatField(blank=True, null=True)
	notes = models.TextField(blank=True, null=True)

	# ── Timestamps ──
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ['-created_at']

	def __str__(self) -> str:
		return f'Orden #{self.order_number or self.pk or "nueva"}'

	def save(self, *args, **kwargs):
		"""Guarda el pedido. Si es nuevo, genera el order_number
		con formato ORD-XXXXXX (donde XXXXXX es el PK padded)."""
		is_new = self.pk is None
		super().save(*args, **kwargs)
		if is_new and not self.order_number:
			self.order_number = f'ORD-{self.pk:06d}'
			super().save(update_fields=['order_number'])

	@property
	def is_active_order(self) -> bool:
		"""Indica si el pedido está en un estado activo (no terminal).
		Estados activos: pendiente, pagado, producción, enviado.
		Estados terminales: entregado, cancelado."""
		return self.status in {self.STATUS_PENDING, self.STATUS_PAID, self.STATUS_PRODUCTION, self.STATUS_SHIPPED}


class Invoice(models.Model):
    """Factura generada a partir de un pedido confirmado.
    Relación 1:1 con Order. invoice_number con formato FAC-XXXXXX
    (generado automáticamente al crear). pdf_url almacena la URL
    del documento PDF generado."""
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
        """Genera invoice_number automático con formato FAC-XXXXXX
        al crear la factura por primera vez."""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.invoice_number:
            self.invoice_number = f'FAC-{self.pk:06d}'
            super().save(update_fields=['invoice_number'])


class OrderItem(models.Model):
	"""Línea de pedido. Producto + variante con cantidad y precio congelado.
	El precio se congela al añadirse al carrito (unit_price) para evitar
	que cambios futuros de precio afecten pedidos ya realizados.
	on_delete=PROTECT impide eliminar productos o variantes del catálogo
	si tienen pedidos activos asociados."""
	order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
	product = models.ForeignKey(Product, on_delete=models.PROTECT)
	variant = models.ForeignKey(Variant, on_delete=models.PROTECT)
	quantity = models.PositiveIntegerField(default=1)
	unit_price = models.DecimalField(max_digits=10, decimal_places=2)

	@property
	def subtotal(self):
		"""Subtotal de la línea: unit_price × quantity."""
		return self.unit_price * self.quantity

	def __str__(self) -> str:
		return f'{self.product.name} x {self.quantity}'
