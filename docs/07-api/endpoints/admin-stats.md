# Endpoints de Administracion y Estadisticas

## Estadisticas: `/api/admin/stats/`

### GET /api/admin/stats/
Obtiene estadisticas agregadas del sistema.

**Autenticacion:** JWT Requerido (rol=Administrador)

**Response (200):**
```json
{
    "usuarios": {
        "total": 150,
        "activos": 120,
        "administradores": 3,
        "bloqueados": 5,
        "inactivos": 25,
        "eliminados": 10
    },
    "productos": {
        "total": 80,
        "activos": 60,
        "inactivos": 20,
        "aprobados": 55,
        "no_aprobados": 25
    },
    "ordenes": {
        "total_ordenes": 200,
        "del_mes": 15,
        "total_ventas": "5999.99",
        "pendientes": 10,
        "pagadas": 5,
        "completadas": 180,
        "canceladas": 5
    }
}
```

---

## Contacto: `/api/contacto/`

### GET /api/contacto/
Lista los mensajes de contacto (solo admin).

**Autenticacion:** JWT Requerido (rol=Administrador)

**Response (200):**
```json
{
    "count": 20,
    "results": [
        {
            "id": 1,
            "nombre": "Carlos Lopez",
            "correo": "carlos@example.com",
            "asunto": "Consulta sobre productos",
            "fecha_envio": "2026-07-01T10:00:00Z",
            "leido": false
        }
    ]
}
```

### POST /api/contacto/
Envia un nuevo mensaje de contacto.

**Autenticacion:** Ninguna (publico) - Con rate limiting (3/hora)

**Request:**
```json
{
    "nombre": "Carlos Lopez",
    "correo": "carlos@example.com",
    "asunto": "Consulta sobre productos",
    "mensaje": "Me gustaria saber si realizan envios internacionales."
}
```

**Response (201):**
```json
{
    "mensaje": "Mensaje enviado correctamente"
}
```

### POST /api/contacto/{id}/marcar_leido/
Marca un mensaje como leido.

### DELETE /api/contacto/{id}/eliminar/
Elimina un mensaje de contacto.

---

## Modelos 3D: `/api/models3d/models/`

### GET /api/models3d/models/
Lista todos los modelos 3D.

### GET /api/models3d/models/{id}/
Detalle de un modelo 3D con sus imagenes de preview.

### POST /api/models3d/models/
Crea un modelo 3D.

**Request:**
```json
{
    "name": "Camiseta Basica",
    "description": "Modelo 3D de camiseta basica",
    "cloudinary_url": "https://res.cloudinary.com/.../modelo.glb",
    "cloudinary_public_id": "models/camiseta_basica",
    "file_type": "glb",
    "file_size": 2048576
}
```

### GET /api/models3d/models/active/
Modelos 3D activos (`is_active=True`).

### GET /api/models3d/models/approved/
Modelos 3D aprobados y activos (`is_approved=True`, `is_active=True`).

### POST /api/models3d/models/{id}/add_preview_image/
Agrega una imagen de preview al modelo.

### GET /api/models3d/models/{id}/preview_images/
Obtiene las imagenes de preview del modelo.

### GET/POST /api/models3d/images/
Lista o crea imagenes de modelos 3D.

---

## Resumen de Endpoints

| Metodo | Ruta | Autenticacion | Descripcion |
|--------|------|---------------|-------------|
| GET | `/api/admin/stats/` | JWT Admin | Estadisticas del sistema |
| GET/POST | `/api/contacto/` | Publica (POST) / JWT Admin (GET) | Mensajes de contacto |
| POST | `/api/contacto/{id}/marcar_leido/` | JWT Admin | Marcar mensaje como leido |
| DELETE | `/api/contacto/{id}/eliminar/` | JWT Admin | Eliminar mensaje |
| GET/POST | `/api/models3d/models/` | Publica | Gestion de modelos 3D |
| GET | `/api/models3d/models/active/` | Publica | Modelos activos |
| GET | `/api/models3d/models/approved/` | Publica | Modelos aprobados |
| GET/POST | `/api/models3d/images/` | Publica | Imagenes de modelos 3D |
