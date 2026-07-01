# Endpoints de Checkout y Ordenes

## Checkout: `/api/checkout/`

### GET /api/checkout/summary/
Obtiene el resumen de la compra antes de confirmar.

**Autenticacion:** Sesion (cookie `sessionid`)

**Response (200):**
```json
{
    "items": [
        {
            "id": 1,
            "product_name": "Camiseta Algodon",
            "variant": "M / Rojo",
            "quantity": 2,
            "unit_price": "29.99",
            "subtotal": "59.98"
        }
    ],
    "total_items": 2,
    "total_amount": "59.98"
}
```

### POST /api/checkout/confirm/
Confirma la compra y crea la orden.

**Autenticacion:** Sesion (cookie `sessionid`)

**Request:**
```json
{
    "customer_name": "Juan Perez",
    "customer_email": "juan@example.com"
}
```

**Response (201):**
```json
{
    "order_id": 1,
    "status": "pending",
    "total": "59.98",
    "detail": "Orden creada exitosamente."
}
```

**Errores:**
```json
// 400 - Carrito vacio
{ "detail": "El carrito esta vacio." }

// 400 - Stock insuficiente
{ "detail": "Stock insuficiente para Camiseta Algodon (M/Rojo)." }

// 400 - Nombre requerido
{ "customer_name": "El nombre del cliente es requerido." }
```

**Proceso interno:**
1. Validar que el carrito no este vacio
2. Validar stock de cada item
3. Crear Order con status='pending'
4. Crear OrderItem por cada item
5. Decrementar stock de variantes
6. Calcular total de la orden
7. Eliminar items del carrito
8. Retornar confirmacion

---

## Ordenes: `/api/orders/`

### GET /api/orders/
Lista todas las ordenes.

**Autenticacion:** Ninguna (publico)

### POST /api/orders/
Crea una orden directamente (usado por el microservicio 3D).

**Request:**
```json
{
    "status": "pending",
    "imageUrl": "data:image/png;base64,...",
    "cloudinaryPublicId": "demo/camiseta_diseno",
    "design_color": "#DC2626",
    "logo_texture": "url_del_logo",
    "full_texture": "url_textura_completa",
    "logo_scale": 1.5,
    "notes": "Personalizacion: logo centrado"
}
```

**Response (201):**
```json
{
    "id": 1,
    "customer_name": "",
    "customer_email": "",
    "status": "pending",
    "total": "0.00",
    "image": "data:image/png;base64,...",
    "image_url": null,
    "cloudinary_public_id": "demo/camiseta_diseno",
    "design_color": "#DC2626",
    "notes": "Personalizacion: logo centrado",
    "created_at": "2026-07-01T14:00:00Z"
}
```

### GET /api/orders/{id}/
Obtiene el detalle de una orden.

**Campos del modelo Order:**
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | int | Identificador unico |
| customer_name | string | Nombre del cliente |
| customer_email | string | Correo del cliente |
| status | string | Estado: pending, paid, processing, completed, cancelled |
| total | decimal | Total de la orden |
| image | text | Imagen en base64 del diseno personalizado |
| image_url | string | URL de la imagen en Cloudinary |
| cloudinary_public_id | string | ID publico en Cloudinary |
| design_color | string | Color del diseno |
| logo_texture | text | Textura/textura del logo |
| full_texture | text | Textura completa |
| logo_scale | float | Escala del logo |
| notes | text | Notas adicionales |
| created_at | datetime | Fecha de creacion |
| updated_at | datetime | Fecha de actualizacion |
