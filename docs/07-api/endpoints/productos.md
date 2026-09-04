# Endpoints de Productos

## Base: `/api/products/`

### GET /api/products/
Lista todos los productos.

**Autenticacion:** Ninguna (publico)

**Parametros Query:**
| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `search` | string | Busqueda por nombre y descripcion |
| `is_active` | bool | Filtrar por estado activo |
| `is_approved` | bool | Filtrar por estado aprobado |
| `min_price` | decimal | Precio minimo |
| `max_price` | decimal | Precio maximo |
| `ordering` | string | Campo de ordenamiento (name, -name, base_price, -base_price, created_at) |
| `page` | int | Numero de pagina |
| `page_size` | int | Elementos por pagina |

**Response (200):**
```json
{
    "count": 30,
    "next": "http://localhost:8000/api/products/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "name": "Camiseta Algodon",
            "description": "Camiseta de algodon 100%",
            "base_price": "29.99",
            "is_active": true,
            "is_approved": true,
            "main_image": "http://localhost:8000/media/products/2026/07/camiseta.jpg",
            "images_count": 3,
            "variants_count": 4,
            "checklist": {
                "name": true,
                "description": true,
                "main_image": true,
                "variant_with_stock": true,
                "ready_to_publish": true
            },
            "ready_to_publish": true,
            "created_at": "2026-07-01T12:00:00Z",
            "updated_at": "2026-07-01T13:00:00Z"
        }
    ]
}
```

### GET /api/products/{id}/
Obtiene el detalle completo de un producto.

**Autenticacion:** Ninguna (publico)

**Response (200):**
```json
{
    "id": 1,
    "name": "Camiseta Algodon",
    "description": "Camiseta de algodon 100%",
    "base_price": "29.99",
    "is_active": true,
    "is_approved": true,
    "main_image": "http://localhost:8000/media/products/2026/07/camiseta.jpg",
    "images": [
        {
            "id": 1,
            "image": "/media/products/2026/07/camiseta.jpg",
            "image_url": "http://localhost:8000/media/products/2026/07/camiseta.jpg",
            "is_main": true,
            "order": 1,
            "created_at": "2026-07-01T12:00:00Z"
        }
    ],
    "variants": [
        {
            "id": 1,
            "size": "M",
            "color": "Rojo",
            "stock": 50,
            "display_label": "Talla M -- Rojo"
        }
    ],
    "created_at": "2026-07-01T12:00:00Z",
    "updated_at": "2026-07-01T13:00:00Z",
    "ready_to_publish": true,
    "publication_message": "Listo para publicar"
}
```

### POST /api/products/
Crea un nuevo producto (solo admin/autenticado).

**Autenticacion:** JWT Requerido

**Request:**
```json
{
    "name": "Camiseta Algodon",
    "description": "Camiseta de algodon 100% de alta calidad",
    "base_price": 29.99,
    "is_active": false,
    "is_approved": false
}
```

### PATCH /api/products/{id}/
Actualiza parcialmente un producto.

### DELETE /api/products/{id}/
Elimina un producto. No permite eliminar si tiene ordenes activas.

### GET /api/products/{id}/checklist/
Obtiene el checklist de requisitos para publicar un producto.

### POST /api/products/{id}/publish/
Publica un producto (lo activa y aprueba). Valida `can_be_published`.

### PATCH /api/products/{id}/toggle-active/
Invierte el estado `is_active` del producto.

### POST /api/products/{id}/images/
Agrega una imagen al producto.

**Request (multipart/form-data):**
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| `image` | file | Archivo de imagen (JPG/PNG, max 2MB) |
| `is_main` | bool | Marcar como imagen principal (opcional) |
| `order` | int | Orden de visualizacion (opcional) |

### PATCH /api/products/{id}/images/{image_id}/
Actualiza orden y/o imagen principal.

### DELETE /api/products/{id}/images/{image_id}/
Elimina una imagen del producto.

### PATCH /api/products/{id}/images/reorder/
Reordena las imagenes del producto.

**Request:**
```json
{
    "order": [3, 1, 2]
}
```

### POST /api/products/{id}/variants/
Agrega una variante al producto.

**Request:**
```json
{
    "size": "L",
    "color": "Azul",
    "stock": 30
}
```

### GET /api/products/{id}/audits/
Obtiene el historial de auditoria del producto.

### GET /api/products/search/
Busqueda avanzada de productos con filtros combinables.

**Parametros Query adicionales:**
| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `has_images` | bool | Productos con imagenes |
| `has_stock` | bool | Productos con stock disponible |

### POST /api/products/{id}/add-to-cart/
Agrega el producto al carrito de la sesion actual.

**Request:**
```json
{
    "product_id": 1,
    "variant_id": 2,
    "quantity": 2
}
```

---

## Base: `/api/catalog/`

### GET /api/catalog/
Catalogo publico de productos activos y aprobados.

**Parametros Query:**
| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `q` | string | Busqueda textual |
| `category` | int | ID de categoria |
| `min_price` | decimal | Precio minimo |
| `max_price` | decimal | Precio maximo |
| `size` | string | Talla a filtrar |
| `color` | string | Color a filtrar |
| `has_stock` | bool | Solo con stock |
| `ordering` | string | Ordenamiento (name, -name, base_price, -base_price, popularity) |
| `page` | int | Pagina |

**Response (200):**
```json
{
    "count": 25,
    "next": "http://localhost:8000/api/catalog/?page=2",
    "previous": null,
    "results": [...],
    "filters": {
        "categories": [{"id": 1, "name": "Camisetas", "count": 10}],
        "price_range": {"min": 9.99, "max": 99.99}
    },
    "popular_searches": ["camiseta algodon", "polera negra"]
}
```

### GET /api/catalog/{id}/
Detalle de producto en el catalogo.

### GET /api/catalog/filters/
Obtiene los filtros disponibles sin paginacion.

### GET /api/catalog/featured/
Productos destacados (top 12 con stock e imagenes).

### GET /api/catalog/deals/
Ofertas (top 8 productos recientes con stock).

### GET /api/catalog/popular-searches/
Top 20 busquedas populares.

### GET /api/catalog/search-history/
Historial de busqueda de la sesion actual.

### GET /api/catalog/categories/
Lista de categorias activas.

### GET /api/catalog/categories/{id}/products/
Productos de una categoria especifica.
