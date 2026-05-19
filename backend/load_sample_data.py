#!/usr/bin/env python
"""
Script para cargar productos de ejemplo con imágenes reales.
Ejecutar con: python load_sample_data.py
"""

import os
import sys
import django
import shutil
from pathlib import Path
from decimal import Decimal

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files import File
from django.db import transaction
from apps.products.models import Product, ProductImage, Variant
from apps.catalog.models import Category, ProductCategory


def load_sample_products():
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
            'base_price': Decimal('89.99'),
            'images': [],  # .webp no soportado
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
            'base_price': Decimal('59.99'),
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
            'base_price': Decimal('129.99'),
            'images': [],  # .webp no soportado
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
            'base_price': Decimal('69.99'),
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
            'base_price': Decimal('79.99'),
            'images': [],  # .webp no soportado
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
            'base_price': Decimal('54.99'),
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
            'base_price': Decimal('34.99'),
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
            print(f'Procesando producto {i}/{len(sample_products)}: {product_data["name"]}')
            
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
                print(f'  ✅ Producto creado: {product.name}')
            else:
                print(f'  📝 Producto actualizado: {product.name}')
            
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
                        safe_name = product.name.replace(' ', '_').replace('/', '_').replace('ñ', 'n').lower()
                        dest_filename = f"{safe_name}{file_extension}"
                        dest_path = media_dir / dest_filename
                        
                        # Copiar archivo
                        shutil.copy2(source_path, dest_path)
                        
                        # Crear ProductImage sin validación de resolución
                        try:
                            with open(dest_path, 'rb') as f:
                                product_image = ProductImage.objects.create(
                                    product=product,
                                    image=File(f, name=dest_filename),
                                    is_main=not image_found  # Primera imagen como principal
                                )
                                print(f'    📷 Imagen agregada: {dest_filename}')
                                image_found = True
                        except Exception as e:
                            print(f'    ⚠️  Error al crear imagen: {e}')
                        break
            
            if not image_found:
                print(f'  ⚠️  No se encontraron imágenes para: {product.name}')
            
            # Crear variantes
            for variant_data in product_data['variants']:
                variant, created = Variant.objects.get_or_create(
                    product=product,
                    size=variant_data['size'],
                    color=variant_data['color'],
                    defaults={'stock': variant_data['stock']}
                )
                if created:
                    print(f'    📦 Variante creada: {variant.size} / {variant.color} (Stock: {variant.stock})')
            
            # Asignar categorías
            for category_name in product_data['categories']:
                category, created = Category.objects.get_or_create(
                    name=category_name,
                    defaults={'is_active': True}
                )
                if created:
                    print(f'    🏷️  Categoría creada: {category.name}')
                
                ProductCategory.objects.get_or_create(
                    product=product,
                    category=category
                )
            
            print('')  # Línea en blanco

    print('\n✅ Productos de ejemplo cargados exitosamente!')
    print(f'Total productos: {Product.objects.count()}')
    print(f'Total imágenes: {ProductImage.objects.count()}')
    print(f'Total variantes: {Variant.objects.count()}')
    print(f'Total categorías: {Category.objects.count()}')


if __name__ == '__main__':
    load_sample_products()
