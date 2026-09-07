# Cloudinary — Almacenamiento de imágenes (catálogo de productos)

## Decisión de arquitectura

Usamos Cloudinary como storage backend de Django a través de `django-cloudinary-storage`. Esto significa que **los modelos siguen usando `ImageField`** (no `CloudinaryField`), y Django sube automáticamente a Cloudinary al guardar. No hay cambios en los modelos, serializers ni vistas.

## Ventajas de este enfoque

- **Mínimo impacto en el código existente**: cero cambios en modelos, cero migraciones.
- **Validaciones existentes siguen funcionando**: el `clean()` de `ProductImage` valida antes de guardar.
- **Las URLs se devuelven como siempre**: `obj.image.url` retorna la URL de Cloudinary.
- **CDN global**: las imágenes se sirven desde Cloudinary, no desde el servidor Django.

## Configuración

### 1. Variables de entorno (`.env`)

```env
CLOUDINARY_CLOUD_NAME=dpu8xwbbh
CLOUDINARY_API_KEY=146373524157165
CLOUDINARY_API_SECRET=S0R7ET9m268MgQ_vvNbi19ZhSr4
```

### 2. `backend/requirements.txt`

```
cloudinary==1.44.2
django-cloudinary-storage==0.3.0
```

### 3. `backend/config/settings.py`

```python
INSTALLED_APPS = [
    ...
    'cloudinary_storage',  # antes de staticfiles
    'cloudinary',
]

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env('CLOUDINARY_CLOUD_NAME'),
    'API_KEY': env('CLOUDINARY_API_KEY'),
    'API_SECRET': env('CLOUDINARY_API_SECRET'),
}

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

cloudinary.config(
    cloud_name=CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=CLOUDINARY_STORAGE['API_KEY'],
    api_secret=CLOUDINARY_STORAGE['API_SECRET'],
    secure=True,
)
```

### 4. Modelos (sin cambios)

`ProductImage.image` sigue siendo `models.ImageField(upload_to='products/%Y/%m')`. Django lo sube a Cloudinary automáticamente.

## Cómo funciona el flujo

1. Admin o API recibe el archivo → `ProductImage.objects.create(image=file)`
2. El storage de Cloudinary sube el archivo y devuelve la URL
3. La URL se guarda como `image.name` en la DB
4. `image.url` devuelve la URL de Cloudinary con CDN
5. El frontend (React) recibe la URL desde la API y la muestra

## Cleanup de imágenes obsoletas

`backend/apps/products/signals.py` se encarga de eliminar imágenes de Cloudinary cuando:

- **Se borra un `ProductImage`** → se destruye el asset de Cloudinary
- **Se actualiza un `ProductImage`** y se reemplaza la imagen → se destruye la vieja

Esto evita acumular basura en la cuenta gratuita.

## API REST (sin cambios)

- `GET /api/products/{id}/` → `image_url` en la respuesta contiene la URL de Cloudinary
- `POST /api/products/{id}/images/` → sube imagen a Cloudinary vía storage
- `DELETE /api/products/{id}/images/{image_id}/` → borra de DB + Cloudinary (via signal)

## Frontend (React)

Las URLs que devuelve la API ya apuntan a Cloudinary. El frontend puede aplicar transformaciones directamente en la URL:

```jsx
<img
  src={`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_400,q_auto,f_auto/${publicId}`}
/>
```

O usar `@cloudinary/url-gen` para control más fino.

### Subida con Cloudinary Upload Widget (opción recomendada)

Para diseños personalizados del usuario conviene subir directamente desde el navegador con el
Cloudinary Upload Widget (preset **unsigned**), evitando que el backend reciba archivos pesados.
El widget devuelve la URL, que luego se envía al backend para asociarla al usuario.

```jsx
function SubirDisenio() {
  const cloudinaryRef = useRef();
  const widgetRef = useRef();

  useEffect(() => {
    cloudinaryRef.current = window.cloudinary;
    widgetRef.current = cloudinaryRef.current.createUploadWidget({
      cloudName: "tu_cloud",
      uploadPreset: "preset_disenios", // configurar en Cloudinary settings
      folder: "disenios",
      maxFiles: 1,
      cropping: true,
    }, (error, result) => {
      if (!error && result && result.event === "success") {
        const url = result.info.secure_url;
        fetch('/api/disenios/', { method: 'POST', body: JSON.stringify({ url }) });
      }
    });
  }, []);

  return <button onClick={() => widgetRef.current.open()}>Subir diseño</button>;
}
```

### Transformaciones para el editor 3D

Se puede superponer el diseño del usuario sobre una imagen base de camiseta sin procesamiento en el backend:

```
https://res.cloudinary.com/tu_cloud/image/upload/
  w_600,h_600,c_fill/
  l_disenios/usuario1234_disenio.png,w_250,g_north_east,x_100,y_80/
  camiseta_base.jpg
```

Para el editor 3D, cuando el usuario guarde su diseño se puede capturar el canvas (`canvas.toDataURL()`)
y subir la imagen a Cloudinary como base64 o blob para compartir la previsualización.

## Seguridad

- `API_SECRET` nunca se expone al frontend
- Las subidas pasan por Django (el backend firma y controla)
- Los signals de cleanup evitan acumulación de assets
- Solo se permiten formatos JPG/PNG (validado en modelo y serializer)
- Los **unsigned upload presets** limitan la carpeta destino y evitan exponer la API secret; para
  operaciones sensibles (borrar, modificar) se usa el backend con la API secret

## Empaquetado y escalabilidad

- Los contenedores de Django y React no almacenan archivos localmente; toda la media va a Cloudinary.
  La base de datos solo guarda referencias (public_id o URLs).
- Al escalar con réplicas del backend no hay conflicto con archivos compartidos; Cloudinary es el punto único externo.
- La CDN sirve las imágenes más rápido que el servidor propio, y permite lazy loading y `srcset` en React
  para cargar texturas optimizadas según dispositivo.
