"""
Pruebas del puente entre Django (PostgreSQL) y el microservicio Spring (MongoDB).

En la rama java/mongoDB los productos NO viven en products_product: viven en la
colección `productos` de MongoDB y su _id es un ObjectId de 24 hex. Django
conserva carrito, categorías y reseñas, así que esas tablas tienen que poder
guardar una fila que apunte a un producto del que no hay fila local.

Estas pruebas fijan ese contrato. Son las que atrapan el error de fondo que
hacía el puente inútil: con la FK en NOT NULL, la fila con product_ref nunca
llegaba a guardarse, y todo el diseño pasaba los `manage.py check` mientras no
servía para nada.
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse

from apps.carts.models import Cart, CartItem
from apps.catalog.models import Category, ProductCategory
from apps.products.models import Product, Review

OBJETID_A = '507f1f77bcf86cd799439011'
OBJETID_B = '507f1f77bcf86cd799439012'

TOKEN = 'token-de-pruebas'


@override_settings(INTERNAL_API_TOKEN=TOKEN)
class PuenteObjectIdTest(TestCase):
	"""Almacenamiento y limpieza de filas que referencian productos de MongoDB."""

	def setUp(self):
		self.user = get_user_model().objects.create_user(
			usuario='comprador', correo='comprador@test.com', contrasena='x',
		)
		self.categoria = Category.objects.create(name='Remeras')

	# ── ¿Se puede guardar la fila? ──────────────────────────────────────────

	def test_un_item_de_carrito_con_objectid_se_guarda(self):
		"""El corazón del puente: la fila tiene que existir en PostgreSQL."""
		carrito = Cart.objects.create(session_key='sess-mongo-1')

		item = CartItem.objects.create(
			cart=carrito,
			product_ref=OBJETID_A,
			variant_ref=OBJETID_B,
			product_name='Camiseta Mongo',
			unit_price=Decimal('15000.00'),
			quantity=2,
		)

		self.assertIsNone(item.product_id)
		self.assertEqual(item.product_ref, OBJETID_A)
		self.assertEqual(CartItem.objects.filter(product_ref=OBJETID_A).count(), 1)

	def test_una_categoria_con_objectid_se_guarda(self):
		rel = ProductCategory.objects.create(
			product_ref=OBJETID_A, category=self.categoria,
		)

		self.assertIsNone(rel.product_id)
		self.assertEqual(ProductCategory.objects.filter(product_ref=OBJETID_A).count(), 1)

	def test_una_resena_con_objectid_se_guarda(self):
		resena = Review.objects.create(
			product_ref=OBJETID_A, user=self.user, rating=5, comment='Buena',
		)

		self.assertIsNone(resena.product_id)
		self.assertEqual(Review.objects.filter(product_ref=OBJETID_A).count(), 1)

	# ── El snapshot evita que listar el carrito reviente ────────────────────

	def test_el_carrito_se_puede_listar_sin_producto_local(self):
		"""Flujo completo por la API: agregar un ObjectId y listar el carrito.

		Cubre las tres piezas a la vez: que CartAddSerializer acepte el ObjectId,
		que el viewset lo guarde, y que CartItemSerializer lo serialice. Con
		product_id NULL, serializar el carrito no debe lanzar AttributeError.
		"""
		agregar = self.client.post(
			reverse('cart-add'),
			data={
				'product_id': OBJETID_A,
				'variant_id': OBJETID_B,
				'quantity': 2,
				'unit_price': '15000.00',
				'product_name': 'Camiseta Mongo',
				'variant_label': 'Talla M — Azul',
			},
			content_type='application/json',
		)

		self.assertEqual(agregar.status_code, 201, agregar.content)

		contenido = self.client.get(reverse('cart-list')).json()
		self.assertEqual(len(contenido['items']), 1)
		item = contenido['items'][0]
		self.assertEqual(item['product_name'], 'Camiseta Mongo')
		self.assertEqual(item['variant_label'], 'Talla M — Azul')
		self.assertEqual(item['product_ref'], OBJETID_A)
		self.assertIsNone(item['product'])
		# Sin variante local no hay stock que reportar: None, no un 500.
		self.assertIsNone(item['variant_stock'])
		self.assertEqual(item['subtotal'], '30000.00')

	def test_el_str_del_item_no_revienta_sin_producto_local(self):
		carrito = Cart.objects.create(session_key='sess-mongo-3')
		item = CartItem.objects.create(
			cart=carrito, product_ref=OBJETID_A,
			product_name='Camiseta Mongo', unit_price=Decimal('15000.00'),
		)

		self.assertIn('Camiseta Mongo', str(item))

	def test_str_recai_si_no_hay_snapshot_ni_producto(self):
		"""Peor caso: fila huérfana. Debe mostrar un texto, no un AttributeError."""
		carrito = Cart.objects.create(session_key='sess-mongo-4')
		item = CartItem(cart=carrito, product_ref=OBJETID_A, unit_price=Decimal('15000.00'))

		self.assertIn(OBJETID_A, str(item))

	# ── La rama PostgreSQL sigue funcionando ───────────────────────────────

	def test_la_rama_postgres_no_se_rompio(self):
		"""Con producto local, la FK se sigue llenando como siempre."""
		producto = Product.objects.create(
			name='Camiseta Local', description='d', base_price=Decimal('20000.00'),
			is_active=True, is_approved=True,
		)
		carrito = Cart.objects.create(session_key='sess-pg-1')

		item = CartItem.objects.create(cart=carrito, product=producto, quantity=1)

		self.assertEqual(item.product_id, producto.id)
		self.assertIsNone(item.product_ref)
		self.assertEqual(item.unit_price, Decimal('20000.00'))
		# El snapshot se rellena solo desde el producto local.
		self.assertEqual(item.product_name, 'Camiseta Local')

	# ── Purga en cascada ────────────────────────────────────────────────────

	def test_la_cascada_borra_las_tres_tablas(self):
		carrito = Cart.objects.create(session_key='sess-mongo-5')
		CartItem.objects.create(
			cart=carrito, product_ref=OBJETID_A, unit_price=Decimal('1000.00'),
		)
		ProductCategory.objects.create(product_ref=OBJETID_A, category=self.categoria)
		Review.objects.create(product_ref=OBJETID_A, user=self.user, rating=4)

		url = reverse('internal-products-dependencies', args=[OBJETID_A])
		respuesta = self.client.delete(url, headers={'X-Internal-Token': TOKEN})

		self.assertEqual(respuesta.status_code, 200)
		datos = respuesta.json()
		self.assertEqual(datos['total'], 3)
		self.assertEqual(datos['cart_items'], 1)
		self.assertEqual(datos['categories'], 1)
		self.assertEqual(datos['reviews'], 1)

		self.assertEqual(CartItem.objects.filter(product_ref=OBJETID_A).count(), 0)
		self.assertEqual(ProductCategory.objects.filter(product_ref=OBJETID_A).count(), 0)
		self.assertEqual(Review.objects.filter(product_ref=OBJETID_A).count(), 0)

	def test_la_cascada_no_toca_otros_productos(self):
		"""El borrado se filtra por product_ref: otro producto no se toca."""
		carrito = Cart.objects.create(session_key='sess-mongo-6')
		CartItem.objects.create(
			cart=carrito, product_ref=OBJETID_A, unit_price=Decimal('1000.00'),
		)
		CartItem.objects.create(
			cart=carrito, product_ref=OBJETID_B, unit_price=Decimal('2000.00'),
		)

		url = reverse('internal-products-dependencies', args=[OBJETID_A])
		self.client.delete(url, headers={'X-Internal-Token': TOKEN})

		self.assertEqual(CartItem.objects.filter(product_ref=OBJETID_A).count(), 0)
		self.assertEqual(CartItem.objects.filter(product_ref=OBJETID_B).count(), 1)

	def test_la_cascada_es_idempotente(self):
		"""Spring puede reintentar: un segundo borrado devuelve 200 con 0."""
		url = reverse('internal-products-dependencies', args=[OBJETID_A])

		primero = self.client.delete(url, headers={'X-Internal-Token': TOKEN})
		segundo = self.client.delete(url, headers={'X-Internal-Token': TOKEN})

		self.assertEqual(primero.status_code, 200)
		self.assertEqual(segundo.status_code, 200)
		self.assertEqual(segundo.json()['total'], 0)

	# ── Seguridad del endpoint interno ──────────────────────────────────────

	def test_la_cascada_exige_token(self):
		carrito = Cart.objects.create(session_key='sess-mongo-7')
		CartItem.objects.create(
			cart=carrito, product_ref=OBJETID_A, unit_price=Decimal('1000.00'),
		)
		url = reverse('internal-products-dependencies', args=[OBJETID_A])

		sin_token = self.client.delete(url)
		token_malo = self.client.delete(url, headers={'X-Internal-Token': 'incorrecto'})

		self.assertEqual(sin_token.status_code, 401)
		self.assertEqual(token_malo.status_code, 401)
		self.assertEqual(CartItem.objects.filter(product_ref=OBJETID_A).count(), 1)

	@override_settings(INTERNAL_API_TOKEN='')
	def test_sin_token_configurado_el_endpoint_queda_cerrado(self):
		"""Fail-closed: sin INTERNAL_API_TOKEN no se sirve nada, ni con token."""
		url = reverse('internal-products-dependencies', args=[OBJETID_A])

		respuesta = self.client.delete(url, headers={'X-Internal-Token': 'cualquiera'})

		self.assertEqual(respuesta.status_code, 401)

	def test_consulta_de_ordenes_acepta_objectid(self):
		"""El endpoint que Spring usa antes de purgar acepta el ObjectId.

		La clave del JSON es parte del contrato con InterServiceClient.java, que
		hace body.get("has_orders"): si alguien renombra la clave, la purga deja
		de detectar ordenes y borra productos que sí tienen historial.
		"""
		url = reverse('check-product-orders', args=[OBJETID_A])

		respuesta = self.client.get(url, headers={'X-Internal-Token': TOKEN})

		self.assertEqual(respuesta.status_code, 200)
		datos = respuesta.json()
		self.assertIn('has_orders', datos)
		self.assertEqual(datos['product_ref'], OBJETID_A)
		self.assertIs(datos['has_orders'], False)
