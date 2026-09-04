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

## Seguridad

- `API_SECRET` nunca se expone al frontend
- Las subidas pasan por Django (el backend firma y controla)
- Los signals de cleanup evitan acumulación de assets
- Solo se permiten formatos JPG/PNG (validado en modelo y serializer)
