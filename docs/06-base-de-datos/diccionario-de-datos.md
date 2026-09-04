# Diccionario de Datos

## 20.1 Tabla: `usuarios` (Modulo: users - App: users)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico del usuario |
| usuario | CharField | 100 | NO | - | Nombre de usuario (unique) |
| correo | EmailField | 254 | NO | - | Correo electronico (unique) |
| contrasena | CharField | 255 | NO | - | Contrasena hasheada (PBKDF2) |
| estado | CharField | 20 | NO | 'Inactivo' | Estado: Activo, Inactivo, Bloqueado |
| rol | CharField | 20 | NO | 'Usuario' | Rol: Administrador, Usuario |
| fecha_registro | DateTimeField | - | NO | auto_now_add | Fecha de creacion de la cuenta |
| fecha_ultima_sesion | DateTimeField | - | SI | NULL | Ultimo inicio de sesion exitoso |
| email_verificado | BooleanField | - | NO | False | Indica si el correo fue verificado |
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
| base_price | DecimalField | 10,2 | NO | - | Precio base del producto |
| is_active | BooleanField | - | NO | False | Indica si el producto esta activo |
| is_approved | BooleanField | - | NO | False | Indica si el producto esta aprobado |
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
| stock | PositiveIntegerField | - | NO | 0 | Cantidad disponible en inventario |
| created_at | DateTimeField | - | NO | auto_now_add | Fecha de creacion |

## 20.9 Tabla: `products_productaudit` (Modulo: products)

| Columna | Tipo | Longitud | Nulo | Defecto | Descripcion |
|---------|------|----------|------|---------|-------------|
| id | AutoField | - | NO | - | Identificador unico |
| product_id | Integer (FK) | - | NO | - | Producto auditado |
| action | CharField | 20 | NO | - | Accion: created, updated, published |
| actor | CharField | 150 | NO | '' | Nombre del actor que realizo la accion |
| before_data | JSONField | - | NO | {} | Datos antes del cambio |
| after_data | JSONField | - | NO | {} | Datos despues del cambio |
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

## 20.12-20.18: Tablas Restantes (abreviado)

| Tabla | Columnas clave | Descripcion |
|-------|---------------|-------------|
| `carts_cart` | id, session_key(64,unique,null), user_id(FK), created_at, updated_at | Carrito de compras, vinculado a session_key o user |
| `carts_cartitem` | id, cart_id(FK), product_id(FK), variant_id(FK), quantity, unit_price, created_at, updated_at | Items dentro del carrito |
| `orders_order` | id, user_id(FK), customer_name(150), customer_email, status(20), total(10,2), image(text), image_url, cloudinary_public_id(255), design_color(50), logo_texture(text), full_texture(text), logo_scale(float), notes(text), created_at, updated_at | Orden de compra con datos de personalizacion |
| `orders_orderitem` | id, order_id(FK), product_id(FK), variant_id(FK), quantity, unit_price | Items de una orden |
| `contactos` | id, nombre(100), correo, asunto(150), mensaje(text), ip_origen(45), fecha_envio, leido, fecha_lectura | Mensajes del formulario de contacto |
| `models3d_model3d` | id, name(255,unique), description(text), cloudinary_url(500), cloudinary_public_id(255), file_type(20), file_size(bigint), is_active, is_approved, created_at, updated_at | Modelos 3D almacenados en Cloudinary |
| `models3d_model3dimage` | id, model_3d_id(FK), cloudinary_url(500), cloudinary_public_id(255), is_main, order, created_at | Imagenes de preview de modelos 3D |
