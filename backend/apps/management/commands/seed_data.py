from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from itertools import chain


class Command(BaseCommand):
    help = (
        "Siembra datos iniciales de prueba para el sistema RED Estampación.\n\n"
        "Crea:\n"
        "  - 5 categorías (Camisetas, Pantalones, Chaquetas, Accesorios, Personalizado)\n"
        "  - 8-10 productos con nombres, descripciones y precios en COP\n"
        "  - 2-4 variantes por producto (tallas S/M/L/XL + colores)\n"
        "  - 3 usuarios (1 admin + 2 de prueba)\n"
        "  - Historial de búsquedas de ejemplo\n\n"
        "Es 100% idempotente: se puede ejecutar múltiples veces sin duplicar datos.\n"
        "Usa transacciones atómicas con rollback automático en caso de error."
    )

    def create_parser(self, prog_name, subcommand):
        parser = super().create_parser(prog_name, subcommand)
        parser.add_argument(
            '--force',
            action='store_true',
            help='Forzar la creación incluso si ya existen datos (útil para refrescar).'
        )
        return parser

    def _check_existing_data(self):
        from apps.catalog.models import Category
        return Category.objects.exists()

    @transaction.atomic
    def handle(self, *args, **options):
        if self._check_existing_data() and not options['force']:
            self.stdout.write(
                self.style.WARNING(
                    'Los datos de prueba ya existen. Omitiendo siembra.\n'
                    '  Use --force para forzar la creación de todas formas '
                    '(los duplicados se omitirán gracias a get_or_create).'
                )
            )
            return

        self.stdout.write(self.style.NOTICE('Iniciando siembra de datos de prueba...\n'))

        try:
            users = self._create_users()
            categories = self._create_categories()
            products = self._create_products(categories)
            self._create_search_history(users)

            self.stdout.write(self.style.SUCCESS(
                '\n¡Siembra completada exitosamente!\n'
                f'  Usuarios: {len(users)}\n'
                f'  Categorías: {len(categories)}\n'
                f'  Productos: {len(products)}\n'
                f'  Variantes: {sum(len(p["variants"]) for p in products)}\n'
                f'  Búsquedas de ejemplo: 8'
            ))
        except Exception as e:
            raise CommandError(
                f'Error durante la siembra de datos: {e}\n'
                'Todos los cambios fueron revertidos (transaction.atomic).'
            ) from e

    def _create_users(self):
        from apps.users.models import Usuario

        users_data = [
            {
                'usuario': 'admin',
                'correo': 'admin@redestampacion.com',
                'contrasena': make_password('Admin123!'),
                'rol': 'Administrador',
                'estado': 'Activo',
                'email_verificado': True,
            },
            {
                'usuario': 'test',
                'correo': 'test@example.com',
                'contrasena': make_password('Test123!'),
                'rol': 'Usuario',
                'estado': 'Activo',
                'email_verificado': True,
            },
            {
                'usuario': 'usuario',
                'correo': 'usuario@example.com',
                'contrasena': make_password('Test123!'),
                'rol': 'Usuario',
                'estado': 'Activo',
                'email_verificado': True,
            },
        ]

        created_users = []
        for data in users_data:
            user, created = Usuario.objects.get_or_create(
                correo=data['correo'],
                defaults=data,
            )
            if created:
                user.fecha_registro = timezone.now() - timedelta(days=7)
                user.save(update_fields=['fecha_registro'])
                self.stdout.write(f'  Usuario creado: {user.usuario} ({user.correo})')
            else:
                self.stdout.write(f'  Usuario existente: {user.usuario} ({user.correo})')
            created_users.append(user)

        return created_users

    def _create_categories(self):
        from apps.catalog.models import Category

        categories_data = [
            {'name': 'Camisetas', 'description': 'Camisetas clásicas, estampadas y personalizadas en algodón premium.'},
            {'name': 'Pantalones', 'description': 'Pantalones casuales, joggers y jeans con diseños exclusivos.'},
            {'name': 'Chaquetas', 'description': 'Chaquetas ligeras, buzos y hoodies para cualquier temporada.'},
            {'name': 'Accesorios', 'description': 'Gorras, mochilas, tazas y más complementos estampados.'},
            {'name': 'Personalizado', 'description': 'Productos diseñados a medida con tus propias imágenes y textos.'},
        ]

        created_categories = []
        for cat in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat['name'],
                defaults={
                    'description': cat['description'],
                    'is_active': True,
                },
            )
            if created:
                self.stdout.write(f'  Categoría creada: {category.name}')
            else:
                self.stdout.write(f'  Categoría existente: {category.name}')
            created_categories.append(category)

        return created_categories

    def _create_products(self, categories):
        from apps.products.models import Product, Variant
        from apps.catalog.models import ProductCategory

        category_map = {c.name: c for c in categories}

        products_data = [
            {
                'name': 'Camiseta Algodón Premium',
                'description': 'Camiseta de algodón peinado 180 gr/m². Cuello redondo reforzado, costuras reforzadas y corte moderno. Ideal para estampación digital.',
                'base_price': Decimal('45000'),
                'categories': ['Camisetas', 'Personalizado'],
                'variants': [
                    {'size': 'S', 'color': 'Blanco', 'stock': 25},
                    {'size': 'M', 'color': 'Blanco', 'stock': 30},
                    {'size': 'L', 'color': 'Blanco', 'stock': 28},
                    {'size': 'XL', 'color': 'Blanco', 'stock': 15},
                    {'size': 'S', 'color': 'Negro', 'stock': 20},
                    {'size': 'M', 'color': 'Negro', 'stock': 25},
                    {'size': 'L', 'color': 'Negro', 'stock': 22},
                    {'size': 'XL', 'color': 'Negro', 'stock': 12},
                ],
            },
            {
                'name': 'Camiseta Estampada Urbana',
                'description': 'Camiseta con estampado urbano exclusivo. Diseño original serigrafiado de alta durabilidad. Algodón 100% 160 gr/m².',
                'base_price': Decimal('55000'),
                'categories': ['Camisetas'],
                'variants': [
                    {'size': 'M', 'color': 'Negro', 'stock': 18},
                    {'size': 'L', 'color': 'Negro', 'stock': 22},
                    {'size': 'XL', 'color': 'Negro', 'stock': 14},
                    {'size': 'M', 'color': 'Rojo', 'stock': 10},
                    {'size': 'L', 'color': 'Rojo', 'stock': 15},
                ],
            },
            {
                'name': 'Jogger Algodón con Estampado',
                'description': 'Pantalón jogger en algodón french terry con estampado lateral. Cintura elástica con cordón ajustable y bolsillos laterales.',
                'base_price': Decimal('85000'),
                'categories': ['Pantalones'],
                'variants': [
                    {'size': 'S', 'color': 'Gris Melange', 'stock': 12},
                    {'size': 'M', 'color': 'Gris Melange', 'stock': 18},
                    {'size': 'L', 'color': 'Gris Melange', 'stock': 15},
                    {'size': 'XL', 'color': 'Gris Melange', 'stock': 8},
                    {'size': 'M', 'color': 'Negro', 'stock': 16},
                    {'size': 'L', 'color': 'Negro', 'stock': 14},
                ],
            },
            {
                'name': 'Jean Recto Hombre',
                'description': 'Jean corte recto en denim índice 14 oz. Estampado interno exclusivo. Cierre bragueta con cremallera y 5 bolsillos clásicos.',
                'base_price': Decimal('95000'),
                'categories': ['Pantalones'],
                'variants': [
                    {'size': '30', 'color': 'Azul Claro', 'stock': 10},
                    {'size': '32', 'color': 'Azul Claro', 'stock': 20},
                    {'size': '34', 'color': 'Azul Claro', 'stock': 15},
                    {'size': '36', 'color': 'Azul Claro', 'stock': 8},
                    {'size': '32', 'color': 'Azul Oscuro', 'stock': 18},
                    {'size': '34', 'color': 'Azul Oscuro', 'stock': 12},
                ],
            },
            {
                'name': 'Hoodie Unisex Capota',
                'description': 'Buzo con capota forrada en algodón fleece 280 gr/m². Bolsillo canguro frontal, capota ajustable con cordón y estampado frontal.',
                'base_price': Decimal('110000'),
                'categories': ['Chaquetas'],
                'variants': [
                    {'size': 'S', 'color': 'Negro', 'stock': 15},
                    {'size': 'M', 'color': 'Negro', 'stock': 25},
                    {'size': 'L', 'color': 'Negro', 'stock': 20},
                    {'size': 'XL', 'color': 'Negro', 'stock': 10},
                    {'size': 'M', 'color': 'Gris', 'stock': 18},
                    {'size': 'L', 'color': 'Gris', 'stock': 16},
                ],
            },
            {
                'name': 'Chaqueta Rompevientos Personalizable',
                'description': 'Chaqueta rompevientos en nylon ripstop. Resistente al agua, ligera y plegable. Ideal para personalización corporativa.',
                'base_price': Decimal('120000'),
                'categories': ['Chaquetas', 'Personalizado'],
                'variants': [
                    {'size': 'M', 'color': 'Azul Marino', 'stock': 12},
                    {'size': 'L', 'color': 'Azul Marino', 'stock': 18},
                    {'size': 'XL', 'color': 'Azul Marino', 'stock': 10},
                    {'size': 'M', 'color': 'Rojo', 'stock': 8},
                    {'size': 'L', 'color': 'Rojo', 'stock': 12},
                ],
            },
            {
                'name': 'Gorra Trucker Personalizada',
                'description': 'Gorra estilo trucker con malla trasera. Frente en algodón con estructura de 5 paneles y cierre ajustable de clip.',
                'base_price': Decimal('35000'),
                'categories': ['Accesorios'],
                'variants': [
                    {'size': 'Única', 'color': 'Negro/Rojo', 'stock': 30},
                    {'size': 'Única', 'color': 'Negro/Blanco', 'stock': 25},
                    {'size': 'Única', 'color': 'Azul/Blanco', 'stock': 20},
                ],
            },
            {
                'name': 'Mochila Estampada 25L',
                'description': 'Mochila urbana de 25 litros en poliéster 600D. Compartimento para laptop hasta 15.6", bolsillo organizador y estampado frontal.',
                'base_price': Decimal('75000'),
                'categories': ['Accesorios', 'Personalizado'],
                'variants': [
                    {'size': 'Única', 'color': 'Negro', 'stock': 15},
                    {'size': 'Única', 'color': 'Gris', 'stock': 12},
                ],
            },
            {
                'name': 'Camiseta Personalizada 3D',
                'description': 'Camiseta diseñada específicamente para estampación 3D completa. Superficie 360° estampable. Algodón 100% 200 gr/m².',
                'base_price': Decimal('65000'),
                'categories': ['Camisetas', 'Personalizado'],
                'variants': [
                    {'size': 'S', 'color': 'Blanco', 'stock': 20},
                    {'size': 'M', 'color': 'Blanco', 'stock': 28},
                    {'size': 'L', 'color': 'Blanco', 'stock': 24},
                    {'size': 'XL', 'color': 'Blanco', 'stock': 16},
                    {'size': 'S', 'color': 'Negro', 'stock': 15},
                    {'size': 'M', 'color': 'Negro', 'stock': 22},
                    {'size': 'L', 'color': 'Negro', 'stock': 18},
                ],
            },
            {
                'name': 'Taza Cerámica Estampada',
                'description': 'Taza de cerámica blanca de 320 ml. Estampado full color en sublimación. Apta para microondas y lavavajillas.',
                'base_price': Decimal('25000'),
                'categories': ['Accesorios', 'Personalizado'],
                'variants': [
                    {'size': '320ml', 'color': 'Blanco', 'stock': 50},
                    {'size': '320ml', 'color': 'Negro Mate', 'stock': 30},
                    {'size': '400ml', 'color': 'Blanco', 'stock': 40},
                ],
            },
        ]

        created_products = []
        variant_objects = []
        category_relations = []

        for data in products_data:
            product, created = Product.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'base_price': data['base_price'],
                    'is_active': True,
                    'is_approved': True,
                },
            )

            if created:
                self.stdout.write(f'  Producto creado: {product.name}')
            else:
                self.stdout.write(f'  Producto existente: {product.name}')

            for variant_data in data['variants']:
                variant, v_created = Variant.objects.get_or_create(
                    product=product,
                    size=variant_data['size'],
                    color=variant_data['color'],
                    defaults={'stock': variant_data['stock']},
                )
                if v_created:
                    variant_objects.append(variant)

            product_data = {
                'product': product,
                'variants': variant_objects[-len(data['variants']):] if variant_objects else [],
                'categories': data['categories'],
            }
            created_products.append(product_data)

            for cat_name in data['categories']:
                category = category_map.get(cat_name)
                if category:
                    _, rel_created = ProductCategory.objects.get_or_create(
                        product=product,
                        category=category,
                    )

        return created_products

    def _create_search_history(self, users):
        from apps.catalog.models import SearchHistory

        searches = [
            {'session_key': 'seed-admin', 'query': 'camisetas personalizadas', 'filters': {'category': 'Camisetas'}, 'results_count': 5},
            {'session_key': 'seed-admin', 'query': 'chaquetas impermeables', 'filters': {'category': 'Chaquetas'}, 'results_count': 3},
            {'session_key': 'seed-test', 'query': 'gorras estampadas', 'filters': {'max_price': '50000'}, 'results_count': 2},
            {'session_key': 'seed-test', 'query': 'mochila laptop', 'filters': {}, 'results_count': 1},
            {'session_key': 'seed-usuario', 'query': 'buzo capota', 'filters': {}, 'results_count': 4},
            {'session_key': 'seed-usuario', 'query': 'pantalones jogger', 'filters': {'size': 'M'}, 'results_count': 2},
            {'session_key': 'seed-anonymous', 'query': 'taza personalizada', 'filters': {'category': 'Accesorios'}, 'results_count': 3},
            {'session_key': 'seed-anonymous', 'query': 'camiseta algodon premium', 'filters': {'sort': 'price_asc'}, 'results_count': 6},
        ]

        created_count = 0
        for search in searches:
            _, created = SearchHistory.objects.get_or_create(
                session_key=search['session_key'],
                query=search['query'],
                defaults={
                    'filters': search['filters'],
                    'results_count': search['results_count'],
                },
            )
            if created:
                created_count += 1

        self.stdout.write(f'  Búsquedas de ejemplo creadas: {created_count}')
