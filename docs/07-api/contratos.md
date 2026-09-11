# API Contracts (CDD) — RED Estampación

> Contract-Driven Development: Contratos OpenAPI 3.0 para todos los endpoints REST
>
> **Última actualización:** 2026-09-11 — Sincronizado con código fuente real

---

## 1. Auth Service


### POST /api/auth/registro/
```yaml
summary: Registrar nuevo usuario
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [usuario, correo, contrasena]
        properties:
          usuario: { type: string, maxLength: 100 }
          correo: { type: string, format: email }
          contrasena: { type: string, minLength: 8 }
responses:
  201:
    description: Usuario creado. Email de verificación enviado.
    content:
      application/json:
        schema:
          type: object
          properties:
            id: { type: integer }
            usuario: { type: string }
            correo: { type: string }
            mensaje: { type: string, example: "Verifica tu correo" }
  400:
    description: Error de validación (email duplicado, password débil)
```


### POST /api/login/login/
```yaml
summary: Iniciar sesión (JWT)
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [correo, contrasena]
        properties:
          correo: { type: string, format: email }
          contrasena: { type: string }
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            access: { type: string }
            refresh: { type: string }
            user: { type: object, properties: { id, usuario, correo, rol, email_verificado } }
  401:
    description: Credenciales inválidas o email no verificado
  423:
    description: Cuenta bloqueada por intentos fallidos
```


### GET /api/usuarios/perfil/
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
            usuario: { type: string }
            correo: { type: string }
            estado: { type: string, enum: [Activo, Inactivo, Bloqueado] }
            rol: { type: string, enum: [Administrador, Usuario] }
            fecha_registro: { type: string, format: date-time }
            email_verificado: { type: boolean }
```


### POST /api/auth/verificar-email/
```yaml
summary: Verificar email con token
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [token]
        properties:
          token: { type: string }
responses:
  200:
    description: Email verificado exitosamente
  400:
    description: Token inválido o expirado
```


### POST /api/auth/recuperar-password/
```yaml
summary: Solicitar recuperación de password
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [correo]
        properties:
          correo: { type: string, format: email }
responses:
  200:
    description: Si el email existe, se envía enlace de recuperación
```


### POST /api/auth/nueva-password/
```yaml
summary: Establecer nueva password con token
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [token, nueva_contrasena]
        properties:
          token: { type: string }
          nueva_contrasena: { type: string, minLength: 8 }
responses:
  200:
    description: Password actualizada exitosamente
  400:
    description: Token inválido o expirado
```


### POST /api/login/logout/
```yaml
summary: Cerrar sesión (requiere autenticación)
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Sesión cerrada
```

---

### POST /api/auth/registro/
```yaml
summary: Registrar nuevo usuario
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [usuario, correo, contrasena]
        properties:
          usuario: { type: string, maxLength: 100 }
          correo: { type: string, format: email }
          contrasena: { type: string, minLength: 8 }
responses:
  201:
    description: Usuario creado. Email de verificación enviado.
    content:
      application/json:
        schema:
          type: object
          properties:
            id: { type: integer }
            usuario: { type: string }
            correo: { type: string }
            mensaje: { type: string, example: "Verifica tu correo" }
  400:
    description: Error de validación (email duplicado, password débil)
```

## 2. Products Service

### GET /api/products/
```yaml
summary: Listar productos (lectura pública, escritura admin)
parameters:
  - name: search
    in: query
    schema: { type: string }
  - name: is_active
    in: query
    schema: { type: boolean }
  - name: is_approved
    in: query
    schema: { type: boolean }
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
          name: { type: string, maxLength: 100 }
          description: { type: string, maxLength: 500 }
          base_price: { type: number, minimum: 0 }
          is_active: { type: boolean, default: false }
          category_ids: { type: array, items: { type: integer } }
```


### GET /api/products/{id}/
```yaml
summary: Detalle de producto
responses:
  200:
    description: Detalle completo del producto con imágenes y variantes
```


### PATCH /api/products/{id}/toggle-active/
```yaml
summary: Activar/desactivar producto (admin)
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Estado del producto cambiado
```


### POST /api/products/{id}/publish/
```yaml
summary: Publicar producto (admin)
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Producto publicado
```


### POST /api/products/{id}/disapprove/
```yaml
summary: Desaprobar producto con motivo (admin)
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [motivo]
        properties:
          motivo: { type: string, maxLength: 255 }
responses:
  200:
    description: Producto desaprobado
```


### GET /api/products/search/
```yaml
summary: Búsqueda avanzada de productos con filtros
parameters:
  - name: q
    in: query
    schema: { type: string }
    description: Término de búsqueda
  - name: category
    in: query
    schema: { type: integer }
  - name: min_price
    in: query
    schema: { type: number }
  - name: max_price
    in: query
    schema: { type: number }
  - name: size
    in: query
    schema: { type: string }
  - name: color
    in: query
    schema: { type: string }
  - name: in_stock
    in: query
    schema: { type: boolean }
responses:
  200:
    description: Productos que coinciden con los filtros
```

---

## 3. Catalog Service


### GET /api/catalog/
```yaml
summary: Listar productos del catálogo (público, con filtros)
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
  - name: ordering
    in: query
    schema: { type: string }
  - name: page
    in: query
    schema: { type: integer, default: 1 }
responses:
  200:
    description: Lista paginada de productos del catálogo
```


### GET /api/catalog/featured/
```yaml
summary: 12 productos destacados recientes
responses:
  200:
    description: Lista de productos destacados
```


### GET /api/catalog/deals/
```yaml
summary: 8 productos en oferta
responses:
  200:
    description: Lista de productos en oferta
```


### GET /api/catalog/categories/
```yaml
summary: Listar categorías activas
responses:
  200:
    description: Lista de categorías
```


### GET /api/catalog/categories/{id}/products/
```yaml
summary: Productos de una categoría con filtros
parameters:
  - name: page
    in: query
    schema: { type: integer, default: 1 }
responses:
  200:
    description: Productos de la categoría
```


### GET /api/catalog/filters/
```yaml
summary: Obtener filtros estáticos del catálogo
responses:
  200:
    description: Filtros disponibles (precio, talla, color, categoría)
```


### GET /api/catalog/popular-searches/
```yaml
summary: Top 20 búsquedas populares
responses:
  200:
    description: Lista de búsquedas populares
```

---

## 4. Cart Service

## 3. Catalog Service

### GET /api/cart/
```yaml
summary: Obtener carrito (sesión anónima o usuario autenticado)
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
                      color_hex: { type: string }
                      product_name: { type: string }
                      product_id: { type: integer }
                      price: { type: number }
                      main_image: { type: string }
                  quantity: { type: integer, minimum: 1 }
                  subtotal: { type: number }
            total: { type: number }
            items_count: { type: integer }
```


### POST /api/cart/add/
```yaml
summary: Agregar item al carrito
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


### PATCH /api/cart/items/{item_id}/quantity/
```yaml
summary: Actualizar cantidad de item
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [quantity]
        properties:
          quantity: { type: integer, minimum: 1 }
responses:
  200:
    description: Cantidad actualizada
```


### DELETE /api/cart/items/{item_id}/remove/
```yaml
summary: Eliminar item del carrito
responses:
  204:
    description: Item eliminado
```


### DELETE /api/cart/clear/
```yaml
summary: Vaciar carrito
responses:
  204:
    description: Carrito vaciado
```

---

## 5. Checkout Service


### GET /api/checkout/summary/
```yaml
summary: Resumen del checkout (items, total)
security: [{ BearerAuth: [] }]
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            items:
              type: array
              items:
                type: object
                properties:
                  product_name: { type: string }
                  variant: { type: string }
                  quantity: { type: integer }
                  unit_price: { type: number }
                  subtotal: { type: number }
            subtotal: { type: number }
            total: { type: number }
```


### POST /api/checkout/confirm/
```yaml
summary: Confirmar compra y crear Order + iniciar pago Wompi
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, shipping_zipcode]
        properties:
          shipping_name: { type: string, maxLength: 150 }
          shipping_email: { type: string, format: email }
          shipping_phone: { type: string, maxLength: 20 }
          shipping_address: { type: string }
          shipping_city: { type: string, maxLength: 100 }
          shipping_zipcode: { type: string, maxLength: 20 }
          notes: { type: string }
          image: { type: string, description: "Imagen Base64 del diseño" }
          design_color: { type: string, maxLength: 50 }
          logo_texture: { type: string, description: "Textura logo Base64" }
          full_texture: { type: string, description: "Textura fondo Base64" }
          logo_scale: { type: number, description: "Escala del logo" }
responses:
  201:
    description: Pedido creado + URL de pago Wompi
    content:
      application/json:
        schema:
          type: object
          properties:
            order_id: { type: integer }
            order_number: { type: string, example: "ORD-A1B2C3" }
            total: { type: number }
            wompi_url: { type: string }
            status: { type: string, enum: [pendiente, pagado, produccion, enviado, entregado, cancelado] }
```

---

## 6. Orders Service

### POST /api/cart/add/
```yaml
summary: Agregar item al carrito
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

### POST /api/editor-session/commit/
```yaml
summary: Confirmar selección del editor 3D y agregarla al carrito
security: [{ SessionCookie: [] }]
requestBody:
  required: false
  description: No recibe identificadores ni cantidad; usa la sesión creada previamente.
responses:
  201: { description: Item agregado con precio y stock recalculados desde la BD }
  400: { description: Producto, variante o stock dejaron de ser válidos }
  404: { description: Sesión inexistente o ya consumida }
```

## 4. Cart Service

## 5. Checkout Service

### GET /api/orders/
```yaml
summary: Listar órdenes (admin) / Mis pedidos (usuario)
security: [{ BearerAuth: [] }]
parameters:
  - name: status
    in: query
    schema: { type: string, enum: [pendiente, pagado, produccion, enviado, entregado, cancelado] }
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
                  order_number: { type: string }
                  customer_name: { type: string }
                  customer_email: { type: string }
                  total: { type: number }
                  status: { type: string }
                  created_at: { type: string, format: date-time }
                  delivered_at: { type: string, format: date-time, nullable: true }
```


### GET /api/orders/mis/
```yaml
summary: Mis pedidos (usuario autenticado)
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Lista de pedidos del usuario actual
```


### GET /api/orders/invoices/
```yaml
summary: Listar facturas
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Lista de facturas generadas
```


### POST /api/orders/invoices/generate/
```yaml
summary: Generar factura para una orden
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [order_id]
        properties:
          order_id: { type: integer }
responses:
  201:
    description: Factura generada
    content:
      application/json:
        schema:
          type: object
          properties:
            id: { type: integer }
            invoice_number: { type: string, example: "FAC-X1Y2Z3" }
            subtotal: { type: number }
            total: { type: number }
            generated_at: { type: string, format: date-time }
            pdf_url: { type: string, nullable: true }
```

---

## 7. Admin Service


### GET /api/admin/stats/
```yaml
summary: Estadísticas del dashboard admin
security: [{ BearerAuth: [] }]
responses:
  200:
    content:
      application/json:
        schema:
          type: object
          properties:
            total_usuarios: { type: integer }
            total_productos: { type: integer }
            total_ordenes: { type: integer }
            ingresos_totales: { type: number }
```


### GET /api/admin/usuarios/
```yaml
summary: Listar usuarios (admin)
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Lista de usuarios con filtros
```


### POST /api/admin/usuarios/{id}/cambiar_estado/
```yaml
summary: Cambiar estado de usuario (admin)
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [estado, motivo]
        properties:
          estado: { type: string, enum: [Activo, Inactivo, Bloqueado] }
          motivo: { type: string }
responses:
  200:
    description: Estado cambiado
```


### GET /api/admin/usuarios/auditoria/
```yaml
summary: Ver log de auditoría (admin)
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Lista de acciones de auditoría
```

---

## 8. Contacto Service


### POST /api/contacto/
```yaml
summary: Enviar mensaje de contacto (público, rate limit 3/h)
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [nombre, correo, mensaje]
        properties:
          nombre: { type: string, maxLength: 100 }
          correo: { type: string, format: email }
          asunto: { type: string, maxLength: 150 }
          mensaje: { type: string }
responses:
  201:
    description: Mensaje enviado
  429:
    description: Límite de rate limiting alcanzado
```

---

## 9. Models3D Service


### GET /api/models3d/models/
```yaml
summary: Listar modelos 3D
responses:
  200:
    description: Lista de modelos 3D disponibles
```


### POST /api/models3d/models/
```yaml
summary: Crear modelo 3D
security: [{ BearerAuth: [] }]
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [name, cloudinary_url, cloudinary_public_id, file_type]
        properties:
          name: { type: string, maxLength: 255 }
          description: { type: string }
          cloudinary_url: { type: string, format: uri }
          cloudinary_public_id: { type: string }
          file_type: { type: string, enum: [png, jpg, jpeg, webp, glb, gltf, obj, fbx, dae] }
          file_size: { type: integer }
responses:
  201:
    description: Modelo 3D creado
```


### GET /api/models3d/cloudinary/
```yaml
summary: Listar recursos de Cloudinary (admin)
security: [{ BearerAuth: [] }]
responses:
  200:
    description: Lista de recursos almacenados en Cloudinary
```

---

## 10. Monitoring Service


### POST /api/logging/client/
```yaml
summary: Registrar errores del frontend
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        properties:
          level: { type: string, enum: [error, warning, info] }
          message: { type: string }
          stack: { type: string }
          url: { type: string }
          userAgent: { type: string }
responses:
  201:
    description: Error registrado
```

---

## 11. Health Check


### GET /api/health/
```yaml
summary: Health check del sistema (PostgreSQL + MongoDB)
responses:
  200:
    description: Sistema operativo
    content:
      application/json:
        schema:
          type: object
          properties:
            status: { type: string, example: "ok" }
            postgres: { type: string, example: "connected" }
            mongodb: { type: string, example: "connected" }
```

---

## 6. Orders Service

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
