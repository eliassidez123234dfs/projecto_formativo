# Requisitos No Funcionales

## 8.1 Rendimiento

| ID | Nombre | Descripcion |
|----|--------|-------------|
| RNF-01 | Tiempo de Respuesta | La API debe responder en menos de 500ms para peticiones de lectura y menos de 1500ms para peticiones de escritura, en condiciones normales de operacion. |
| RNF-02 | Paginacion | Todos los endpoints de listado deben implementar paginacion con un maximo de 20 elementos por pagina para garantizar tiempos de respuesta aceptables. |
| RNF-03 | Cache de Consultas | Las consultas frecuentes al catalogo deben utilizar indices de base de datos para optimizar el rendimiento. |
| RNF-04 | Rate Limiting | El sistema debe limitar las peticiones de autenticacion a 1000 solicitudes por hora para usuarios anonimos y 10000 para usuarios autenticados. El formulario de contacto debe limitarse a 3 solicitudes por hora. |

## 8.2 Seguridad

| ID | Nombre | Descripcion |
|----|--------|-------------|
| RNF-05 | Almacenamiento de Contrasenas | Las contrasenas deben almacenarse utilizando el algoritmo PBKDF2 de Django (hasher predeterminado), nunca en texto plano. |
| RNF-06 | Autenticacion JWT | Los tokens JWT deben tener una expiracion de 15 minutos para access tokens y 7 dias para refresh tokens, firmados con algoritmo HS256. |
| RNF-07 | Proteccion de Sesion | Al iniciar y cerrar sesion, la clave de sesion debe rotarse (cycle_key) para prevenir fijacion de sesion. |
| RNF-08 | Bloqueo por Intentos | La cuenta debe bloquearse despues de 5 intentos fallidos de inicio de sesion, previniendo ataques de fuerza bruta. |
| RNF-09 | Soft Delete | Los usuarios no deben eliminarse fisicamente de la base de datos; deben marcarse como "eliminados" (soft delete) para preservar la integridad referencial. |
| RNF-10 | CORS | El backend debe permitir origenes cruzados solo desde los dominios autorizados (frontend en desarrollo y produccion). |
| RNF-11 | Validacion de Entrada | Todos los datos de entrada deben validarse tanto en el frontend como en el backend para prevenir inyeccion de datos maliciosos. |
| RNF-12 | Proteccion CSRF | Las solicitudes de escritura deben protegerse contra CSRF mediante tokens, excepto en endpoints de API que usan JWT. |

## 8.3 Usabilidad

| ID | Nombre | Descripcion |
|----|--------|-------------|
| RNF-13 | Interfaz Responsiva | La aplicacion debe adaptarse correctamente a dispositivos moviles, tablets y pantallas de escritorio. |
| RNF-14 | Tema Claro/Oscuro | La aplicacion debe soportar modo claro y modo oscuro, persistente en el navegador del usuario. |
| RNF-15 | Feedback Visual | Las acciones del usuario deben tener retroalimentacion visual inmediata (toasts de exito/error, indicadores de carga). |
| RNF-16 | Tiempo de Carga | La aplicacion frontend debe cargar el bundle inicial en menos de 3 segundos en conexiones de banda ancha. |

## 8.4 Disponibilidad y Mantenibilidad

| ID | Nombre | Descripcion |
|----|--------|-------------|
| RNF-17 | Contenedorizacion | El sistema debe poder ejecutarse en contenedores Docker para garantizar la reproducibilidad del entorno. |
| RNF-18 | Logging | El sistema debe registrar errores y eventos importantes en archivos de log, incluyendo trazas completas de excepciones. |
| RNF-19 | Migraciones de Base de Datos | Todos los cambios en el esquema de base de datos deben realizarse mediante migraciones de Django, garantizando la trazabilidad de los cambios. |
| RNF-20 | Separacion de Entornos | Deben existir configuraciones diferenciadas para desarrollo y produccion, manejadas mediante variables de entorno. |

## 8.5 Portabilidad

| ID | Nombre | Descripcion |
|----|--------|-------------|
| RNF-21 | Compatibilidad de Navegadores | La aplicacion debe ser compatible con las versiones actuales de Chrome, Firefox, Safari y Edge. |
| RNF-22 | Base de Datos | El sistema debe ser compatible con SQLite en desarrollo y PostgreSQL en produccion, utilizando el ORM de Django para abstraer la capa de datos. |
| RNF-23 | Despliegue | El sistema debe poder desplegarse en cualquier servidor que soporte Python 3.12 y Node.js 20 o superior. |

## 8.6 Restricciones de Diseno

| ID | Nombre | Descripcion |
|----|--------|-------------|
| RNF-24 | Arquitectura REST | La API debe seguir los principios RESTful: recursos identificados por URLs, metodos HTTP estandar, formatos JSON. |
| RNF-25 | Convenciones de Codigo | El backend debe seguir PEP 8 (Python) y el frontend las convenciones de ESLint configuradas en el proyecto. |
| RNF-26 | Git Flow | El codigo fuente debe versionarse con Git, siguiendo una rama principal (main) y ramas de funcionalidad (feature/*). |
