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
import json
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

	# ── Categorías por ObjectId (lo que arregla la edición de productos) ─────

	def test_las_categorias_se_leen_por_objectid(self):
		"""GET devuelve las marcadas, para que el formulario abra con ellas."""
		cafes = Category.objects.create(name='Cafes')
		ropa = Category.objects.create(name='Ropa')
		ProductCategory.objects.create(product_ref=OBJETID_A, category=cafes)

		url = reverse('internal-products-categories', args=[OBJETID_A])
		respuesta = self.client.get(url, headers={'X-Internal-Token': TOKEN})

		self.assertEqual(respuesta.status_code, 200)
		datos = respuesta.json()
		self.assertEqual(datos['product_ref'], OBJETID_A)
		self.assertEqual(datos['categories'], [{'id': cafes.id, 'name': 'Cafes'}])
		self.assertNotIn(ropa.id, [c['id'] for c in datos['categories']])

	def test_editar_categorias_reemplaza_el_conjunto(self):
		"""PUT: las nuevas quedan, las desmarcadas desaparecen.

		Este es el caso exacto del bug reportado: el producto tenía 'Cafes' y al
		guardar el formulario se quedaba sin categorías. Aquí se comprueba que
		desmarcar Cafe y marcar Ropa deja solo Ropa.
		"""
		cafes = Category.objects.create(name='Cafes')
		ropa = Category.objects.create(name='Ropa')
		ProductCategory.objects.create(product_ref=OBJETID_A, category=cafes)

		url = reverse('internal-products-categories-set', args=[OBJETID_A])
		respuesta = self.client.put(
			url,
			data=json.dumps({'categoria_ids': [ropa.id]}),
			content_type='application/json',
			headers={'X-Internal-Token': TOKEN},
		)

		self.assertEqual(respuesta.status_code, 200)
		self.assertEqual([c['name'] for c in respuesta.json()['categories']], ['Ropa'])
		self.assertEqual(
			sorted(ProductCategory.objects.filter(product_ref=OBJETID_A)
			        .values_list('category_id', flat=True)),
			[ropa.id],
		)

	def test_editar_categorias_es_idempotente(self):
		"""Reenviar el mismo conjunto no duplica filas: Spring puede reintentar."""
		cafes = Category.objects.create(name='Cafes')
		url = reverse('internal-products-categories-set', args=[OBJETID_A])
		cuerpo = json.dumps({'categoria_ids': [cafes.id]})

		primera = self.client.put(
			url, data=cuerpo, content_type='application/json',
			headers={'X-Internal-Token': TOKEN})
		segunda = self.client.put(
			url, data=cuerpo, content_type='application/json',
			headers={'X-Internal-Token': TOKEN})

		self.assertEqual(primera.status_code, 200)
		self.assertEqual(segunda.status_code, 200)
		self.assertEqual(
			ProductCategory.objects.filter(product_ref=OBJETID_A).count(), 1)

	def test_lista_vacia_quita_todas_las_categorias(self):
		"""[] significa "quítamelas todas", no "no me digas nada".

		El distinction importa: es lo que permite que el cliente diga "este
		producto ya no tiene categorías" sin que el servicio lo interprete como
		"no toques las categorías".
		"""
		cafes = Category.objects.create(name='Cafes')
		ProductCategory.objects.create(product_ref=OBJETID_A, category=cafes)
		url = reverse('internal-products-categories-set', args=[OBJETID_A])

		respuesta = self.client.put(
			url,
			data=json.dumps({'categoria_ids': []}),
			content_type='application/json',
			headers={'X-Internal-Token': TOKEN},
		)

		self.assertEqual(respuesta.status_code, 200)
		self.assertEqual(
			ProductCategory.objects.filter(product_ref=OBJETID_A).count(), 0)

	def test_una_categoria_inexistente_se_ignora_sin_tirar_el_resto(self):
		"""Un id obsoleto no debe abortar el guardado entero.

		Si alguien desactivó una categoría entre que el formulario se abrió y se
		guardó, perder todos los demás cambios por eso sería peor que perder esa
		categoría. Se ignora y se reporta en 'ignorados'.
		"""
		cafes = Category.objects.create(name='Cafes')
		url = reverse('internal-products-categories-set', args=[OBJETID_A])

		respuesta = self.client.put(
			url,
			data=json.dumps({'categoria_ids': [cafes.id, 999999]}),
			content_type='application/json',
			headers={'X-Internal-Token': TOKEN},
		)

		datos = respuesta.json()
		self.assertEqual([c['name'] for c in datos['categories']], ['Cafes'])
		self.assertEqual(datos['ignorados'], [999999])

	def test_una_categoria_desactivada_no_se_re_asigna(self):
		"""Una categoría desactivada no se ofrece ni se guarda."""
		cafes = Category.objects.create(name='Cafes', is_active=False)
		url = reverse('internal-products-categories-set', args=[OBJETID_A])

		respuesta = self.client.put(
			url,
			data=json.dumps({'categoria_ids': [cafes.id]}),
			content_type='application/json',
			headers={'X-Internal-Token': TOKEN},
		)

		self.assertEqual(respuesta.json()['categories'], [])
		self.assertEqual(
			ProductCategory.objects.filter(product_ref=OBJETID_A).count(), 0)

	def test_editar_categorias_no_toca_otros_productos(self):
		"""Un producto no puede robar las de otro's categorías al guardar."""
		cafes = Category.objects.create(name='Cafes')
		ropa = Category.objects.create(name='Ropa')
		ProductCategory.objects.create(product_ref=OBJETID_B, category=ropa)
		url = reverse('internal-products-categories-set', args=[OBJETID_A])

		self.client.put(
			url,
			data=json.dumps({'categoria_ids': [cafes.id]}),
			content_type='application/json',
			headers={'X-Internal-Token': TOKEN},
		)

		self.assertEqual(
			[rel.category.name for rel in ProductCategory.objects
			 .filter(product_ref=OBJETID_B).select_related('category')],
			['Ropa'])

	def test_editar_categorias_rechaza_json_invalido(self):
		"""Un body roto da 400 con mensaje, no un 500."""
		url = reverse('internal-products-categories-set', args=[OBJETID_A])

		roto = self.client.put(
			url, data='{no es json', content_type='application/json',
			headers={'X-Internal-Token': TOKEN})
		lista = self.client.put(
			url, data=json.dumps({'categoria_ids': 'no-es-lista'}),
			content_type='application/json', headers={'X-Internal-Token': TOKEN})

		self.assertEqual(roto.status_code, 400)
		self.assertEqual(lista.status_code, 400)

	def test_las_categorias_exigen_token(self):
		"""Ni lectura ni escritura sin el token interno."""
		cafes = Category.objects.create(name='Cafes')
		ProductCategory.objects.create(product_ref=OBJETID_A, category=cafes)
		leer = reverse('internal-products-categories', args=[OBJETID_A])
		escribir = reverse('internal-products-categories-set', args=[OBJETID_A])
		cuerpo = json.dumps({'categoria_ids': [cafes.id]})

		sin_token = self.client.get(leer)
		token_malo = self.client.put(
			escribir, data=cuerpo, content_type='application/json',
			headers={'X-Internal-Token': 'incorrecto'})

		self.assertEqual(sin_token.status_code, 401)
		self.assertEqual(token_malo.status_code, 401)
		self.assertEqual(
			ProductCategory.objects.filter(product_ref=OBJETID_A).count(), 1)

	@override_settings(INTERNAL_API_TOKEN='')
	def test_las_categorias_quedan_cerradas_sin_token_configurado(self):
		"""Fail-closed también aquí: sin INTERNAL_API_TOKEN no se sirve nada."""
		leer = reverse('internal-products-categories', args=[OBJETID_A])
		escribir = reverse('internal-products-categories-set', args=[OBJETID_A])

		respuesta = self.client.get(
			leer, headers={'X-Internal-Token': 'cualquiera'})
		escritura = self.client.put(
			escribir,
			data=json.dumps({'categoria_ids': []}),
			content_type='application/json',
			headers={'X-Internal-Token': 'cualquiera'},
		)

		self.assertEqual(respuesta.status_code, 401)
		self.assertEqual(escritura.status_code, 401)


	def _archivo(self, nombre):
		"""Un archivo cualquiera en el storage de pruebas.

		A diferencia de la subida, aqui no se valida la imagen con Pillow: este
		endpoint solo necesita existencia y borrado en el storage.
		"""
		from django.core.files.base import ContentFile
		from django.core.files.storage import default_storage
		return default_storage.save(nombre, ContentFile(b'contenido-de-prueba'))

	def test_borrar_archivo_requiere_token_interno(self):
		"""Spring lo llama sin sesion de usuario, solo con X-Internal-Token."""
		from django.core.files.storage import default_storage
		nombre = self._archivo('products/2026/09/secreto.png')

		sin_token = self.client.delete(f'/api/internal/products/archivos/?path={nombre}')
		token_malo = self.client.delete(
			f'/api/internal/products/archivos/?path={nombre}',
			HTTP_X_INTERNAL_TOKEN='no-es-el-token',
		)

		self.assertEqual(sin_token.status_code, 401)
		self.assertEqual(token_malo.status_code, 401)
		self.assertTrue(default_storage.exists(nombre))
		default_storage.delete(nombre)

	def test_borrar_archivo_con_token_interno(self):
		from django.core.files.storage import default_storage
		nombre = self._archivo('products/2026/09/a-borrar.png')

		respuesta = self.client.delete(
			f'/api/internal/products/archivos/?path={nombre}', headers={'X-Internal-Token': TOKEN})

		self.assertEqual(respuesta.status_code, 200)
		self.assertTrue(respuesta.json()['borrado'])
		self.assertFalse(default_storage.exists(nombre))

	def test_borrar_archivo_no_sale_de_products(self):
		"""Este endpoint lo consume Spring, no el usuario: aun asi no debe
		poder borrar cualquier clave del bucket."""
		from django.core.files.storage import default_storage
		fuera = self._archivo('facturacion/2026/09/factura.pdf')

		respuesta = self.client.delete(
			f'/api/internal/products/archivos/?path={fuera}', headers={'X-Internal-Token': TOKEN})

		self.assertEqual(respuesta.status_code, 400)
		self.assertTrue(default_storage.exists(fuera))
		default_storage.delete(fuera)
