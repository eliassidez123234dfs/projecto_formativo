# Endpoints de Carrito

## Base: `/api/cart/`

Los endpoints de carrito utilizan **autenticacion por sesion** (cookies), no JWT. Esto permite que usuarios anonimos mantengan un carrito persistente asociado a su session_key.

### GET /api/cart/
Obtiene el contenido del carrito actual.

**Autenticacion:** Sesion (cookie `sessionid`)

**Response (200):**
```json
{
    "id": 1,
    "session_key": "abc123def456",
    "user": null,
    "created_at": "2026-07-01T12:00:00Z",
    "updated_at": "2026-07-01T14:00:00Z",
    "items": [
        {
            "id": 1,
            "product_id": 1,
            "product_name": "Camiseta Algodon",
            "product_image": "http://localhost:8000/media/products/camiseta.jpg",
            "variant_id": 2,
            "variant_label": "Talla M -- Rojo",
            "variant_size": "M",
            "variant_color": "Rojo",
            "quantity": 2,
            "unit_price": "29.99",
            "subtotal": "59.98"
        }
    ],
    "total_items": 2,
    "total_amount": "59.98"
}
```

### POST /api/cart/add/
Agrega un producto al carrito.

**Request:**
```json
{
    "product_id": 1,
    "variant_id": 2,
    "quantity": 1
}
```

**Response (201):**
```json
{
    "id": 2,
    "product_name": "Camiseta Algodon",
    "product_image": "http://localhost:8000/media/products/camiseta.jpg",
    "variant_label": "Talla M -- Rojo",
    "variant_size": "M",
    "variant_color": "Rojo",
    "quantity": 1,
    "unit_price": "29.99",
    "subtotal": "29.98"
}
```

**Validaciones:**
- El producto debe existir y estar activo
- La variante debe pertenecer al producto
- El stock debe ser suficiente
- Si el producto+variante ya existe en el carrito, se suma la cantidad (sin superar stock)

### PATCH /api/cart/items/{item_id}/quantity/
Actualiza la cantidad de un item en el carrito.

**Request:**
```json
{
    "quantity": 3
}
```

**Response (200):** Item actualizado con nuevo subtotal.

**Validaciones:** La cantidad no puede superar el stock disponible ni ser menor a 1.

### DELETE /api/cart/items/{item_id}/remove/
Elimina un item especifico del carrito.

**Response (204):** Sin contenido.

### DELETE /api/cart/clear/
Vacia el carrito completamente (elimina todos los items).

**Response (204):** Sin contenido.

---

## Admin: `/api/admin/carts/`

### GET /api/admin/carts/
Lista todos los carritos del sistema.

**Autenticacion:** JWT Requerido (rol=Administrador)

**Parametros Query:**
| Parametro | Tipo | Descripcion |
|-----------|------|-------------|
| `page` | int | Numero de pagina |
| `page_size` | int | Items por pagina |

**Response (200):**
```json
{
    "count": 10,
    "next": "http://localhost:8000/api/admin/carts/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "user_name": "juanperez (juan@example.com)",
            "items_count": 3,
            "total_amount": "89.97",
            "created_at": "2026-07-01T12:00:00Z"
        }
    ]
}
```

### GET /api/admin/carts/{id}/
Obtiene el detalle completo de un carrito (con items).
