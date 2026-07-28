import ssl
from decimal import Decimal
from io import BytesIO
from urllib.request import urlopen

from django.core.files import File
from django.core.management.base import BaseCommand

from apps.catalog.models import Category, ProductCategory
from apps.products.models import Product, ProductImage, Variant

PRODUCTS = [
    {
        "name": "Buzo Confort Caramelo",
        "description": "Buzo confort tipo hoodie, tacto suave color caramelo. Ideal para looks casuales.",
        "price": 49.99,
        "image_url": "https://res.cloudinary.com/dpu8xwbbh/image/upload/v1782874424/dunay-comfy-too-caramelo-Buzo_confort_tipo_hoddie_tacto_suave_caramelo_mujer_S_teeuh9.webp",
    },
    {
        "name": "Buzo con Capucha Hombre",
        "description": "Buzo con capucha manga larga con gráfico estampado. Diseño moderno y cómodo.",
        "price": 55.00,
        "image_url": "https://res.cloudinary.com/dpu8xwbbh/image/upload/v1782874423/Buzo_con_Capucha_Manga_Larga_con_gr%C3%A1fico_Hombre_AE_nfw5gz.webp",
    },
    {
        "name": "Camisa Mujer Mockup",
        "description": "Camisa moderna con diseño mockup. Perfecta para cualquier ocasión.",
        "price": 35.00,
        "image_url": "https://res.cloudinary.com/dpu8xwbbh/image/upload/v1782874422/men-s-shirts-mockup-design-template-mockup-free-photo_wxkohu.jpg",
    },
    {
        "name": "Camisa Oxford Tallas Grandes",
        "description": "Camisa Oxford clásica disponible en tallas grandes. Elegante y resistente.",
        "price": 42.50,
        "image_url": "https://res.cloudinary.com/dpu8xwbbh/image/upload/v1782874421/CAMISAS-OXFORD-TALLAS-GRANDES_3-300x300_mfs3oo.jpg",
    },
    {
        "name": "Camisa Columbia Manga Larga",
        "description": "Camisa estilo Columbia de manga larga. Ideal para uso diario o actividades al aire libre.",
        "price": 48.00,
        "image_url": "https://res.cloudinary.com/dpu8xwbbh/image/upload/v1782874421/camisas-estilo-columbia-manga-larga_ec37eo.jpg",
    },
    {
        "name": "Camisa Diseño Serpientes",
        "description": "Camisa con diseño estampado de serpientes. Estilo único y llamativo.",
        "price": 38.00,
        "image_url": "https://res.cloudinary.com/dpu8xwbbh/image/upload/v1782874400/imagen_camisa_dise%C3%B1o_Serpientes_pulzdq.webp",
    },
    {
        "name": "Chaqueta Goku Drip",
        "description": "Chaqueta tipo puffer con diseño inspirado en Goku Drip. Edición especial.",
        "price": 65.00,
        "image_url": "https://res.cloudinary.com/dpu8xwbbh/image/upload/v1782874339/Goku-Drip-Puffer-Jacket-Black_tnddgc.webp",
    },
]

SIZES = ['S', 'M', 'L', 'XL']
COLORS = ['Rojo', 'Azul', 'Negro', 'Blanco']

CATEGORIES = ['Camisetas', 'Buzos', 'Chaquetas', 'Accesorios', 'Ofertas']


def _download(url):
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    download_url = url.replace("/upload/", "/upload/w_800,h_800,c_pad/")
    resp = urlopen(download_url, timeout=30, context=ctx)
    return BytesIO(resp.read())


class Command(BaseCommand):
    help = 'Crea productos de prueba con imágenes desde Cloudinary'

    def handle(self, *args, **options):
        for cat_name in CATEGORIES:
            Category.objects.get_or_create(name=cat_name, defaults={"description": f"Productos de {cat_name}"})

        created = 0
        skipped = 0
        images_ok = 0
        images_fail = 0

        for i, pdata in enumerate(PRODUCTS):
            product, is_new = Product.objects.get_or_create(
                name=pdata["name"],
                defaults={
                    "description": pdata["description"],
                    "base_price": Decimal(str(pdata["price"])),
                    "is_active": True,
                    "is_approved": True,
                },
            )
            if is_new:
                created += 1
            else:
                skipped += 1

            if is_new and not product.images.exists():
                try:
                    data = _download(pdata["image_url"])
                    img = ProductImage(product=product, is_main=True, order=1)
                    ext = pdata["image_url"].rsplit(".", 1)[-1].split("?")[0]
                    img.image.save(f"{product.name}.{ext}", File(data), save=True)
                    images_ok += 1
                except Exception as e:
                    images_fail += 1
                    self.stdout.write(self.style.WARNING(f"  Imagen falló para {product.name}: {e}"))

            if is_new:
                for size in SIZES[:2]:
                    for color in COLORS[:2]:
                        Variant.objects.get_or_create(
                            product=product,
                            size=size,
                            color=color,
                            defaults={"stock": 20},
                        )

            cat = Category.objects.order_by("?").first()
            if cat:
                ProductCategory.objects.get_or_create(product=product, category=cat)

        self.stdout.write(self.style.SUCCESS(f"Productos nuevos: {created} | ya existían: {skipped}"))
        self.stdout.write(self.style.SUCCESS(f"Imágenes subidas: {images_ok} | fallos: {images_fail}"))
