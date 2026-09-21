# Flujo de Pago con Aprobación Administrativa

## Descripción General

El proceso de compra de diseños personalizados ahora requiere **aprobación administrativo antes del pago**. Esto asegura que un administrador valide la viabilidad técnica del diseño de estampación antes de que el cliente proceda con el pago Wompi.

## Estados de la Orden (Ciclo de Vida)

```
pendiente_validacion → aprobado → pagado → produccion → enviado → entregado
                         ↓
                    (rechazar)
                         ↓
                     cancelado
```

### Estados Definidos

| Estado | Descripción | Actor | Transición |
|--------|-------------|-------|-----------|
| `pendiente_validacion` | Pedido recién creado, diseño en revisión | Cliente | Checkout inicial |
| `aprobado` | Admin validó el diseño, cliente puede pagar | Admin | Endpoint `/approve/` |
| `pagado` | Pago confirmado en Wompi | Cliente/Sistema | Wompi Sandbox/Real |
| `produccion` | En fabricación/estampación | Admin | Estado manual |
| `enviado` | Despachado al cliente | Admin | Estado manual |
| `entregado` | Recibido por el cliente (final) | Cliente | Confirmación |
| `cancelado` | Anulado antes de completarse | Admin/Sistema | Endpoint `/cancel/` |

## Endpoints del Flujo

### 1. Crear Pedido (Cliente)
```bash
POST /api/checkout/confirm/
Content-Type: application/json

{
  "customer_name": "Jose Manuel",
  "customer_email": "usuario@test.com",
  "address": "Calle 123",
  "city": "Medellín",
  "department": "Antioquia",
  "phone": "3001234567"
}

# Respuesta
{
  "order_id": 4,
  "order_number": "ORD-000004",
  "status": "pendiente_validacion",
  "status_display": "Pendiente de Validación",
  "total": "240000.00",
  "detail": "¡Pedido registrado con éxito para validación! Nuestro equipo de administración revisará la viabilidad del diseño. Una vez aprobado, podrás proceder con el pago."
}
```

**Estado resultante**: `pendiente_validacion`

### 2. Aprobar Pedido (Admin Only)
```bash
POST /api/orders/4/approve/
Authorization: Bearer <admin_jwt_token>

# Respuesta
{
  "status": "success",
  "message": "Orden #ORD-000004 aprobada exitosamente. Procede con el pago.",
  "order": {
    "id": 4,
    "status": "aprobado",
    "admin_approved_at": "2026-09-11T03:50:00Z",
    "admin_approved_by": 1
  }
}
```

**Estado resultante**: `aprobado`

**Validación**: 
- Solo admin (`rol='Administrador'`)
- Orden debe estar en `pendiente_validacion`

### 3. Obtener Parámetros de Pago Wompi (Cliente)
```bash
GET /api/orders/4/wompi_checkout_data/
Authorization: Bearer <client_jwt_token>

# Respuesta
{
  "publicKey": "pub_live_xxxx",
  "reference": "ORD-000004",
  "amountInCents": 24000000,
  "currency": "COP",
  "signature": "hash_signature",
  "customerEmail": "usuario@test.com",
  "customerName": "Jose Manuel"
}
```

**Validación**:
- Orden debe estar en `aprobado`
- Si no está aprobada, retorna error `400`:
  ```json
  {
    "detail": "El pago solo está disponible después de que un administrador apruebe la orden. Estado actual: pendiente_validacion"
  }
  ```

### 4. Procesar Pago en Wompi (Cliente → Wompi)

El cliente envía la tarjeta tokenizada a Wompi (el backend **nunca ve** PAN, CVC, vencimiento).

Respuesta Wompi:
- `APPROVED`: Pago exitoso
- `DECLINED`: Tarjeta rechazada
- `ERROR`: Validación fallida

### 5. Confirmar Pago en Backend (Cliente)
```bash
POST /api/orders/4/pay_wompi_sandbox/
Authorization: Bearer <client_jwt_token>

# Respuesta exitosa
{
  "status": "success",
  "message": "¡Pago de la orden #ORD-000004 procesado con éxito vía Wompi Sandbox!",
  "order": {
    "status": "pagado",
    "payment_transaction_id": "wompi-test-4-1694414400",
    "payment_wompi_status": "APPROVED",
    "payment_confirmed_at": "2026-09-11T03:50:00Z"
  }
}
```

**Estado resultante**: `pagado`

**Validación**:
- Orden debe estar en `aprobado`
- Si no está aprobada, retorna error `400`

### 6. Pasar a Producción (Admin)
```bash
PATCH /api/admin/orders/4/status/
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "status": "produccion"
}
```

**Estado resultante**: `produccion`

## Validaciones de Seguridad

### Cliente
- ✅ Puede **ver** sus órdenes en cualquier estado
- ✅ Puede **crear** órdenes (se crean en `pendiente_validacion`)
- ✅ Puede obtener parámetros de pago **solo si** orden está `aprobado`
- ✅ Puede pagar **solo si** orden está `aprobado`
- ❌ NO puede cambiar estados directamente

### Admin
- ✅ Puede **ver** todas las órdenes
- ✅ Puede cambiar de `pendiente_validacion` → `aprobado`
- ✅ Puede cambiar cualquier estado mediante el endpoint `/status/`
- ✅ Puede enviar a producción (`produccion`)
- ✅ Puede cancelar órdenes

### Sistema (Backend)
- ✅ Fuerza validación en cada transición
- ✅ Registra `admin_approved_at` y `admin_approved_by` en la BD
- ✅ Rechaza pagos si orden no está aprobada
- ✅ Valida por JWT y permisos por rol

## Casos de Uso

### Escenario 1: Diseño Aprobado → Pago Exitoso
```
1. Cliente checkout            → pendiente_validacion
2. Admin revisa y aprueba      → aprobado
3. Cliente obtiene datos Wompi → Sin cambio
4. Cliente paga en Wompi       → payado
5. Admin inicia producción     → produccion
```

### Escenario 2: Diseño Rechazado
```
1. Cliente checkout            → pendiente_validacion
2. Admin revisa y CANCELA      → cancelado
3. Cliente no puede pagar
4. Admin/Sistema devuelve stock
```

### Escenario 3: Pago Después de Aprobación
```
1. Cliente checkout            → pendiente_validacion
2. Admin aprueba              → aprobado
3. Cliente sale sin pagar     → (estado sigue en aprobado)
4. Cliente vuelve días después → Puede completar pago
```

## Cambios en Frontend

### CheckoutPage.jsx
- Mostrar mensaje: "Tu pedido está en validación. Espera aprobación del equipo."
- Ocultar formulario Wompi (no mostrar)
- Mostrar estado del pedido

### AdminOrders.jsx (Admin Dashboard)
- Agregar botón **"Aprobar Diseño"** para órdenes en `pendiente_validacion`
- Mostrar fecha/admin que aprobó (`admin_approved_at`, `admin_approved_by`)
- Cambiar flujo: `pendiente_validacion` → `aprobado` → después muestra opción de pago

### OrderDetail.jsx (Estado del Cliente)
```
Estado: Pendiente de Validación
├─ "Nuestro equipo revisa tu diseño..."
├─ Si APROBADO: "¡Diseño aprobado! Proceder con pago"
│  └─ [Botón: Ir a Pago]
└─ Si CANCELADO: "Diseño rechazado. Contacta soporte."
```

## Error Resuelto

### Problema Original
- Order #ORD-000004 mostraba: `"INPUT_VALIDATION_ERROR"` de Wompi
- Estado: `"Pendiente de Validación"` (confuso: ¿por qué se intenta pago?)

### Solución Implementada
- Pago **solo** disponible si orden está `aprobado`
- Mens aje claro: "Espera aprobación antes de pagar"
- Validación en backend previene intentos de pago no autorizados

## Testing

### Test: Intento de Pago Sin Aprobación
```python
def test_pago_sin_aprobacion(self):
    order = Order.objects.create(
        customer_email='test@test.com',
        status=Order.STATUS_PENDING_VALIDATION,
        total='100000.00'
    )
    response = self.client.post(
        f'/api/orders/{order.id}/pay_wompi_sandbox/',
        HTTP_AUTHORIZATION='Bearer token'
    )
    self.assertEqual(response.status_code, 400)
    self.assertIn('aprobada', response.json()['detail'])
```

### Test: Flujo Completo
```python
def test_flujo_completo(self):
    # 1. Crear orden
    order = Order.objects.create(...)  # pendiente_validacion
    
    # 2. Admin aprueba
    response = self.client.post(
        f'/api/orders/{order.id}/approve/',
        HTTP_AUTHORIZATION='Bearer admin_token'
    )
    self.assertEqual(order.refresh_from_db().status, 'aprobado')
    
    # 3. Cliente paga
    response = self.client.post(
        f'/api/orders/{order.id}/pay_wompi_sandbox/',
        HTTP_AUTHORIZATION='Bearer client_token'
    )
    self.assertEqual(order.refresh_from_db().status, 'pagado')
```

## Migraciones

```bash
# Crear cambios de modelo
python manage.py makemigrations orders

# Aplicar cambios
python manage.py migrate orders
```

**Campos agregados**:
- `admin_approved_at` (DateTimeField, nullable)
- `admin_approved_by` (ForeignKey a Usuario, nullable)

**Estados agregados**:
- `pendiente_validacion`
- `aprobado`
- `pendiente_pago` (futuro)

## Referencias

- [Modelo Order](../backend/apps/orders/models.py)
- [ViewSet Orders](../backend/apps/orders/api/viewsets.py)
- [Admin ViewSet](../backend/apps/orders/api/admin_viewsets.py)
- [Checkout Views](../backend/apps/checkout/views.py)
- [Tests](../backend/apps/orders/tests.py)
