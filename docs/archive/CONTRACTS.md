# API Contracts (CDD) — RED Estampación

> Contract-Driven Development: Contratos OpenAPI 3.0 para todos los endpoints REST

---

## 1. Auth Service

### POST /api/auth/register/
```yaml
summary: Registrar nuevo usuario
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [email, password, nombre]
        properties:
          email: { type: string, format: email }
          password: { type: string, minLength: 8 }
          nombre: { type: string, maxLength: 100 }
          telefono: { type: string, pattern: '^\+?[0-9]{7,15}$' }
responses:
  201:
    description: Usuario creado. Email de verificación enviado.
    content:
      application/json:
        schema:
          type: object
          properties:
            id: { type: integer }
            email: { type: string }
            nombre: { type: string }
            mensaje: { type: string, example: "Verifica tu correo" }
  400:
    description: Error de validación (email duplicado, password débil)
```

### POST /api/auth/login/
```yaml
summary: Iniciar sesión (JWT)
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [email, password]
        properties:
          email: { type: string, format: email }
          password: { type: string }
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            access: { type: string }
            refresh: { type: string }
            user: { type: object, properties: { id, email, nombre, rol } }
  401:
    description: Credenciales inválidas o email no verificado
```

### GET /api/auth/profile/
```yaml
summary: Obtener perfil del usuario autenticado
security: [{ BearerAuth: [] }]
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            id: { type: integer }
            email: { type: string }
            nombre: { type: string }
            telefono: { type: string }
            fecha_registro: { type: string, format: date-time }
            is_email_verified: { type: boolean }
```

---

## 2. Products Service

### GET /api/products/
```yaml
summary: Listar productos (público)
parameters:
  - name: search
    in: query
    schema: { type: string }
  - name: category
    in: query
    schema: { type: integer }
  - name: min_price
    in: query
    schema: { type: number }
  - name: max_price
    in: query
    schema: { type: number }
  - name: is_active
    in: query
    schema: { type: boolean, default: true }
  - name: ordering
    in: query
    schema: { type: string, enum: [name, -name, base_price, -base_price, created_at, -created_at] }
  - name: page
    in: query
    schema: { type: integer, default: 1 }
  - name: page_size
    in: query
    schema: { type: integer, default: 20, maximum: 100 }
responses:
  200:
    description: Lista paginada de productos
    content:
      application/json:
        schema:
          type: object
          properties:
            count: { type: integer }
            next: { type: string, nullable: true }
            previous: { type: string, nullable: true }
            results:
              type: array
              items:
                $ref: '#/components/schemas/ProductoResumen'
```

### POST /api/products/
```yaml
summary: Crear producto (admin)
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [name, base_price]
        properties:
          name: { type: string, maxLength: 200 }
          description: { type: string }
          base_price: { type: number, minimum: 0 }
          is_active: { type: boolean, default: false }
          category_ids: { type: array, items: { type: integer } }
```

---

## 3. Cart Service

### GET /api/cart/
```yaml
summary: Obtener carrito del usuario autenticado
security: [{ BearerAuth: [] }]
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            id: { type: integer }
            items:
              type: array
              items:
                type: object
                properties:
                  id: { type: integer }
                  variant:
                    type: object
                    properties:
                      id: { type: integer }
                      size: { type: string }
                      color: { type: string }
                      product_name: { type: string }
                      product_id: { type: integer }
                      price: { type: number }
                      main_image: { type: string }
                  quantity: { type: integer, minimum: 1 }
                  subtotal: { type: number }
            total: { type: number }
            items_count: { type: integer }
```

### POST /api/cart/
```yaml
summary: Agregar item al carrito
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [variant_id]
        properties:
          variant_id: { type: integer }
          quantity: { type: integer, default: 1, minimum: 1 }
responses:
  201:
    description: Item agregado
  400:
    description: Stock insuficiente o variante no existe
```

---

## 4. Checkout Service

### POST /api/checkout/
```yaml
summary: Crear pedido desde carrito + iniciar pago Wompi
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [shipping_address, city, phone]
        properties:
          shipping_address: { type: string }
          city: { type: string }
          phone: { type: string }
          notes: { type: string }
responses:
  201:
    description: Pedido creado + URL de pago Wompi
    content:
      application/json:
        schema:
          type: object
          properties:
            order_id: { type: integer }
            total: { type: number }
            wompi_url: { type: string }
            status: { type: string, enum: [pending, paid, shipped, delivered, cancelled] }
```

---

## 5. Orders Service

### GET /api/orders/
```yaml
summary: Listar pedidos del usuario autenticado
security: [{ BearerAuth: [] }]
parameters:
  - name: status
    in: query
    schema: { type: string, enum: [pending, paid, shipped, delivered, cancelled] }
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            count: { type: integer }
            results:
              type: array
              items:
                type: object
                properties:
                  id: { type: integer }
                  total: { type: number }
                  status: { type: string }
                  created_at: { type: string, format: date-time }
                  items_count: { type: integer }
```

---

## 6. Models3D Service

### POST /api/models3d/
```yaml
summary: Guardar diseño 3D
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [product_id, config]
        properties:
          product_id: { type: integer }
          config:
            type: object
            properties:
              color: { type: string }
              text: { type: string }
              text_position: { type: string }
              image_url: { type: string, format: uri }
          name: { type: string }
          file: { type: string, format: uri }
responses:
  201:
    description: Diseño 3D guardado
```

---

## Schemas Compartidos

```yaml
components:
  schemas:
    ProductoResumen:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
        description: { type: string }
        base_price: { type: number }
        main_image: { type: string, nullable: true }
        variants_count: { type: integer }
        images_count: { type: integer }
        is_active: { type: boolean }
        is_approved: { type: boolean }
        ready_to_publish: { type: boolean }
        created_at: { type: string, format: date-time }
    ErrorResponse:
      type: object
      properties:
        error: { type: string }
        details: { type: object }
    Pagination:
      type: object
      properties:
        count: { type: integer }
        next: { type: string, nullable: true }
        previous: { type: string, nullable: true }
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```
