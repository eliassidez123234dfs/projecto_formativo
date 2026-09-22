# Endpoints de Productos

## Arquitectura Dual: Django + Microservicio Spring Boot

Los productos se gestionan mediante **dos backends**:

| Operación | Backend | Endpoint |
|-----------|---------|----------|
| Crear producto | Spring Boot | `POST /api/v1/productos` |
| Listar productos (admin) | Spring Boot | `GET /api/v1/productos` |
| Ver producto (admin) | Spring Boot | `GET /api/v1/productos/{id}` |
| Editar producto | Spring Boot | `PUT /api/v1/productos/{id}` |
| Eliminar producto (soft delete) | Spring Boot | `DELETE /api/v1/productos/{id}` |
| Imágenes | Django | `/api/products/{id}/images/` |
| Variantes | Django | `/api/products/{id}/variants/` |
| Categorías | Django | `/api/catalog/categories/` |
| Checklist/Publicar | Django | `/api/products/{id}/checklist/`, `/publish/` |
| Toggle active | Django | `/api/products/{id}/toggle-active/` |
| Catálogo público | Django | `/api/catalog/` |

**Adaptador:** `frontend/src/services/productService.js` traduce las respuestas del microservicio al formato DRF.

---

## Base: `/api/v1/productos` (Microservicio Spring Boot)

### GET /api/v1/productos
Lista productos paginados (excluye BORRADO).

**Parametros Query:**
| Parametro | Tipo | Default | Descripcion |
|-----------|------|---------|-------------|
| `page` | int | 0 | Numero de pagina (base 0) |
| `size` | int | 10 | Elementos por pagina |
| `sortBy` | string | id | Campo de ordenamiento |
| `sortDir` | string | asc | Direccion (asc/desc) |
| `nombre` | string | - | Busqueda AND con estado |
| `estado` | enum | - | ACTIVO, INACTIVO, BORRADO |
| `search` | string | - | Busqueda OR en nombre/descripcion/referencia |

**Response (200):**
```json
{
    "content": [
        {
            "id": 1,
            "nombre": "Camiseta Algodon",
            "descripcion": "Camiseta de algodon 100%",
            "precioBase": 50000.00,
            "referencia": "RED-CAM-01",
            "stock": 100,
            "estado": "ACTIVO",
            "aprobado": true,
            "createdAt": "2026-09-22T10:00:00",
            "updatedAt": "2026-09-22T10:00:00"
        }
    ],
    "totalElements": 30,
    "totalPages": 3,
    "pageNumber": 0,
    "pageSize": 10,
    "last": false
}
```

### POST /api/v1/productos
Crea un nuevo producto.

**Request:**
```json
{
    "nombre": "Camiseta Algodon",
    "descripcion": "Camiseta de algodon 100% de alta calidad",
    "precioBase": 50000.00,
    "referencia": "RED-CAM-01",
    "stock": 100
}
```

**Validaciones Jakarta:**
- `nombre`: @NotBlank, @Size(3-100), @Pattern(sin caracteres de control)
- `precioBase`: @NotNull, @DecimalMin("50.0")
- `referencia`: @NotBlank, @Pattern(^[A-Z0-9\-]{3,20}$)

**Response (201):** Producto creado con ID asignado.

### PUT /api/v1/productos/{id}
Actualiza completamente un producto (reemplaza todos los campos).

### DELETE /api/v1/productos/{id}
Eliminación lógica — cambia estado a BORRADO. Response: 204 No Content.

---

## Base: `/api/products/` (Django — Imágenes, Variantes, Checklist)

### GET /api/products/
Lista todos los productos.

### POST /api/products/
Crea un nuevo producto (solo admin/autenticado).

### PATCH /api/products/{id}/
Actualiza parcialmente un producto.

### DELETE /api/products/{id}/
Elimina un producto. No permite eliminar si tiene ordenes activas.

### GET /api/products/{id}/checklist/
Obtiene el checklist de requisitos para publicar un producto.

### POST /api/products/{id}/publish/
Publica un producto (lo activa y aprueba).

### PATCH /api/products/{id}/toggle-active/
Invierte el estado `is_active` del producto.

### POST /api/products/{id}/images/
Agrega una imagen al producto (multipart/form-data).

### PATCH /api/products/{id}/images/{image_id}/
Actualiza orden y/o imagen principal.

### DELETE /api/products/{id}/images/{image_id}/
Elimina una imagen del producto.

### PATCH /api/products/{id}/images/reorder/
Reordena las imagenes del producto.

### POST /api/products/{id}/variants/
Agrega una variante al producto.

### GET /api/products/{id}/audits/
Obtiene el historial de auditoria del producto.

---

## Base: `/api/catalog/` (Django — Catálogo Público)

### GET /api/catalog/
Catalogo publico de productos activos y aprobados.

### GET /api/catalog/{id}/
Detalle de producto en el catalogo.

### GET /api/catalog/categories/
Lista de categorias activas.
