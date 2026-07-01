# Modelo de Datos

## 19.1 Esquema General

La base de datos del proyecto RED esta compuesta por **18 tablas** distribuidas en **8 modulos funcionales**. Se utiliza el ORM de Django, que abstrae las diferencias entre SQLite (desarrollo) y PostgreSQL (produccion).

### Mapa de Tablas por Modulo

| Modulo | Tablas | Proposito |
|--------|--------|-----------|
| **users** (5 tablas) | `usuarios`, `tokens_verificacion`, `cambios_email`, `historial_estado_usuarios`, `logs_auditoria` | Gestion de usuarios, autenticacion, auditoria |
| **products** (4 tablas) | `products`, `products_productimage`, `products_variant`, `products_productaudit` | Productos, imagenes, variantes, auditoria |
| **catalog** (4 tablas) | `catalog_category`, `catalog_productcategory`, `catalog_searchhistory`, `catalog_popularsearch` | Categorias, busquedas |
| **carts** (2 tablas) | `carts_cart`, `carts_cartitem` | Carrito de compras |
| **orders** (2 tablas) | `orders_order`, `orders_orderitem` | Ordenes y pedidos |
| **landing** (1 tabla) | `contactos` | Formulario de contacto |
| **models3d** (2 tablas) | `models3d_model3d`, `models3d_model3dimage` | Modelos 3D |

## 19.2 Estrategia de Almacenamiento

| Tipo de Dato | Almacenamiento |
|-------------|---------------|
| Datos transaccionales (usuarios, productos, ordenes) | SQLite (dev) / PostgreSQL (prod) |
| Imagenes de productos | Archivos locales en `media/` (dev) / Cloudinary (prod) |
| Modelos 3D | Cloudinary (URL almacenada en BD) |
| Sesiones de usuario | Tabla `django_session` (base de datos) |
| Archivos estaticos (CSS, JS) | Servidos por Gunicorn (dev) / Nginx (prod) |

## 19.3 Indices y Optimizacion

| Tabla | Indices | Proposito |
|-------|---------|-----------|
| `usuarios` | `usuario`, `correo`, `(estado, rol)`, `fecha_registro` | Login rapido, filtros admin |
| `tokens_verificacion` | `token`, `(usuario, tipo)`, `fecha_expiracion` | Validacion de tokens |
| `logs_auditoria` | `(usuario_admin, fecha_accion)`, `(usuario_afectado, fecha_accion)`, `fecha_accion` | Auditoria eficiente |
| `carts_cartitem` | `(cart, product, variant)` UK | Evita duplicados en carrito |
| `products_variant` | `(product, size, color)` UK | Variantes unicas por producto |
| `products_productimage` | `(product, order)` UK | Ordenamiento de imagenes |
| `contactos` | `correo`, `fecha_envio`, `leido` | Filtros admin |
| `catalog_searchhistory` | `(session_key, -created_at)` | Historial por sesion |

## 19.4 Restricciones y Reglas de Integridad

| Restriccion | Tabla | Detalle |
|-------------|-------|---------|
| Unique | `usuarios.usuario` | Nombre de usuario unico |
| Unique | `usuarios.correo` | Correo electronico unico |
| Unique | `products.name` | Nombre de producto unico |
| Unique | `catalog_category.name` | Nombre de categoria unico |
| Unique FK | `carts_cartitem(cart, product, variant)` | Un item por producto+variante en el mismo carrito |
| Unique FK | `products_variant(product, size, color)` | Una variante combinada por producto |
| Check | `products.base_price > 0` | Precio debe ser positivo |
| Check | `carts_cartitem.quantity >= 1` | Cantidad minima 1 |
| Check | `products_variant.stock >= 0` | Stock no negativo |
| Check | `products_productimage.order` entre 1 y 5 | Maximo 5 imagenes |
| FK CASCADE | `carts_cartitem.cart` | Al eliminar carrito, se eliminan sus items |
| FK SET_NULL | `carts.cart.user` | Al eliminar usuario, el carrito queda huerfano (user=NULL) |
| FK PROTECT | `orders_orderitem.product` | No se puede eliminar un producto con ordenes asociadas |
