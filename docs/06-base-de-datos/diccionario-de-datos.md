# Diccionario de Datos

> **Última actualización:** 2026-09-11 — Sincronizado con código fuente real

## 20.1 Tabla: `usuarios` (Modulo: users - App: users)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico del usuario |
| usuario | CharField | 100 | NO | - | Nombre de usuario (unique, USERNAME_FIELD) |
| correo | EmailField | 254 | NO | - | Correo electronico (unique) |
| contrasena | CharField | 255 | NO | - | Contrasena hasheada (PBKDF2) |
| estado | CharField | 20 | NO | 'Inactivo' | Estado: Activo, Inactivo, Bloqueado |
| rol | CharField | 20 | NO | 'Usuario' | Rol: Administrador, Usuario |
| fecha_registro | DateTimeField | - | NO | auto_now_add | Fecha de creacion de la cuenta |
| fecha_ultima_sesion | DateTimeField | - | SI | NULL | Ultimo inicio de sesion exitoso |
| email_verificado | BooleanField | - | NO | False | Indica si el correo fue verificado |
| is_superuser | BooleanField | - | NO | False | Superusuario Django (permisos totales) |
| token_version | IntegerField | - | NO | 0 | Version de token JWT (para invalidacion) |
| intentos_fallidos | IntegerField | - | NO | 0 | Contador de intentos fallidos de login |
| fecha_bloqueo | DateTimeField | - | SI | NULL | Momento en que fue bloqueada la cuenta |
| fecha_desbloqueo | DateTimeField | - | SI | NULL | Momento en que fue desbloqueada |
| admin_desbloqueador_id | Integer (FK) | - | SI | NULL | Administrador que desbloqueo (FK->usuarios) |
| eliminado | BooleanField | - | NO | False | Soft delete |
| fecha_eliminacion | DateTimeField | - | SI | NULL | Fecha de eliminacion logica |
| admin_eliminador_id | Integer (FK) | - | SI | NULL | Administrador que elimino (FK->usuarios) |

## 20.2 Tabla: `tokens_verificacion` (Modulo: users)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| usuario_id | Integer (FK) | - | NO | - | Usuario asociado (FK->usuarios) |
| token | CharField | 255 | NO | - | Token unico de verificacion |
| tipo | CharField | 30 | NO | - | Tipo: Verificacion_Email, Recuperacion_Password, Cambio_Email |
| fecha_creacion | DateTimeField | - | NO | auto_now_add | Fecha de creacion del token |
| fecha_expiracion | DateTimeField | - | NO | - | Fecha de expiracion del token |
| usado | BooleanField | - | NO | False | Indica si el token ya fue utilizado |

## 20.3 Tabla: `cambios_email` (Modulo: users)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| usuario_id | Integer (FK) | - | NO | - | Usuario que solicita el cambio |
| email_anterior | EmailField | 254 | NO | - | Correo anterior |
| email_nuevo | EmailField | 254 | NO | - | Nuevo correo solicitado |
| token_id | Integer (FK) | - | NO | - | Token de verificacion asociado |
| fecha_solicitud | DateTimeField | - | NO | auto_now_add | Fecha de la solicitud |
| verificado | BooleanField | - | NO | False | Indica si el cambio se confirmo |
| fecha_verificacion | DateTimeField | - | SI | NULL | Fecha de confirmacion del cambio |

## 20.4 Tabla: `historial_estado_usuarios` (Modulo: users)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| usuario_id | Integer (FK) | - | NO | - | Usuario afectado por el cambio |
| estado_anterior | CharField | 20 | NO | - | Estado antes del cambio |
| estado_nuevo | CharField | 20 | NO | - | Estado despues del cambio |
| motivo | TextField | - | SI | NULL | Motivo del cambio de estado |
| fecha_cambio | DateTimeField | - | NO | auto_now_add | Fecha del cambio |
| admin_id | Integer (FK) | - | SI | NULL | Administrador que realizo el cambio |

## 20.5 Tabla: `logs_auditoria` (Modulo: users)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| usuario_admin_id | Integer (FK) | - | SI | NULL | Administrador que ejecuto la accion |
| usuario_afectado_id | Integer (FK) | - | SI | NULL | Usuario afectado por la accion |
| accion | CharField | 255 | NO | - | Descripcion de la accion realizada |
| datos_anteriores | JSONField | - | SI | NULL | Datos previos (antes del cambio) |
| datos_nuevos | JSONField | - | SI | NULL | Datos posteriores (despues del cambio) |
| fecha_accion | DateTimeField | - | NO | auto_now_add | Fecha y hora de la accion |
| ip_admin | CharField | 45 | SI | NULL | Direccion IP del administrador |

## 20.6 Tabla: `products` (Modulo: products)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico del producto |
| name | CharField | 100 | NO | - | Nombre del producto (unique) |
| description | CharField | 500 | NO | - | Descripcion del producto |
| base_price | DecimalField | 10,2 | NO | - | Precio base del producto (COP) |
| is_active | BooleanField | - | NO | False | Indica si el producto esta activo |
| is_approved | BooleanField | - | NO | False | Indica si el producto esta aprobado |
| creator_id | Integer (FK) | - | SI | NULL | Creador del producto (FK->usuarios) |
| approved_by_id | Integer (FK) | - | SI | NULL | Quien aprobo el producto (FK->usuarios) |
| approved_at | DateTimeField | - | SI | NULL | Fecha y hora de aprobacion |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |
| updated_at | DateTimeField | - | NO | auto_now | Fecha de ultima actualizacion |

## 20.7 Tabla: `products_productimage` (Modulo: products)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| product_id | Integer (FK) | - | NO | - | Producto al que pertenece (FK->products) |
| image | ImageField | 100 | NO | - | Archivo de imagen |
| is_main | BooleanField | - | NO | False | Indica si es la imagen principal |
| order | PositiveSmallIntegerField | - | NO | 1 | Orden de visualizacion (1-5) |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de subida |

## 20.8 Tabla: `products_variant` (Modulo: products)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| product_id | Integer (FK) | - | NO | - | Producto al que pertenece |
| size | CharField | 20 | NO | - | Talla (ej: S, M, L, XL) |
| color | CharField | 20 | NO | - | Color (ej: Rojo, Azul, Negro) |
| color_hex | CharField | 7 | NO | '#6B7280' | Color en formato HEX (#RRGGBB) |
| color_nombre | CharField | 50 | NO | - | Nombre descriptivo del color |
| stock | PositiveIntegerField | - | NO | 0 | Cantidad disponible en inventario |
| price_variant | DecimalField | 10,2 | SI | NULL | Precio especifico por variante (COP, opcional) |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |

## 20.9 Tabla: `products_productaudit` (Modulo: products)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| product_id | Integer (FK) | - | NO | - | Producto auditado |
| action | CharField | 20 | NO | - | Accion: created, updated, published, disapproved |
| actor | CharField | 150 | NO | '' | Nombre del actor que realizo la accion |
| before_data | JSONField | - | NO | {} | Datos antes del cambio |
| after_data | JSONField | - | NO | {} | Datos despues del cambio |
| motivo | CharField | 255 | NO | '' | Motivo de desaprobacion (cuando aplica) |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de la accion |

## 20.10 Tabla: `catalog_category` (Modulo: catalog)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| name | CharField | 100 | NO | - | Nombre de la categoria (unique) |
| description | TextField | - | NO | '' | Descripcion de la categoria |
| is_active | BooleanField | - | NO | True | Indica si la categoria esta activa |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |
| updated_at | DateTimeField | - | NO | auto_now | Fecha de actualizacion |

## 20.11 Tabla: `catalog_productcategory` (Modulo: catalog)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| product_id | Integer (FK) | - | NO | - | Producto (FK->products) |
| category_id | Integer (FK) | - | NO | - | Categoria (FK->catalog_category) |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de asociacion |

## 20.12 Tabla: `catalog_searchhistory` (Modulo: catalog)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| session_key | CharField | 64 | NO | - | Clave de sesion (db_index) |
| query | CharField | 200 | NO | - | Texto buscado |
| filters | JSONField | - | NO | {} | Filtros aplicados |
| results_count | PositiveIntegerField | - | NO | 0 | Cantidad de resultados |
| created_at | DateTimeField | - | NO | auto_now_add | Timestamp |

## 20.13 Tabla: `catalog_popularsearch` (Modulo: catalog)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| query | CharField | 200 | NO | - | Termino popular (unique) |
| search_count | PositiveIntegerField | - | NO | 0 | Contador de busquedas |
| last_searched | DateTimeField | - | NO | auto_now | Ultima busqueda |
| is_active | BooleanField | - | NO | True | Activo |

## 20.14 Tabla: `carts_cart` (Modulo: carts)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| session_key | CharField | 64 | SI | NULL | Clave de sesion (unique, para anonimos) |
| user_id | Integer (FK) | - | SI | NULL | Usuario propietario (FK->usuarios) |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |
| updated_at | DateTimeField | - | NO | auto_now | Fecha de actualizacion |

## 20.15 Tabla: `carts_cartitem` (Modulo: carts)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| cart_id | Integer (FK) | - | NO | - | Carrito padre (FK->carts_cart) |
| product_id | Integer (FK) | - | NO | - | Producto (FK->products) |
| variant_id | Integer (FK) | - | NO | - | Variante (FK->products_variant) |
| quantity | PositiveIntegerField | - | NO | 1 | Cantidad del item |
| unit_price | DecimalField | 10,2 | NO | - | Precio unitario congelado al agregar |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |
| updated_at | DateTimeField | - | NO | auto_now | Fecha de actualizacion |

> **Restriccion:** unique(cart, product, variant)

## 20.16 Tabla: `orders_order` (Modulo: orders)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| order_number | CharField | 20 | NO | - | Numero de orden (unique, formato ORD-XXXXXX) |
| user_id | Integer (FK) | - | SI | NULL | Usuario comprador (FK->usuarios) |
| customer_name | CharField | 150 | NO | - | Nombre del cliente |
| customer_email | EmailField | 254 | NO | - | Email del cliente |
| status | CharField | 20 | NO | 'pendiente' | Estado: pendiente, pagado, produccion, enviado, entregado, cancelado |
| total | DecimalField | 10,2 | NO | - | Total de la orden (COP) |
| shipping_name | CharField | 150 | NO | - | Nombre de quien recibe |
| shipping_email | EmailField | 254 | NO | - | Email de envio |
| shipping_phone | CharField | 20 | NO | - | Telefono de contacto |
| shipping_address | TextField | - | NO | - | Direccion de envio |
| shipping_city | CharField | 100 | NO | - | Ciudad de envio |
| shipping_zipcode | CharField | 20 | NO | - | Codigo postal |
| payment_transaction_id | CharField | 100 | NO | '' | ID de transaccion Wompi |
| payment_reference | CharField | 100 | NO | '' | Referencia Wompi |
| payment_wompi_status | CharField | 50 | NO | '' | Estado del pago en Wompi |
| payment_confirmed_at | DateTimeField | - | SI | NULL | Fecha de confirmacion del pago |
| payment_rejection_reason | TextField | - | SI | NULL | Motivo de rechazo del pago |
| image | TextField | - | SI | NULL | Imagen Base64 del diseno |
| image_url | URLField | - | SI | NULL | URL de la imagen en Cloudinary |
| cloudinary_public_id | CharField | 255 | NO | '' | Public ID de Cloudinary |
| design_color | CharField | 50 | NO | '' | Color del diseno |
| logo_texture | TextField | - | SI | NULL | Textura del logo (Base64) |
| full_texture | TextField | - | SI | NULL | Textura de fondo (Base64) |
| logo_scale | FloatField | - | SI | NULL | Escala del logo |
| notes | TextField | - | SI | NULL | Notas adicionales del pedido |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |
| updated_at | DateTimeField | - | NO | auto_now | Fecha de actualizacion |
| delivered_at | DateTimeField | - | SI | NULL | Fecha de entrega |

## 20.17 Tabla: `orders_orderitem` (Modulo: orders)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| order_id | Integer (FK) | - | NO | - | Orden padre (FK->orders_order) |
| product_id | Integer (FK) | - | NO | - | Producto (FK->products, PROTECT) |
| variant_id | Integer (FK) | - | NO | - | Variante (FK->products_variant, PROTECT) |
| quantity | PositiveIntegerField | - | NO | 1 | Cantidad |
| unit_price | DecimalField | 10,2 | NO | - | Precio unitario congelado |

## 20.18 Tabla: `orders_invoice` (Modulo: orders)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| order_id | OneToOneField | - | NO | - | Orden asociada (FK->orders_order, unique) |
| invoice_number | CharField | 20 | NO | - | Numero de factura (unique, formato FAC-XXXXXX) |
| subtotal | DecimalField | 10,2 | NO | - | Subtotal de la factura |
| total | DecimalField | 10,2 | NO | - | Total de la factura |
| generated_at | DateTimeField | - | NO | auto_now_add | Fecha de generacion |
| pdf_url | URLField | 500 | SI | NULL | URL del PDF generado |

## 20.19 Tabla: `contactos` (Modulo: landing)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| nombre | CharField | 100 | NO | - | Nombre del remitente |
| correo | EmailField | 254 | NO | - | Correo del remitente |
| asunto | CharField | 150 | SI | NULL | Asunto del mensaje |
| mensaje | TextField | - | NO | - | Contenido del mensaje |
| ip_origen | CharField | 45 | SI | NULL | Direccion IP del cliente |
| fecha_envio | DateTimeField | - | NO | auto_now_add | Fecha de envio |
| leido | BooleanField | - | NO | False | Indica si fue leido por un admin |
| fecha_lectura | DateTimeField | - | SI | NULL | Fecha de lectura |

## 20.20 Tabla: `models3d_model3d` (Modulo: models3d)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| name | CharField | 255 | NO | - | Nombre del modelo (unique) |
| description | TextField | - | SI | NULL | Descripcion del modelo |
| cloudinary_url | URLField | 500 | NO | - | URL del archivo en Cloudinary |
| cloudinary_public_id | CharField | 255 | NO | - | Public ID en Cloudinary |
| file_type | CharField | 20 | NO | - | Tipo: png, jpg, jpeg, webp, glb, gltf, obj, fbx, dae |
| file_size | BigIntegerField | - | SI | NULL | Tamano del archivo en bytes |
| is_active | BooleanField | - | NO | True | Indica si esta activo |
| is_approved | BooleanField | - | NO | False | Indica si esta aprobado |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |
| updated_at | DateTimeField | - | NO | auto_now | Fecha de actualizacion |

## 20.21 Tabla: `models3d_model3dimage` (Modulo: models3d)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| model_3d_id | Integer (FK) | - | NO | - | Modelo 3D padre (FK->models3d_model3d) |
| cloudinary_url | URLField | 500 | NO | - | URL de la imagen preview |
| cloudinary_public_id | CharField | 255 | NO | - | Public ID en Cloudinary |
| is_main | BooleanField | - | NO | False | Indica si es la imagen principal |
| order | PositiveSmallIntegerField | - | NO | 1 | Orden de visualizacion |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |

> **Restriccion:** unique(model_3d, order)

---

## Resumen de Tablas

| # | Tabla | Modulo | Descripcion |
|---|-------|--------|-------------|
| 1 | usuarios | users | Usuarios del sistema |
| 2 | tokens_verificacion | users | Tokens de verificacion y recuperacion |
| 3 | cambios_email | users | Historial de cambios de email |
| 4 | historial_estado_usuarios | users | Historial de cambios de estado |
| 5 | logs_auditoria | users | Log de acciones de administradores |
| 6 | products | products | Catalogo de productos |
| 7 | products_productimage | products | Imagenes de productos |
| 8 | products_variant | products | Variantes (talla/color) de productos |
| 9 | products_productaudit | products | Auditoria de cambios en productos |
| 10 | catalog_category | catalog | Categorias de productos |
| 11 | catalog_productcategory | catalog | Relacion N:M producto-categoria |
| 12 | catalog_searchhistory | catalog | Historial de busquedas |
| 13 | catalog_popularsearch | catalog | Busquedas populares |
| 14 | carts_cart | carts | Carritos de compras |
| 15 | carts_cartitem | carts | Items del carrito |
| 16 | orders_order | orders | Ordenes/pedidos |
| 17 | orders_orderitem | orders | Items de una orden |
| 18 | orders_invoice | orders | Facturas generadas |
| 19 | contactos | landing | Mensajes de contacto |
| 20 | models3d_model3d | models3d | Modelos 3D |
| 21 | models3d_model3dimage | models3d | Imagenes de modelos 3D |

**Total: 21 tablas** en 8 modulos de negocio
