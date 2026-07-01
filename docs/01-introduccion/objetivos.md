# Objetivos

## 4.1 Objetivo General

Disenar e implementar una plataforma web de comercio electronico para la venta de prendas de vestir con estampados personalizables, que integre un catalogo digital interactivo, visualizacion 3D de disenos, gestion de carrito de compras, procesamiento de pedidos y un panel administrativo completo con capacidades de auditoria.

## 4.2 Objetivos Especificos

### OE1. Modulo de Autenticacion y Gestion de Usuarios
- **RF-001**: Implementar un sistema de registro de usuarios con verificacion de correo electronico.
- **RF-002**: Desarrollar mecanismos de recuperacion y cambio de contrasena.
- **RF-003**: Permitir el reenvio de correos de verificacion.
- **RF-008**: Implementar inicio de sesion con generacion de tokens JWT.
- **RF-009**: Gestionar la verificacion de correo electronico como requisito para activar la cuenta.
- **RF-010**: Proporcionar funcionalidades de perfil de usuario (edicion de datos, cambio de contrasena).
- **RF-011**: Soportar roles de usuario (Administrador y Usuario regular).
- **RF-012**: Implementar cierre de sesion (logout) con renovacion de clave de sesion.

### OE2. Modulo de Administracion de Usuarios
- **RF-013**: Permitir al administrador listar, buscar y visualizar usuarios.
- **RF-014**: Permitir la creacion manual de usuarios por parte del administrador.
- **RF-015**: Habilitar la edicion de datos de usuarios por parte del administrador.
- **RF-016**: Implementar el cambio de estado de usuarios (Activo/Inactivo/Bloqueado).
- **RF-017**: Proveer funcionalidad de desbloqueo de cuentas.
- **RF-018**: Implementar reseteo de contrasena de usuarios desde la administracion.
- **RF-019**: Realizar eliminacion logica de usuarios.
- **RF-020**: Visualizar el historial de cambios de estado de los usuarios.

### OE3. Modulo de Gestion de Productos
- **RF-021**: Implementar CRUD completo de productos (nombre, descripcion, precio).
- **RF-022**: Gestionar imagenes de productos (hasta 5 imagenes por producto).
- **RF-023**: Administrar variantes de productos (talla, color, stock).
- **RF-024**: Publicar productos con validacion condicional (checklist de requisitos).
- **RF-025**: Activar/desactivar productos.
- **RF-026**: Visualizar historial de auditoria de cambios en productos.

### OE4. Modulo de Catalogo Publico
- **RF-027**: Visualizar catalogo de productos activos y aprobados.
- **RF-028**: Implementar busqueda textual de productos.
- **RF-029**: Filtrar productos por categoria, talla, color y rango de precio.
- **RF-030**: Ordenar productos por nombre y precio.
- **RF-031**: Implementar paginacion en los resultados de busqueda.
- **RF-032**: Visualizar productos destacados y ofertas.
- **RF-033**: Registrar busquedas populares e historial por sesion.

### OE5. Modulo de Carrito de Compras
- **RF-034**: Agregar productos al carrito con seleccion de variante.
- **RF-035**: Visualizar el contenido del carrito (items, cantidad, subtotales, total).
- **RF-036**: Actualizar la cantidad de items en el carrito.
- **RF-037**: Eliminar items del carrito.
- **RF-038**: Vaciar el carrito completamente.
- **RF-039**: Fusionar el carrito anonimo al carrito del usuario al iniciar sesion.

### OE6. Modulo de Checkout y Ordenes
- **RF-040**: Visualizar resumen de la compra antes de confirmar.
- **RF-041**: Confirmar pedido validando stock disponible.
- **RF-042**: Crear orden con estado inicial "pendiente".
- **RF-043**: Decrementar stock de variantes al confirmar la orden.
- **RF-044**: Registrar datos del cliente (nombre, email) en la orden.
- **RF-045**: Capturar parametros de personalizacion (color, textura, imagen) en la orden.

### OE7. Modulo de Modelos 3D
- **RF-046**: Gestionar modelos 3D con sus archivos en la nube.
- **RF-047**: Asociar imagenes de previsualizacion a modelos 3D.
- **RF-048**: Visualizar modelos 3D activos y aprobados.
- **RF-049**: Filtrar modelos 3D por estado de activacion y aprobacion.

### OE8. Modulo de Contacto
- **RF-050**: Enviar mensajes de contacto desde la pagina de inicio.
- **RF-051**: Notificar al administrador por email sobre nuevos mensajes.
- **RF-052**: Gestionar mensajes de contacto (listar, marcar como leido, eliminar).

### OE9. Panel de Administracion y Estadisticas
- **RF-053**: Visualizar estadisticas agregadas (usuarios, productos, ordenes, ventas).
- **RF-054**: Gestionar productos desde el panel administrativo.
- **RF-055**: Gestionar usuarios desde el panel administrativo.
- **RF-056**: Visualizar carritos de compras de usuarios.
- **RF-057**: Consultar el log de auditoria de acciones administrativas.
- **RF-058**: Aplicar rate limiting en login y formulario de contacto.
