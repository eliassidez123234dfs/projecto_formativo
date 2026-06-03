# Aplicación Models3D - Documentación

## Descripción

La app `models3d` permite gestionar modelos 3D con almacenamiento de URLs desde Cloudinary. Proporciona un sistema completo para guardar, organizar y servir modelos 3D con imágenes de preview.

## Estructura de la Aplicación

```
apps/models3d/
├── models.py          # Modelos de base de datos
├── admin.py           # Interfaz de administración
├── views.py           # Vistas (preparadas para expansión)
├── apps.py            # Configuración de la app
├── api/
│   ├── serializers.py # Serializadores DRF
│   ├── viewsets.py    # ViewSets de la API REST
│   └── urls.py        # Rutas de la API
└── migrations/        # Migraciones de base de datos
```

## Modelos

### Model3D
Modelo principal para almacenar información de modelos 3D.

**Campos principales:**
- `name` (CharField): Nombre único del modelo
- `description` (TextField): Descripción del modelo
- `cloudinary_url` (URLField): **URL segura (secure_url) del modelo en Cloudinary**
- `cloudinary_public_id` (CharField): ID público del archivo en Cloudinary
- `file_type` (CharField): Tipo de archivo (glb, gltf, obj, fbx, dae)
- `file_size` (BigIntegerField): Tamaño en bytes
- `is_active` (BooleanField): Estado del modelo
- `is_approved` (BooleanField): Si ha sido aprobado
- `created_at` / `updated_at` (DateTimeField): Timestamps

### Model3DImage
Modelo para almacenar imágenes de preview de los modelos 3D desde Cloudinary.

**Campos principales:**
- `model_3d` (ForeignKey): Referencia al Model3D
- `cloudinary_url` (URLField): **URL segura de la imagen en Cloudinary**
- `cloudinary_public_id` (CharField): ID público del archivo en Cloudinary
- `is_main` (BooleanField): Si es la imagen principal
- `order` (PositiveSmallIntegerField): Orden de presentación

## Endpoints de la API

### Modelos 3D

```
GET    /api/models3d/models/              # Listar todos los modelos
POST   /api/models3d/models/              # Crear un nuevo modelo
GET    /api/models3d/models/{id}/         # Obtener detalles de un modelo
PUT    /api/models3d/models/{id}/         # Actualizar un modelo
DELETE /api/models3d/models/{id}/         # Eliminar un modelo
GET    /api/models3d/models/active/       # Listar modelos activos
GET    /api/models3d/models/approved/     # Listar modelos aprobados
GET    /api/models3d/models/{id}/preview_images/  # Obtener imágenes de preview
POST   /api/models3d/models/{id}/add_preview_image/  # Agregar imagen de preview
```

### Imágenes

```
GET    /api/models3d/images/              # Listar todas las imágenes
POST   /api/models3d/images/              # Crear una nueva imagen
GET    /api/models3d/images/{id}/         # Obtener detalles de una imagen
PUT    /api/models3d/images/{id}/         # Actualizar una imagen
DELETE /api/models3d/images/{id}/         # Eliminar una imagen
```

## Ejemplo de Uso

### 1. Crear un Modelo 3D

```bash
POST /api/models3d/models/
Content-Type: application/json

{
  "name": "T-Shirt 3D Red",
  "description": "Modelo 3D de una camiseta roja",
  "cloudinary_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456/tshirt-red.glb",
  "cloudinary_public_id": "your-folder/tshirt-red",
  "file_type": "glb",
  "file_size": 2048576,
  "is_active": true,
  "is_approved": false
}
```

### 2. Agregar una Imagen de Preview

```bash
POST /api/models3d/models/1/add_preview_image/
Content-Type: application/json

{
  "cloudinary_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456/tshirt-preview.jpg",
  "cloudinary_public_id": "your-folder/tshirt-preview",
  "is_main": true,
  "order": 1
}
```

### 3. Obtener Modelos Aprobados

```bash
GET /api/models3d/models/approved/
```

## Respuesta de Ejemplo

```json
{
  "id": 1,
  "name": "T-Shirt 3D Red",
  "description": "Modelo 3D de una camiseta roja",
  "cloudinary_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456/tshirt-red.glb",
  "cloudinary_public_id": "your-folder/tshirt-red",
  "file_type": "glb",
  "file_size": 2048576,
  "is_active": true,
  "is_approved": true,
  "preview_images": [
    {
      "id": 1,
      "cloudinary_url": "https://res.cloudinary.com/your-cloud/image/upload/v123456/tshirt-preview.jpg",
      "cloudinary_public_id": "your-folder/tshirt-preview",
      "is_main": true,
      "order": 1,
      "created_at": "2025-03-15T10:30:00Z"
    }
  ],
  "created_at": "2025-03-15T10:30:00Z",
  "updated_at": "2025-03-15T10:30:00Z"
}
```

## Pasos para Usar

### 1. Aplicar Migraciones

```bash
python manage.py migrate
```

### 2. Crear Superusuario (si no existe)

```bash
python manage.py createsuperuser
```

### 3. Acceder al Admin

Ve a `http://localhost:8000/admin/` para gestionar los modelos 3D desde la interfaz de administración.

### 4. Usar la API

Utiliza los endpoints mencionados para crear y gestionar modelos 3D.

## Flujo de Integración con Cloudinary

### En el Frontend (React)

```javascript
// Ejemplo de carga a Cloudinary
const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "your_upload_preset");
  
  const response = await fetch(
    "https://api.cloudinary.com/v1_1/your_cloud_name/upload",
    {
      method: "POST",
      body: formData
    }
  );
  
  const data = await response.json();
  return {
    cloudinary_url: data.secure_url,
    cloudinary_public_id: data.public_id,
    file_size: data.bytes
  };
};

// Ejemplo de creación del modelo 3D
const createModel3D = async (modelData) => {
  const cloudinaryData = await uploadToCloudinary(modelData.file);
  
  const response = await fetch('/api/models3d/models/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: modelData.name,
      description: modelData.description,
      cloudinary_url: cloudinaryData.cloudinary_url,
      cloudinary_public_id: cloudinaryData.cloudinary_public_id,
      file_type: 'glb',
      file_size: cloudinaryData.file_size,
      is_active: true,
      is_approved: false
    })
  });
  
  return response.json();
};
```

## Notas de Seguridad

- Los endpoints de lectura (`GET`) están públicos
- Los endpoints de escritura (`POST`, `PUT`, `DELETE`) requieren autenticación JWT
- Las URLs de Cloudinary deben ser `secure_url` para mayor seguridad
- Se recomienda validar los tipos de archivo permitidos en el upload

## Próximos Pasos

1. Crear migraciones iniciales: `python manage.py makemigrations`
2. Aplicar migraciones: `python manage.py migrate`
3. Acceder al panel admin para probar
4. Integrar con el frontend React para el upload a Cloudinary
