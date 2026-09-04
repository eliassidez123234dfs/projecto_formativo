# Alcance y Limitaciones

## 5.1 Alcance del Sistema

### Dentro del Alcance

**Modulos funcionales incluidos:**

| Modulo | Funcionalidades |
|--------|----------------|
| Autenticacion | Registro, login, logout, verificacion de email, recuperacion de contrasena, reenvio de verificacion |
| Gestion de Usuarios | Perfil, edicion de datos, cambio de contrasena, roles (Administrador/Usuario) |
| Administracion de Usuarios | CRUD, cambio de estado, bloqueo/desbloqueo, reseteo de contrasena, eliminacion logica, auditoria |
| Gestion de Productos | CRUD, imagenes (hasta 5), variantes (talla/color), publicacion, activacion, auditoria |
| Catalogo Publico | Visualizacion, busqueda, filtros (categoria/talla/color/precio), paginacion, destacados |
| Carrito de Compras | Agregar, listar, actualizar cantidad, eliminar items, vaciar, fusion al login |
| Checkout | Resumen de compra, confirmacion de pedido, validacion de stock |
| Ordenes | Creacion con datos de cliente y personalizacion, estados (pendiente/pagado/procesando/completado/cancelado) |
| Modelos 3D | CRUD de modelos, imagenes de preview, activacion/aprobacion |
| Formulario de Contacto | Envio de mensajes, notificacion admin, gestion (leido/eliminado) |
| Panel Admin | Dashboard con estadisticas, gestion de productos/usuarios/carritos, auditoria |

### Fuera del Alcance

- **Pasarela de pagos en linea**: Las ordenes se crean con estado "pendiente" y no se integra con un procesador de pagos.
- **Notificaciones push o SMS**: Solo se implementa notificacion por correo electronico.
- **Aplicacion movil nativa**: La plataforma es web responsiva, no hay app Android/iOS.
- **Multi-idioma**: La interfaz esta unicamente en espanol.
- **Marketplace multi-vendedor**: El sistema es monotienda (un solo vendedor/administrador).
- **Sistema de facturacion electronica**: No se generan facturas ni documentos tributarios.
- **Integracion con redes sociales**: No hay login social ni publicacion automatica en redes.
- **Chat en vivo**: La comunicacion con el cliente es via formulario de contacto y correo.
- **Recomendaciones basadas en ML**: Los productos relacionados son estaticos por categoria.
- **Sistema de cupones y descuentos**: No hay funcionalidad de promociones ni codigos de descuento.

## 5.2 Limitaciones Tecnicas

| Limitacion | Descripcion | Impacto |
|------------|-------------|---------|
| Base de datos SQLite | En desarrollo se usa SQLite, que no soporta concurrencia alta | Solo apto para desarrollo, en produccion debe migrarse a PostgreSQL |
| Almacenamiento local de archivos | Las imagenes se almacenan en el sistema de archivos del servidor | Escalabilidad limitada; se recomienda Cloudinary o S3 en produccion |
| Sin CDN | Los archivos estaticos se sirven desde el mismo servidor Django | Mayor latencia en produccion |
| Autenticacion JWT basica | Los tokens se almacenan en localStorage (frontend) | Vulnerable a XSS si no se implementan medidas de seguridad adicionales |
| Sin WebSockets | No hay actualizaciones en tiempo real | Las notificaciones requieren refresco manual o polling |
| Sin Celery en produccion | Aunque Celery esta en requirements, no esta configurado | Los correos se envian sincronicamente, bloqueando la respuesta |
| Rate limiting basico | Solo aplica a login y formulario de contacto | Podria requerir ampliarse a otros endpoints |
