# Endpoints de Checkout y Ordenes

> **Última actualización:** 2026-09-11 — Sincronizado con código fuente real

## Checkout: `/api/checkout/`

### GET /api/checkout/summary/
Obtiene el resumen de la compra antes de confirmar.

**Autenticacion:** JWT (Bearer token)

**Response (200):**
```json
{
    "items": [
        {
            "product_name": "Camiseta Algodon",
            "variant": "M / Rojo",
            "quantity": 2,
            "unit_price": "29900.00",
            "subtotal": "59800.00"
        }
    ],
    "subtotal": "59800.00",
    "total": "59800.00"
}
```

### POST /api/checkout/confirm/
Confirma la compra y crea la orden + iniciar pago Wompi.

**Autenticacion:** JWT (Bearer token)

**Request:**
```json
{
    "shipping_name": "Juan Perez",
    "shipping_email": "juan@example.com",
    "shipping_phone": "+573001234567",
    "shipping_address": "Calle 123 #45-67",
    "shipping_city": "Bogota",
    "shipping_zipcode": "110111",
    "notes": "Entregar en horario de oficina",
    "image": "data:image/png;base64,...",
    "design_color": "#DC2626",
    "logo_texture": "url_del_logo",
    "full_texture": "url_textura_completa",
    "logo_scale": 1.5
}
```

**Response (201):**
```json
{
    "order_id": 1,
    "order_number": "ORD-A1B2C3",
    "total": "59800.00",
    "wompi_url": "https://sandbox.wompi.co/payload?token=...",
    "status": "pendiente"
}
```

**Errores:**
```json
// 400 - Carrito vacio
{ "detail": "El carrito esta vacio." }

// 400 - Campos faltantes
{ "shipping_name": ["Este campo es requerido."] }

// 400 - Stock insuficiente
{ "detail": "Stock insuficiente para Camiseta Algodon (M/Rojo)." }
```

**Proceso interno:**
1. Validar que el carrito no este vacio
2. Validar stock de cada item
3. Crear Order con status='pendiente' + order_number auto
4. Crear OrderItem por cada item
5. Guardar datos de envio (shipping_*)
6. Guardar datos de diseño personalizado (image, design_color, etc.)
7. Decrementar stock de variantes
8. Crear transaccion en Wompi
9. Guardar datos de pago (payment_*)
10. Eliminar items del carrito
11. Retornar confirmacion con URL de pago

---

## Ordenes: `/api/orders/`

### GET /api/orders/
Lista las ordenes (admin ve todas, usuario ve las suyas).

**Autenticacion:** JWT (Bearer token)

**Response (200):**
```json
{
    "count": 10,
    "next": "http://localhost:8000/api/orders/?page=2",
    "previous": null,
    "results": [
        {
            "id": 1,
            "order_number": "ORD-A1B2C3",
            "customer_name": "Juan Perez",
            "customer_email": "juan@example.com",
            "status": "pagado",
            "total": "59800.00",
            "created_at": "2026-09-01T14:00:00Z",
            "delivered_at": null
        }
    ]
}
```

### GET /api/orders/mis/
Lista las ordenes del usuario autenticado.

**Autenticacion:** JWT (Bearer token)

**Response (200):** Misma estructura que GET /api/orders/

### POST /api/orders/
Crea una orden directamente (usado por el microservicio 3D).

**Request:**
```json
{
    "status": "pendiente",
    "image": "data:image/png;base64,...",
    "cloudinary_public_id": "demo/camiseta_diseno",
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
    "order_number": "ORD-X1Y2Z3",
    "customer_name": "",
    "customer_email": "",
    "status": "pendiente",
    "total": "0.00",
    "image": "data:image/png;base64,...",
    "image_url": null,
    "cloudinary_public_id": "demo/camiseta_diseno",
    "design_color": "#DC2626",
    "notes": "Personalizacion: logo centrado",
    "created_at": "2026-09-01T14:00:00Z"
}
```

### GET /api/orders/{id}/
Obtiene el detalle de una orden.

**Campos del modelo Order:**
| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | int | Identificador unico |
| order_number | string | Numero de orden (ORD-XXXXXX) |
| customer_name | string | Nombre del cliente |
| customer_email | string | Correo del cliente |
| status | string | Estado: pendiente, pagado, produccion, enviado, entregado, cancelado |
| total | decimal | Total de la orden (COP) |
| shipping_name | string | Nombre de quien recibe |
| shipping_email | string | Email de envio |
| shipping_phone | string | Telefono de contacto |
| shipping_address | text | Direccion de envio |
| shipping_city | string | Ciudad de envio |
| shipping_zipcode | string | Codigo postal |
| payment_transaction_id | string | ID de transaccion Wompi |
| payment_reference | string | Referencia Wompi |
| payment_wompi_status | string | Estado del pago en Wompi |
| payment_confirmed_at | datetime | Fecha de confirmacion del pago |
| payment_rejection_reason | text | Motivo de rechazo del pago |
| image | text | Imagen en base64 del diseno personalizado |
| image_url | string | URL de la imagen en Cloudinary |
| cloudinary_public_id | string | ID publico en Cloudinary |
| design_color | string | Color del diseno |
| logo_texture | text | Textura del logo |
| full_texture | text | Textura completa |
| logo_scale | float | Escala del logo |
| notes | text | Notas adicionales |
| created_at | datetime | Fecha de creacion |
| updated_at | datetime | Fecha de actualizacion |
| delivered_at | datetime | Fecha de entrega |

---

## Facturas: `/api/orders/invoices/`

### GET /api/orders/invoices/
Lista las facturas generadas.

**Autenticacion:** JWT (Bearer token)

**Response (200):**
```json
{
    "count": 5,
    "results": [
        {
            "id": 1,
            "invoice_number": "FAC-X1Y2Z3",
            "order": 1,
            "subtotal": "59800.00",
            "total": "59800.00",
            "generated_at": "2026-09-01T15:00:00Z",
            "pdf_url": "https://cloudinary.com/factura_123.pdf"
        }
    ]
}
```

### POST /api/orders/invoices/generate/
Genera una factura para una orden.

**Autenticacion:** JWT (Bearer token)

**Request:**
```json
{
    "order_id": 1
}
```

**Response (201):**
```json
{
    "id": 1,
    "invoice_number": "FAC-X1Y2Z3",
    "subtotal": "59800.00",
    "total": "59800.00",
    "generated_at": "2026-09-01T15:00:00Z",
    "pdf_url": null
}
```

---

## Admin Ordenes: `/api/admin/orders/`

### GET /api/admin/orders/
Lista todas las ordenes (solo admin).

**Autenticacion:** JWT (Bearer token, rol Admin)

**Response (200):** Misma estructura que GET /api/orders/

### GET /api/admin/orders/{id}/
Detalle de una orden (solo admin).

**Autenticacion:** JWT (Bearer token, rol Admin)

**Response (200):** Detalle completo con todos los campos de Order
