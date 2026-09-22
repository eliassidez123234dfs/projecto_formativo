import ssl
from decimal import Decimal
from io import BytesIO
from random import randint
from urllib.request import urlopen

from django.core.files import File
from django.core.management.base import BaseCommand

from apps.catalog.models import Category, ProductCategory
from apps.products.models import Product, ProductImage, Variant

COLOR_MAP = {
    'rojo': '#DC2626', 'azul': '#2563EB', 'negro': '#111827',
    'blanco': '#FFFFFF', 'verde': '#16A34A', 'gris': '#6B7280',
    'amarillo': '#EAB308', 'naranja': '#EA580C', 'morado': '#9333EA',
    'rosa': '#EC4899', 'crema': '#FEF3C7', 'beige': '#F5F5DC',
    'cafe': '#78350F', 'marino': '#1E3A5F', 'vino': '#7F1D1D',
}

IMAGES = [
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765147/aldbzoymcnnxgx6ot1sp.webp",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765144/d9f0whf6tr1s3lvvjg2l.webp",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765150/gqkdynnigxvlr83nza2n.jpg",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765146/zkds6hd9dvwyhsrgtux7.jpg",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765146/zkds6hd9dvwyhsrgtux7.jpg",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765149/dlxcohqosezulvqoexyy.webp",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765149/oxwcfblehvvknq42kcvf.webp",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765151/e03solsr7l0kscqbbwnd.webp",
    "https://res.cloudinary.com/doa7qxr0d/image/upload/v1788765147/ybprnq2txdf8mgluk2o6.jpg",
]

CATEGORIES = ['Camisetas', 'Buzos', 'Chaquetas', 'Pantalones', 'Accesorios', 'Ofertas', 'Novedades']

PRODUCTS = [
    {"name": "Buzo Confort Caramelo", "desc": "Buzo tipo hoodie tacto suave color caramelo.", "price": 49000, "img": 0,
     "sizes": ["S", "M", "L"], "colors": ["crema", "cafe", "negro"], "stocks": [25, 30, 15], "cats": ["Buzos", "Ofertas"]},
    {"name": "Buzo Capucha Gráfico AE", "desc": "Buzo con capucha manga larga y gráfico estampado.", "price": 55000, "img": 1,
     "sizes": ["M", "L", "XL"], "colors": ["negro", "gris", "azul"], "stocks": [40, 20, 10], "cats": ["Buzos", "Novedades"]},
    {"name": "Buzo Oversize Algodón", "desc": "Buzo oversized 100% algodón. Corte relajado.", "price": 52000, "img": 0,
     "sizes": ["S", "M", "L", "XL"], "colors": ["blanco", "gris"], "stocks": [35, 45], "cats": ["Buzos"]},
    {"name": "Buzo Crop Mujer", "desc": "Buzo cropped para mujer. Tendencia streetwear.", "price": 42000, "img": 7,
     "sizes": ["XS", "S", "M"], "colors": ["rosa", "morado", "crema"], "stocks": [12, 18, 8], "cats": ["Buzos", "Novedades"]},
    {"name": "Buzo Deportivo Tech", "desc": "Buzo tech deportivo con cierre frontal.", "price": 68000, "img": 1,
     "sizes": ["S", "M", "L", "XL"], "colors": ["negro", "marino"], "stocks": [22, 15], "cats": ["Buzos", "Accesorios"]},
    {"name": "Camisa Oxford Clásica", "desc": "Camisa Oxford de algodón. Elegante para ocasiones formales.", "price": 45000, "img": 3,
     "sizes": ["S", "M", "L", "XL"], "colors": ["blanco", "azul", "crema"], "stocks": [30, 25, 20], "cats": ["Camisetas"]},
    {"name": "Camisa Columbia Outdoor", "desc": "Camisa estilo Columbia manga larga.", "price": 58000, "img": 3,
     "sizes": ["M", "L", "XL"], "colors": ["verde", "cafe", "marino"], "stocks": [15, 10, 8], "cats": ["Camisetas", "Accesorios"]},
    {"name": "Camisa Estampado Serpientes", "desc": "Camisa con estampado de serpientes.", "price": 38000, "img": 5,
     "sizes": ["S", "M", "L"], "colors": ["negro", "vino"], "stocks": [20, 14], "cats": ["Camisetas", "Novedades"]},
    {"name": "Camisa Mockup Moderna", "desc": "Camisa moderna con corte regular.", "price": 35000, "img": 2,
     "sizes": ["XS", "S", "M", "L"], "colors": ["blanco", "gris", "azul"], "stocks": [40, 50, 35], "cats": ["Camisetas"]},
    {"name": "Camisa Manga Corta Tropical", "desc": "Camisa manga corta estampado tropical.", "price": 32000, "img": 5,
     "sizes": ["S", "M", "L"], "colors": ["naranja", "verde", "amarillo"], "stocks": [18, 25, 12], "cats": ["Camisetas", "Ofertas"]},
    {"name": "Camisa Flannel Rústica", "desc": "Camisa de flannel rústica.", "price": 48000, "img": 4,
     "sizes": ["M", "L", "XL"], "colors": ["cafe", "rojo", "negro"], "stocks": [10, 8, 5], "cats": ["Camisetas"]},
    {"name": "Chaqueta Goku Drip", "desc": "Chaqueta puffer con diseño inspirado en anime.", "price": 75000, "img": 6,
     "sizes": ["S", "M", "L", "XL"], "colors": ["negro", "azul"], "stocks": [8, 12], "cats": ["Chaquetas", "Novedades"]},
    {"name": "Chaqueta Cuero Sintético", "desc": "Chaqueta de cuero sintético.", "price": 85000, "img": 6,
     "sizes": ["M", "L"], "colors": ["negro", "cafe"], "stocks": [6, 4], "cats": ["Chaquetas"]},
    {"name": "Chaqueta Bomber Premium", "desc": "Chaqueta bomber premium con forro interior.", "price": 95000, "img": 8,
     "sizes": ["S", "M", "L", "XL"], "colors": ["marino", "negro", "verde"], "stocks": [10, 8, 5], "cats": ["Chaquetas", "Ofertas"]},
    {"name": "Chaqueta Deportiva Windbreaker", "desc": "Windbreaker ligero y resistente al viento.", "price": 62000, "img": 8,
     "sizes": ["XS", "S", "M", "L"], "colors": ["azul", "naranja"], "stocks": [20, 15], "cats": ["Chaquetas", "Accesorios"]},
    {"name": "Chaqueta Acolchada Niños", "desc": "Chaqueta acolchada para niños.", "price": 45000, "img": 6,
     "sizes": ["XS", "S", "M"], "colors": ["rojo", "azul", "verde"], "stocks": [14, 18, 10], "cats": ["Chaquetas"]},
    {"name": "Jeans Slim Fit", "desc": "Jeans slim fit de algodón elástico.", "price": 55000, "img": 4,
     "sizes": ["S", "M", "L", "XL"], "colors": ["azul", "negro"], "stocks": [30, 25], "cats": ["Pantalones"]},
    {"name": "Jogger Deportivo", "desc": "Jogger deportivo con cordón.", "price": 38000, "img": 4,
     "sizes": ["S", "M", "L"], "colors": ["negro", "gris", "verde"], "stocks": [40, 35, 20], "cats": ["Pantalones", "Accesorios"]},
    {"name": "Pantalón Cargo Militar", "desc": "Pantalón cargo con múltiples bolsillos.", "price": 52000, "img": 8,
     "sizes": ["M", "L", "XL"], "colors": ["verde", "cafe", "negro"], "stocks": [12, 8, 15], "cats": ["Pantalones", "Novedades"]},
    {"name": "Pantalón Formal Gabardina", "desc": "Pantalón formal de gabardina.", "price": 65000, "img": 4,
     "sizes": ["S", "M", "L", "XL"], "colors": ["negro", "marino", "gris"], "stocks": [18, 22, 14], "cats": ["Pantalones"]},
    {"name": "Gorra snapback Básica", "desc": "Gorra snapback con cierre ajustable.", "price": 22000, "img": 2,
     "sizes": ["M"], "colors": ["negro", "blanco", "rojo", "azul"], "stocks": [50, 45, 30, 35], "cats": ["Accesorios"]},
    {"name": "Beanie Ribbed Invierno", "desc": "Gorro beanie ribbed de lana acrílica.", "price": 18000, "img": 2,
     "sizes": ["M"], "colors": ["negro", "gris", "rojo"], "stocks": [60, 40, 25], "cats": ["Accesorios", "Ofertas"]},
    {"name": "Camiseta Básica Algodón", "desc": "Camiseta 100% algodón.", "price": 25000, "img": 2,
     "sizes": ["S", "M", "L", "XL"], "colors": ["blanco", "negro", "gris"], "stocks": [80, 70, 60], "cats": ["Camisetas", "Ofertas"]},
    {"name": "Camiseta Estampado Abstracto", "desc": "Camiseta con estampado abstracto artístico.", "price": 32000, "img": 5,
     "sizes": ["S", "M", "L"], "colors": ["morado", "naranja", "rosa"], "stocks": [15, 20, 10], "cats": ["Camisetas", "Novedades"]},
    {"name": "Top Crop Deportivo", "desc": "Top crop deportivo con soporte.", "price": 28000, "img": 7,
     "sizes": ["XS", "S", "M"], "colors": ["rosa", "negro", "blanco"], "stocks": [25, 30, 20], "cats": ["Camisetas", "Accesorios"]},
    {"name": "Sudadera Capucha Slim", "desc": "Sudadera con capucha de corte slim.", "price": 48000, "img": 0,
     "sizes": ["S", "M", "L", "XL"], "colors": ["negro", "gris", "marino"], "stocks": [22, 28, 18], "cats": ["Buzos"]},
    {"name": "Chaqueta Jean Clásica", "desc": "Chaqueta de mezclilla clásica.", "price": 72000, "img": 8,
     "sizes": ["S", "M", "L"], "colors": ["azul"], "stocks": [15], "cats": ["Chaquetas"]},
    {"name": "Polo Deportivo Dri-Fit", "desc": "Polo deportivo material dri-fit.", "price": 35000, "img": 4,
     "sizes": ["S", "M", "L", "XL"], "colors": ["blanco", "negro", "azul", "verde"], "stocks": [30, 25, 20, 15], "cats": ["Camisetas", "Accesorios"]},
    {"name": "Short Deportivo Gym", "desc": "Short deportivo para gym con bolsillo lateral.", "price": 28000, "img": 4,
     "sizes": ["S", "M", "L"], "colors": ["negro", "gris"], "stocks": [45, 35], "cats": ["Pantalones", "Accesorios"]},
    {"name": "Camisa Linen Verano", "desc": "Camisa de lino fresca para verano.", "price": 55000, "img": 3,
     "sizes": ["M", "L", "XL"], "colors": ["crema", "blanco", "beige"], "stocks": [10, 8, 6], "cats": ["Camisetas", "Novedades"]},
]


def _download(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    download_url = url.replace("/upload/", "/upload/w_800,h_800,c_pad/")
    resp = urlopen(download_url, timeout=15, context=ctx)
    return BytesIO(resp.read())


class Command(BaseCommand):
    help = 'Crea productos de prueba con imágenes desde Cloudinary'

    def add_arguments(self, parser):
        parser.add_argument('--clean', action='store_true',
                            help='Eliminar productos existentes antes de crear nuevos')
        parser.add_argument('--skip-images', action='store_true',
                            help='No descargar imágenes (más rápido)')
        parser.add_argument('--skip-variants', action='store_true',
                            help='No crear variantes (más rápido)')

    def handle(self, *args, **options):
        skip_images = options['skip_images']
        skip_variants = options['skip_variants']

        if options['clean']:
            Product.objects.all().delete()
            self.stdout.write(self.style.WARNING("Todos los productos eliminados"))

        for cat_name in CATEGORIES:
            Category.objects.get_or_create(
                name=cat_name,
                defaults={"description": f"Categoría de {cat_name}"}
            )

        created = 0
        skipped = 0
        images_ok = 0
        images_fail = 0
        variants_ok = 0
        variants_fail = 0

        for idx, pdata in enumerate(PRODUCTS):
            self.stdout.write(f"[{idx+1}/{len(PRODUCTS)}] {pdata['name']}...", ending=' ')

            product, is_new = Product.objects.get_or_create(
                name=pdata["name"],
                defaults={
                    "description": pdata["desc"],
                    "base_price": Decimal(str(pdata["price"])),
                    "is_active": True,
                    "is_approved": True,
                },
            )
            if is_new:
                created += 1
                self.stdout.write(self.style.SUCCESS("nuevo"))
            else:
                skipped += 1
                self.stdout.write("ya existe, saltando")
                continue

            if not skip_images and not product.images.exists():
                try:
                    data = _download(IMAGES[pdata["img"]])
                    img = ProductImage(product=product, is_main=True, order=1)
                    ext = IMAGES[pdata["img"]].rsplit(".", 1)[-1].split("?")[0]
                    img.image.save(f"{product.name}.{ext}", File(data), save=True)
                    images_ok += 1
                except Exception as e:
                    images_fail += 1
                    self.stdout.write(self.style.WARNING(f"  imagen falló: {e}"))

            if not skip_variants:
                for size in pdata["sizes"]:
                    for cidx, color in enumerate(pdata["colors"]):
                        stock_list = pdata.get("stocks", [])
                        stock = stock_list[cidx] if cidx < len(stock_list) else randint(5, 40)
                        hex_color = COLOR_MAP.get(color, '#6B7280')
                        try:
                            Variant.objects.get_or_create(
                                product=product,
                                size=size,
                                color=color,
                                defaults={
                                    "stock": stock,
                                    "color_hex": hex_color,
                                    "color_nombre": color.replace('_', ' ').title(),
                                },
                            )
                            variants_ok += 1
                        except Exception as e:
                            variants_fail += 1
                            self.stdout.write(self.style.WARNING(f"  variante {size}/{color} falló: {e}"))

            for cat_name in pdata.get("cats", []):
                cat = Category.objects.filter(name=cat_name).first()
                if cat:
                    ProductCategory.objects.get_or_create(product=product, category=cat)

        self.stdout.write(self.style.SUCCESS(f"\n{'='*50}"))
        self.stdout.write(self.style.SUCCESS(f"Productos nuevos: {created} | Ya existían: {skipped}"))
        self.stdout.write(self.style.SUCCESS(f"Imágenes: {images_ok} OK, {images_fail} fallos"))
        self.stdout.write(self.style.SUCCESS(f"Variantes: {variants_ok} OK, {variants_fail} fallos"))
        self.stdout.write(self.style.SUCCESS(f"Total productos: {Product.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"Total variantes: {Variant.objects.count()}"))
        self.stdout.write(self.style.SUCCESS(f"{'='*50}"))
