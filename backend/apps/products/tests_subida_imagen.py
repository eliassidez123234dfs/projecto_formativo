"""
Pruebas del endpoint de subida de imágenes a Cloudinary.

En la rama java/mongoDB el producto no tiene fila en products_product, así que
el alta de imágenes normal (que exige la FK) no sirve. Este endpoint sube solo
el archivo y devuelve el public_id, que luego Spring registra en MongoDB.

Las pruebas usan un storage en memoria: suben de verdad al storage configurado,
pero a una carpeta temporal del test, sin tocar Cloudinary ni la red.
"""
import io
import shutil
import tempfile

from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from urllib.parse import urlencode

from django.urls import reverse
from PIL import Image

MEDIA_TMP = tempfile.mkdtemp(prefix='pruebas-subida-')


def imagen_valida():
    """Un PNG de 2x2 en memoria."""
    buffer = io.BytesIO()
    Image.new('RGB', (2, 2), (200, 30, 30)).save(buffer, format='PNG')
    return SimpleUploadedFile('camiseta.png', buffer.getvalue(), content_type='image/png')


@override_settings(MEDIA_ROOT=MEDIA_TMP)
class SubidaImagenTest(TestCase):

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(MEDIA_TMP, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        # El storage en memoria es más rápido y aísla las pruebas entre sí.
        self._storage_original = default_storage
        from django.core.files.storage import FileSystemStorage
        FileSystemStorage.location = MEDIA_TMP
        for archivo in FileSystemStorage().listdir('')[1]:
            archivo.delete()

    def _url(self):
        return reverse('product-image-upload')

    def _url_discard(self, nombre=''):
        # El nombre va en la query string, no en el cuerpo: axios lo manda
        # como params y un DELETE con cuerpo es ambiguo (proxy algunos lo
        # ignoran). El test client de Django pone 'data' en el cuerpo, asi
        # que hay que componer la URL a mano para probar lo mismo.
        if not nombre:
            return reverse('product-image-discard')
        return f"{reverse('product-image-discard')}?{urlencode({'name': nombre})}"

    def _admin(self):
        from django.contrib.auth import get_user_model
        return get_user_model().objects.create_user(
            usuario='admin', correo='admin@prueba.co', contrasena='x',
            rol='Administrador', estado='Activo',
        )

    def test_sube_la_imagen_y_devuelve_el_public_id(self):
        self.client.force_login(self._admin())

        respuesta = self.client.post(self._url(), {'image': imagen_valida()})

        self.assertEqual(respuesta.status_code, 201)
        datos = respuesta.json()
        self.assertIn('image', datos)
        self.assertTrue(
            datos['image'].startswith('products/'),
            f"el public_id debe ir en la carpeta de productos: {datos['image']}",
        )
        self.assertIn('image_url', datos)

    def test_la_subida_no_crea_ninguna_imagen_de_producto(self):
        """El archivo se sube, pero la fila la crea Spring, no Django.

        Si este endpoint creara un ProductImage necesitaría la FK del producto,
        que es justo lo que no existe en la rama MongoDB.
        """
        from apps.products.models import ProductImage
        self.client.force_login(self._admin())

        self.client.post(self._url(), {'image': imagen_valida()})

        self.assertEqual(
            ProductImage.objects.count(),
            0,
            'la subida no debe tocar products_productimage',
        )

    def test_exige_archivo(self):
        self.client.force_login(self._admin())

        respuesta = self.client.post(self._url(), {})

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('image', respuesta.json())

    def test_rechaza_un_archivo_que_no_es_imagen(self):
        """Cloudinary aceptaría un PDF renombrado a .jpg; aquí se corta antes."""
        self.client.force_login(self._admin())
        falso = SimpleUploadedFile(
            'camiseta.png', b'%PDF-1.4 no soy una imagen', content_type='image/png')

        respuesta = self.client.post(self._url(), {'image': falso})

        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('image', respuesta.json())

    def test_rechaza_un_archivo_vacio(self):
        self.client.force_login(self._admin())
        vacio = SimpleUploadedFile('vacia.png', b'', content_type='image/png')

        respuesta = self.client.post(self._url(), {'image': vacio})

        self.assertEqual(respuesta.status_code, 400)

    def test_rechaza_un_archivo_demasiado_grande(self):
        self.client.force_login(self._admin())
        grande = SimpleUploadedFile(
            'enorme.png', b'x' * (5 * 1024 * 1024 + 1), content_type='image/png')

        respuesta = self.client.post(self._url(), {'image': grande})

        self.assertEqual(respuesta.status_code, 400)

    def test_un_visitante_no_puede_subir(self):
        """Sigue siendo un endpoint de admin: subir es escribir."""
        respuesta = self.client.post(self._url(), {'image': imagen_valida()})

        self.assertIn(respuesta.status_code, (401, 403))

    def test_descartar_borra_el_archivo_subido(self):
        """La contraparte: lo que se sube y no se usa, se borra."""
        from django.core.files.storage import default_storage
        self.client.force_login(self._admin())
        subido = self.client.post(self._url(), {'image': imagen_valida()}).json()

        respuesta = self.client.delete(self._url_discard(subido['image']))

        self.assertEqual(respuesta.status_code, 200)
        self.assertTrue(respuesta.json()['borrada'])
        self.assertFalse(
            default_storage.exists(subido['image']),
            'el archivo debe desaparecer de Cloudinary',
        )

    def test_descartar_lo_que_no_existe_no_falla(self):
        """Debe poder repetirse sin error: es la limpieza de un descuido."""
        self.client.force_login(self._admin())

        respuesta = self.client.delete(
            self._url_discard('products/2020/01/nunca-existio'))

        self.assertEqual(respuesta.status_code, 200)
        self.assertFalse(respuesta.json()['borrada'])

    def test_descartar_exige_el_parametro(self):
        self.client.force_login(self._admin())

        self.assertEqual(self.client.delete(self._url_discard()).status_code, 400)

    def test_descartar_no_sale_de_la_carpeta_de_productos(self):
        """Sin esto, el endpoint seria un borrado arbitrario del bucket."""
        from django.core.files.storage import default_storage
        self.client.force_login(self._admin())
        fuera = default_storage.save('facturacion/2026/09/factura.pdf', imagen_valida())

        respuesta = self.client.delete(self._url_discard(fuera))

        self.assertEqual(respuesta.status_code, 400)
        self.assertTrue(
            default_storage.exists(fuera),
            'un archivo fuera de products/ no debe poder borrarse por aqui',
        )
        default_storage.delete(fuera)

    def test_un_visitante_no_puede_descartar(self):
        from django.core.files.storage import default_storage
        subido = default_storage.save('products/2026/09/ajena.png', imagen_valida())

        respuesta = self.client.delete(self._url_discard(subido))

        self.assertIn(respuesta.status_code, (401, 403))
        default_storage.delete(subido)
