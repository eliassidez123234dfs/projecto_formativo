from django.core.management.base import BaseCommand
from django.core.files import File
from django.db import transaction
import os
import shutil
from pathlib import Path

from apps.products.models import Product, ProductImage, Variant
from apps.catalog.models import Category, ProductCategory


class Command(BaseCommand):
    help = 'Cargar productos de ejemplo con imágenes reales'

    def handle(self, *args, **options):
        # Directorios de imágenes
        image_sources = [
            '/home/South_Knight/Documentos/red_estampacion/assets/img_camisas',
            '/home/South_Knight/Documentos/crud-django/media/productos/galeria'
        ]
        
        # Productos de ejemplo
        sample_products = [
            {
                'name': 'Buzo con Capucha Hombre AE',
                'description': 'Buzo con capucha manga larga con gráfico moderno. Perfecto para estilo urbano.',
                'base_price': 89.99,
                'images': ['Buzo con Capucha Manga Larga con gráfico Hombre AE.webp'],
                'variants': [
                    {'size': 'S', 'color': 'Negro', 'stock': 15},
                    {'size': 'M', 'color': 'Negro', 'stock': 20},
                    {'size': 'L', 'color': 'Negro', 'stock': 15},
                    {'size': 'XL', 'color': 'Negro', 'stock': 10},
                ],
                'categories': ['Ropa Hombre', 'Buzos']
            },
            {
                'name': 'Camisa Oxford Talla Grande',
                'description': 'Camisa estilo Oxford clásica, disponible en tallas grandes. Elegante y cómoda.',
                'base_price': 59.99,
                'images': ['CAMISAS-OXFORD-TALLAS-GRANDES_3-300x300.jpg'],
                'variants': [
                    {'size': 'L', 'color': 'Blanco', 'stock': 12},
                    {'size': 'XL', 'color': 'Blanco', 'stock': 10},
                    {'size': 'XXL', 'color': 'Blanco', 'stock': 8},
                ],
                'categories': ['Camisas', 'Ropa Hombre']
            },
            {
                'name': 'Goku Drip Puffer Jacket',
                'description': 'Chaqueta puffer estilo Goku Drip, diseño urbano moderno con temática anime.',
                'base_price': 129.99,
                'images': ['Goku-Drip-Puffer-Jacket-Black.webp'],
                'variants': [
                    {'size': 'M', 'color': 'Negro', 'stock': 8},
                    {'size': 'L', 'color': 'Negro', 'stock': 12},
                    {'size': 'XL', 'color': 'Negro', 'stock': 6},
                ],
                'categories': ['Chaquetas', 'Ropa Hombre', 'Anime']
            },
            {
                'name': 'Camisa Columbia Manga Larga',
                'description': 'Camisa estilo Columbia manga larga, perfecta para exteriores y aventuras.',
                'base_price': 69.99,
                'images': ['camisas-estilo-columbia-manga-larga.jpg'],
                'variants': [
                    {'size': 'S', 'color': 'Azul', 'stock': 10},
                    {'size': 'M', 'color': 'Azul', 'stock': 15},
                    {'size': 'L', 'color': 'Azul', 'stock': 12},
                ],
                'categories': ['Camisas', 'Ropa Exterior']
            },
            {
                'name': 'Buzo Caramelo Confort Mujer',
                'description': 'Buzo tipo hoodie tacto suave color caramelo, máximo confort para mujer.',
                'base_price': 79.99,
                'images': ['dunay-comfy-too-caramelo-Buzo confort tipo hoddie tacto suave caramelo mujer S.webp'],
                'variants': [
                    {'size': 'S', 'color': 'Caramelo', 'stock': 18},
                    {'size': 'M', 'color': 'Caramelo', 'stock': 22},
                    {'size': 'L', 'color': 'Caramelo', 'stock': 15},
                ],
                'categories': ['Buzos', 'Ropa Mujer']
            },
            {
                'name': 'Camisa Diseño Serpientes',
                'description': 'Camisa con diseño original de serpientes, estilo único y llamativo.',
                'base_price': 54.99,
                'images': ['imagen_camisa_diseño_Serpientes.webp'],
                'variants': [
                    {'size': 'M', 'color': 'Blanco', 'stock': 14},
                    {'size': 'L', 'color': 'Blanco', 'stock': 16},
                    {'size': 'XL', 'color': 'Blanco', 'stock': 10},
                ],
                'categories': ['Camisas', 'Diseño Original']
            },
            {
                'name': 'Camisa Mockup Design',
                'description': 'Camisa básica mockup template, perfecta para personalizar con diseños.',
                'base_price': 34.99,
                'images': ['men-s-shirts-mockup-design-template-mockup-free-photo.jfif'],
                'variants': [
                    {'size': 'S', 'color': 'Blanco', 'stock': 25},
                    {'size': 'M', 'color': 'Blanco', 'stock': 30},
                    {'size': 'L', 'color': 'Blanco', 'stock': 20},
                    {'size': 'XL', 'color': 'Blanco', 'stock': 15},
                ],
                'categories': ['Camisas', 'Básicos']
            }
        ]

        with transaction.atomic():
            for i, product_data in enumerate(sample_products, 1):
                self.stdout.write(f'Procesando producto {i}/{len(sample_products)}: {product_data["name"]}')
                
                # Crear o obtener el producto
                product, created = Product.objects.get_or_create(
                    name=product_data['name'],
                    defaults={
                        'description': product_data['description'],
                        'base_price': product_data['base_price'],
                        'is_active': True,
                        'is_approved': True,
                    }
                )
                
                if created:
                    self.stdout.write(f'  ✅ Producto creado: {product.name}')
                else:
                    self.stdout.write(f'  📝 Producto actualizado: {product.name}')
                
                # Buscar y copiar imágenes
                image_found = False
                for source_dir in image_sources:
                    for image_name in product_data['images']:
                        source_path = os.path.join(source_dir, image_name)
                        if os.path.exists(source_path):
                            # Copiar imagen al media directory
                            media_dir = Path('media/products/2026/05')
                            media_dir.mkdir(parents=True, exist_ok=True)
                            
                            # Generar nombre único
                            file_extension = Path(image_name).suffix
                            dest_filename = f"{product.name.replace(' ', '_').lower()}{file_extension}"
                            dest_path = media_dir / dest_filename
                            
                            # Copiar archivo
                            shutil.copy2(source_path, dest_path)
                            
                            # Crear ProductImage
                            with open(dest_path, 'rb') as f:
                                product_image = ProductImage.objects.create(
                                    product=product,
                                    image=File(f, name=dest_filename),
                                    is_main=not image_found  # Primera imagen como principal
                                )
                                self.stdout.write(f'    📷 Imagen agregada: {dest_filename}')
                                image_found = True
                            break
                
                if not image_found:
                    self.stdout.write(f'  ⚠️  No se encontraron imágenes para: {product.name}')
                
                # Crear variantes
                for variant_data in product_data['variants']:
                    variant, created = Variant.objects.get_or_create(
                        product=product,
                        size=variant_data['size'],
                        color=variant_data['color'],
                        defaults={'stock': variant_data['stock']}
                    )
                    if created:
                        self.stdout.write(f'    📦 Variante creada: {variant.size} / {variant.color} (Stock: {variant.stock})')
                
                # Asignar categorías
                for category_name in product_data['categories']:
                    category, created = Category.objects.get_or_create(
                        name=category_name,
                        defaults={'is_active': True}
                    )
                    if created:
                        self.stdout.write(f'    🏷️  Categoría creada: {category.name}')
                    
                    ProductCategory.objects.get_or_create(
                        product=product,
                        category=category
                    )
                
                self.stdout.write('')  # Línea en blanco

        self.stdout.write(self.style.SUCCESS('✅ Productos de ejemplo cargados exitosamente!'))
        self.stdout.write(f'Total productos: {Product.objects.count()}')
        self.stdout.write(f'Total imágenes: {ProductImage.objects.count()}')
        self.stdout.write(f'Total variantes: {Variant.objects.count()}')
        self.stdout.write(f'Total categorías: {Category.objects.count()}')
