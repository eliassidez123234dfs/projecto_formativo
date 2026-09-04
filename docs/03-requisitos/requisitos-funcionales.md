# Requisitos Funcionales

## 7.1 Modulo de Autenticacion

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-001 | Registro de Usuario | El sistema debe permitir el registro de nuevos usuarios proporcionando usuario, correo y contrasena. Debe validar que el usuario y correo sean unicos, la contrasena cumpla requisitos de seguridad (>=8 caracteres, mayuscula, numero, caracter especial), y crear un token de verificacion de email. | Alta |
| RF-002 | Recuperacion de Contrasena | El sistema debe permitir solicitar la recuperacion de contrasena mediante el envio de un token por correo electronico con validez de 1 hora, y posteriormente establecer una nueva contrasena con el token. | Alta |
| RF-003 | Reenvio de Verificacion | El sistema debe permitir el reenvio del correo de verificacion de email, con un limite maximo de 3 reenvios en 24 horas. | Media |
| RF-008 | Inicio de Sesion | El sistema debe autenticar usuarios mediante correo y contrasena, generando un par de tokens JWT (access y refresh). Debe migrar el carrito anonimo al usuario autenticado y rotar la clave de sesion. Debe bloquear la cuenta tras 5 intentos fallidos. | Alta |
| RF-009 | Verificacion de Email | El sistema debe verificar la direccion de correo electronico mediante un token enviado por email. Al verificarse, el usuario pasa a estado Activo. | Alta |
| RF-010 | Gestion de Perfil | El usuario autenticado debe poder visualizar y editar su perfil (usuario, correo), asi como cambiar su contrasena proporcionando la contrasena actual. | Media |
| RF-011 | Roles de Usuario | El sistema debe soportar dos roles: Administrador y Usuario. Los administradores tienen acceso al panel de administracion. | Alta |
| RF-012 | Cierre de Sesion | El sistema debe cerrar la sesion del usuario rotando la clave de sesion. | Media |

## 7.2 Modulo de Administracion de Usuarios

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-013 | Listar Usuarios | El administrador debe poder listar todos los usuarios con filtros por estado, rol, verificacion de email y eliminacion, con busqueda por texto (usuario, correo, ID). | Alta |
| RF-014 | Crear Usuario | El administrador debe poder crear usuarios manualmente, asignando usuario, correo, estado, rol y contrasena (o generando una temporal). | Alta |
| RF-015 | Editar Usuario | El administrador debe poder editar los datos de un usuario existente, con restricciones: no puede cambiar su propio rol ni desactivarse a si mismo. | Alta |
| RF-016 | Cambiar Estado | El administrador debe poder cambiar el estado de un usuario (Activo, Inactivo, Bloqueado), registrando el cambio en el historial. | Alta |
| RF-017 | Desbloquear Usuario | El administrador debe poder desbloquear una cuenta bloqueada, reseteando los intentos fallidos y registrando quien realizo el desbloqueo. | Alta |
| RF-018 | Resetear Contrasena | El administrador debe poder generar una contrasena temporal para un usuario y enviarla por correo. | Media |
| RF-019 | Eliminar Usuario | El administrador debe poder realizar eliminacion logica de usuarios, registrando quien elimino y la fecha. No permite eliminar al unico administrador activo. | Alta |
| RF-020 | Historial de Estados | El administrador debe poder visualizar el historial de cambios de estado de un usuario. | Media |

## 7.3 Modulo de Gestion de Productos

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-021 | CRUD de Productos | El sistema debe permitir crear, leer, actualizar y eliminar productos con nombre (max 100 caracteres), descripcion (max 500) y precio base. | Alta |
| RF-022 | Gestion de Imagenes | El sistema debe permitir agregar hasta 5 imagenes por producto, con soporte para imagen principal, ordenamiento y formatos JPG/PNG (max 2MB, min 400x400px). | Alta |
| RF-023 | Gestion de Variantes | El sistema debe permitir definir variantes por producto (talla y color), con maximo 4 tallas y 10 colores, y control de stock individual. | Alta |
| RF-024 | Publicacion Condicional | El sistema debe validar que un producto cumpla con los requisitos minimos (nombre, descripcion, imagen principal, variante con stock) antes de publicarlo. | Alta |
| RF-025 | Activacion de Productos | El sistema debe permitir activar/desactivar productos sin eliminar sus datos. | Media |
| RF-026 | Auditoria de Productos | El sistema debe registrar un historial de cambios (creacion, actualizacion, publicacion) para cada producto. | Baja |

## 7.4 Modulo de Catalogo

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-027 | Visualizar Catalogo | El sistema debe mostrar el catalogo de productos activos y aprobados, con paginacion de 20 elementos por pagina. | Alta |
| RF-028 | Busqueda Textual | El sistema debe permitir buscar productos por nombre y descripcion. | Alta |
| RF-029 | Filtros Combinados | El sistema debe permitir filtrar productos por categoria, talla, color y rango de precio, de forma combinada. | Alta |
| RF-030 | Ordenamiento | El sistema debe permitir ordenar productos por nombre (A-Z, Z-A) y precio (menor a mayor, mayor a menor). | Media |
| RF-031 | Paginacion | El sistema debe paginar los resultados del catalogo con navegacion entre paginas. | Alta |
| RF-032 | Productos Destacados | El sistema debe mostrar los 12 productos mejor posicionados (con stock e imagenes) en la seccion de destacados. | Media |
| RF-033 | Historial de Busquedas | El sistema debe registrar las busquedas realizadas por sesion y las busquedas populares globales. | Baja |

## 7.5 Modulo de Carrito de Compras

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-034 | Agregar al Carrito | El sistema debe permitir agregar productos al carrito seleccionando variante y cantidad. Si el producto ya existe, debe sumar la cantidad (sin superar el stock). | Alta |
| RF-035 | Visualizar Carrito | El sistema debe mostrar el contenido del carrito: items con imagen, nombre, variante, cantidad, precio unitario, subtotal, y el total general. | Alta |
| RF-036 | Actualizar Cantidad | El sistema debe permitir modificar la cantidad de un item en el carrito, validando el stock disponible. | Alta |
| RF-037 | Eliminar Item | El sistema debe permitir eliminar un item especifico del carrito. | Alta |
| RF-038 | Vaciar Carrito | El sistema debe permitir eliminar todos los items del carrito de una vez. | Media |
| RF-039 | Fusion al Login | Al iniciar sesion, el sistema debe fusionar el carrito anonimo (asociado a la sesion) con el carrito del usuario autenticado. | Alta |

## 7.6 Modulo de Checkout y Ordenes

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-040 | Resumen de Compra | El sistema debe mostrar un resumen de la compra antes de confirmar, con todos los items y el total. | Alta |
| RF-041 | Confirmar Pedido | El sistema debe validar el stock disponible de cada item y crear la orden si todo es valido. | Alta |
| RF-042 | Estado de Orden | Las ordenes deben crearse con estado "pendiente" y soportar los estados: pendiente, pagado, procesando, completado, cancelado. | Alta |
| RF-043 | Decrementar Stock | Al confirmar la orden, el sistema debe decrementar el stock de las variantes compradas. | Alta |
| RF-044 | Datos del Cliente | El sistema debe capturar nombre y email del cliente en la orden. | Alta |
| RF-045 | Personalizacion | El sistema debe permitir almacenar parametros de personalizacion en la orden: color de diseno, textura de logo/imagen, escala del logo, notas. | Media |

## 7.7 Modulo de Modelos 3D

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-046 | Gestion de Modelos 3D | El sistema debe permitir crear, leer, actualizar y eliminar modelos 3D con nombre, descripcion, URL de Cloudinary y tipo de archivo. | Alta |
| RF-047 | Imagenes de Preview | El sistema debe permitir asociar imagenes de previsualizacion a los modelos 3D. | Media |
| RF-048 | Visualizar Modelos | El sistema debe mostrar los modelos 3D activos y aprobados. | Alta |
| RF-049 | Filtrar Modelos | El sistema debe permitir filtrar modelos por estado de activacion y aprobacion. | Media |

## 7.8 Modulo de Contacto

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-050 | Enviar Mensaje | El sistema debe permitir enviar mensajes de contacto con nombre, correo, asunto y mensaje. Debe tener rate limiting de 3 mensajes por hora. | Media |
| RF-051 | Notificacion al Admin | El sistema debe notificar al administrador por correo electronico cuando se recibe un nuevo mensaje de contacto. | Media |
| RF-052 | Gestionar Mensajes | El administrador debe poder listar, marcar como leido y eliminar mensajes de contacto. | Media |

## 7.9 Panel de Administracion

| ID | Nombre | Descripcion | Prioridad |
|----|--------|-------------|-----------|
| RF-053 | Dashboard Estadisticas | El sistema debe mostrar estadisticas agregadas: total de usuarios, productos, ordenes y ventas. | Alta |
| RF-054 | Gestion Admin de Productos | El administrador debe poder gestionar productos desde el panel (listar, crear, editar, activar, publicar). | Alta |
| RF-055 | Gestion Admin de Usuarios | El administrador debe poder gestionar usuarios desde el panel. | Alta |
| RF-056 | Visualizar Carritos | El administrador debe poder consultar los carritos de compras de los usuarios. | Media |
| RF-057 | Log de Auditoria | El administrador debe poder consultar el registro de auditoria de acciones administrativas. | Alta |
| RF-058 | Rate Limiting | El sistema debe aplicar limitacion de velocidad (rate limiting) en el inicio de sesion y el formulario de contacto para prevenir abusos. | Media |
