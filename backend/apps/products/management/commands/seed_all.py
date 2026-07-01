from django.core.management.base import BaseCommand
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from decimal import Decimal
import random
import secrets

class Command(BaseCommand):
    help = 'Crea datos de prueba: usuarios, categorías, productos, pedidos, modelos 3D'

    def handle(self, *args, **options):
        self.stdout.write('Creando datos de prueba...\n')
        self._create_users()
        self._create_categories()
        self._create_products()
        self._create_orders()
        self._create_models3d()
        self._create_catalog_relations()
        self.stdout.write(self.style.SUCCESS('¡Datos de prueba creados exitosamente!'))

    def _create_users(self):
        from apps.users.models import Usuario, Token_Verificacion
        users_data = [
            {'usuario': 'admin', 'correo': 'admin@red.com', 'contrasena': 'Admin123!', 'rol': 'Administrador', 'estado': 'Activo', 'email_verificado': True},
            {'usuario': 'staff', 'correo': 'staff@red.com', 'contrasena': 'Staff123!', 'rol': 'Administrador', 'estado': 'Activo', 'email_verificado': True},
            {'usuario': 'juan', 'correo': 'juan@email.com', 'contrasena': 'User1234!', 'rol': 'Usuario', 'estado': 'Activo', 'email_verificado': True},
            {'usuario': 'maria', 'correo': 'maria@email.com', 'contrasena': 'Maria123!', 'rol': 'Usuario', 'estado': 'Activo', 'email_verificado': True},
            {'usuario': 'carlos', 'correo': 'carlos@email.com', 'contrasena': 'Carlos12!', 'rol': 'Usuario', 'estado': 'Activo', 'email_verificado': True},
        ]
        created = 0
        for data in users_data:
            _, was_created = Usuario.objects.get_or_create(
                correo=data['correo'],
                defaults={
                    'usuario': data['usuario'],
                    'contrasena': make_password(data['contrasena']),
                    'rol': data['rol'],
                    'estado': data['estado'],
                    'email_verificado': data['email_verificado'],
                }
            )
            if was_created:
                created += 1
        self.stdout.write(f'  Usuarios creados: {created}')
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('═' * 50))
        self.stdout.write(self.style.WARNING('  CUENTAS DISPONIBLES:'))
        self.stdout.write(self.style.WARNING('═' * 50))
        for data in users_data:
            self.stdout.write(f'  Usuario:    {data["usuario"]}')
            self.stdout.write(f'  Correo:     {data["correo"]}')
            self.stdout.write(f'  Contraseña: {data["contrasena"]}')
            self.stdout.write(f'  Rol:        {data["rol"]}')
            self.stdout.write('')
        self.stdout.write(self.style.WARNING('═' * 50))

    def _create_categories(self):
        from apps.catalog.models import Category
        categories = [
            {'name': 'Camisetas', 'description': 'Camisetas clásicas y estampadas'},
            {'name': 'Polos', 'description': 'Polos deportivos y casuales'},
            {'name': 'Chaquetas', 'description': 'Chaquetas ligeras y abrigadoras'},
            {'name': 'Accesorios', 'description': 'Complementos y accesorios'},
        ]
        created = 0
        for cat in categories:
            _, was_created = Category.objects.get_or_create(
                name=cat['name'],
                defaults={'description': cat['description'], 'is_active': True}
            )
            if was_created:
                created += 1
        self.stdout.write(f'  Categorías creadas: {created}')

    def _get_cdn(self):
        cloud_name = getattr(settings, 'CLOUDINARY_STORAGE', {}).get('CLOUD_NAME', '')
        if cloud_name:
            return f'https://res.cloudinary.com/{cloud_name}/image/upload/v1/tshirtify'
        return 'https://res.cloudinary.com/dpu8xwbbh/image/upload/v1/tshirtify'

    def _create_products(self):
        from apps.products.models import Product, ProductImage, Variant
        cdn = self._get_cdn()
        products_data = [
            {
                'name': 'Camiseta Clásica Roja',
                'description': 'Camiseta de algodón 100% en rojo vibrante. Ideal para uso diario con un ajuste cómodo y duradero.',
                'base_price': 29.99,
                'image': f'{cdn}/classic-red.jpg',
                'sizes': ['S', 'M', 'L', 'XL'],
                'colors': ['Rojo', 'Negro'],
            },
            {
                'name': 'Camiseta Clásica Negra',
                'description': 'Camiseta negra esencial para cualquier guardarropa. Fresca, ligera y versátil.',
                'base_price': 24.99,
                'image': f'{cdn}/classic-black.jpg',
                'sizes': ['S', 'M', 'L', 'XL'],
                'colors': ['Negro', 'Blanco'],
            },
            {
                'name': 'Camiseta Estampada "RED"',
                'description': 'Camiseta con estampado exclusivo RED. Diseño moderno y llamativo.',
                'base_price': 34.99,
                'image': f'{cdn}/red-print.jpg',
                'sizes': ['M', 'L', 'XL'],
                'colors': ['Blanco', 'Negro', 'Rojo'],
            },
            {
                'name': 'Camiseta Personalizada 3D',
                'description': 'Camiseta diseñada para personalización 3D. Superficie lisa ideal para estampados completos.',
                'base_price': 39.99,
                'image': f'{cdn}/tshirt-3d.jpg',
                'sizes': ['S', 'M', 'L', 'XL'],
                'colors': ['Blanco', 'Negro', 'Azul'],
            },
            {
                'name': 'Polo Deportivo Azul',
                'description': 'Polo deportivo de manga corta en azul marino. Tejido transpirable y de secado rápido.',
                'base_price': 44.99,
                'image': f'{cdn}/polo-blue.jpg',
                'sizes': ['M', 'L', 'XL'],
                'colors': ['Azul', 'Marino', 'Negro'],
            },
            {
                'name': 'Chaqueta Ligera',
                'description': 'Chaqueta ligera ideal para media temporada. Resistente al viento y al agua.',
                'base_price': 59.99,
                'image': f'{cdn}/jacket-light.jpg',
                'sizes': ['M', 'L', 'XL'],
                'colors': ['Negro', 'Gris', 'Azul'],
            },
            {
                'name': 'Camiseta Vintage',
                'description': 'Camiseta de estilo vintage con acabado lavado. Algodón suave y aspecto desgastado.',
                'base_price': 32.99,
                'image': f'{cdn}/vintage.jpg',
                'sizes': ['S', 'M', 'L'],
                'colors': ['Crema', 'Gris', 'Verde'],
            },
            {
                'name': 'Camiseta Premium Algodón',
                'description': 'Camiseta premium de algodón orgánico. Suavidad extrema y acabado de alta calidad.',
                'base_price': 49.99,
                'image': f'{cdn}/premium-cotton.jpg',
                'sizes': ['S', 'M', 'L', 'XL'],
                'colors': ['Blanco', 'Negro', 'Gris', 'Azul'],
            },
        ]
        created = 0
        for data in products_data:
            product, was_created = Product.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'base_price': Decimal(str(data['base_price'])),
                    'is_active': True,
                    'is_approved': True,
                }
            )
            if was_created:
                created += 1
                ProductImage.objects.create(
                    product=product,
                    cloudinary_url=data['image'],
                    is_main=True,
                    order=1
                )
                for size in data['sizes']:
                    for color in data['colors']:
                        Variant.objects.get_or_create(
                            product=product,
                            size=size,
                            color=color,
                            defaults={'stock': random.randint(5, 50)}
                        )
        self.stdout.write(f'  Productos creados: {created}')

    def _create_orders(self):
        from apps.orders.models import Order, OrderItem
        from apps.products.models import Product, Variant
        from apps.users.models import Usuario

        admin = Usuario.objects.filter(rol='Administrador').first()
        users = list(Usuario.objects.filter(rol='Usuario')[:3])
        products = list(Product.objects.filter(is_active=True)[:6])

        if not products or not users:
            self.stdout.write('  Saltando pedidos: faltan productos o usuarios')
            return

        orders_data = [
            {'user': users[0], 'customer_name': 'Juan Pérez', 'customer_email': users[0].correo, 'status': 'completed', 'total': 59.98},
            {'user': users[1], 'customer_name': 'María García', 'customer_email': users[1].correo, 'status': 'processing', 'total': 34.99},
            {'user': users[2] if len(users) > 2 else users[0], 'customer_name': 'Carlos López', 'customer_email': users[2].correo if len(users) > 2 else users[0].correo, 'status': 'pending', 'total': 89.97},
            {'user': admin, 'customer_name': 'Admin RED', 'customer_email': admin.correo, 'status': 'paid', 'total': 44.99},
        ]
        created = 0
        for data in orders_data:
            order = Order.objects.create(
                user=data['user'],
                customer_name=data['customer_name'],
                customer_email=data['customer_email'],
                status=data['status'],
                total=Decimal(str(data['total'])),
            )
            for i, product in enumerate(products[:random.randint(1, 3)]):
                variant = product.variants.filter(stock__gt=0).first()
                if variant:
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        variant=variant,
                        quantity=random.randint(1, 3),
                        unit_price=product.base_price,
                    )
            created += 1
        self.stdout.write(f'  Pedidos creados: {created}')

    def _create_models3d(self):
        from apps.models3d.models import Modelo3D
        cdn = self._get_cdn()
        models_data = [
            {
                'name': 'Camiseta Base 3D',
                'description': 'Modelo 3D base de camiseta para personalización',
                'cloudinary_url': f'{cdn}/tshirt-3d-base.glb',
                'file_type': 'glb',
                'is_active': True,
                'is_approved': True,
                'preview': f'{cdn}/tshirt-3d-base-preview.jpg',
            },
            {
                'name': 'Camiseta Estampado Completo',
                'description': 'Modelo 3D de camiseta con textura completa personalizable',
                'cloudinary_url': f'{cdn}/tshirt-full-texture.glb',
                'file_type': 'glb',
                'is_active': True,
                'is_approved': True,
                'preview': f'{cdn}/tshirt-full-texture-preview.jpg',
            },
            {
                'name': 'Camiseta Logo Personalizado',
                'description': 'Modelo 3D optimizado para estampado de logos',
                'cloudinary_url': f'{cdn}/tshirt-logo.glb',
                'file_type': 'glb',
                'is_active': True,
                'is_approved': False,
                'preview': f'{cdn}/tshirt-logo-preview.jpg',
            },
        ]
        created = 0
        for data in models_data:
            model, was_created = Model3D.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'cloudinary_url': data['cloudinary_url'],
                    'file_type': data['file_type'],
                    'is_active': data['is_active'],
                    'is_approved': data['is_approved'],
                }
            )
            if was_created:
                created += 1
                Model3DImage.objects.create(
                    model_3d=model,
                    cloudinary_url=data['preview'],
                    is_main=True,
                    order=1
                )
        self.stdout.write(f'  Modelos 3D creados: {created}')

    def _create_catalog_relations(self):
        from apps.catalog.models import ProductCategory, Category
        from apps.products.models import Product
        for product in Product.objects.all():
            cat_name = 'Camisetas'
            if 'Polo' in product.name:
                cat_name = 'Polos'
            elif 'Chaqueta' in product.name:
                cat_name = 'Chaquetas'
            category = Category.objects.filter(name=cat_name).first()
            if category:
                ProductCategory.objects.get_or_create(product=product, category=category)
        self.stdout.write(f'  Relaciones de catálogo creadas')
