# Justificacion

## 3.1 Justificacion Tecnologica

La arquitectura del proyecto responde a las necesidades actuales del desarrollo de software empresarial:

- **API REST con Django REST Framework**: Proporciona una separacion clara entre backend y frontend, permitiendo que ambos componentes evolucionen de forma independiente y facilitando la integracion con terceros.

- **Autenticacion JWT**: Ofrece un mecanismo seguro y stateless para la autenticacion, ideal para aplicaciones SPA (Single Page Application) como la desarrollada en React.

- **Microservicio 3D independiente**: La separacion del visualizador 3D en un servicio aparte (con su propio stack: Vite + Tailwind + Three.js) permite escalarlo y mantenerlo de forma autonoma sin afectar el sistema transaccional.

- **Contenedorizacion con Docker**: Garantiza entornos reproducibles entre desarrollo y produccion, eliminando el clasico problema de "funciona en mi maquina".

## 3.2 Justificacion Funcional

Cada modulo del sistema responde a una necesidad identificada:

| Necesidad | Solucion Implementada |
|-----------|----------------------|
| Registro seguro con verificacion | Flujo de registro + token de verificacion por email |
| Recuperacion de acceso | Sistema de recuperacion de contrasena con token temporal |
| Control de acceso por roles | Roles Administrador/Usuario con permisos diferenciados |
| Catalogo navegable | Busqueda textual, filtros combinados, paginacion, ordenamiento |
| Personalizacion de prendas | Visualizador 3D con personalizacion en tiempo real |
| Compra sin registro | Carrito por session key para usuarios anonimos |
| Fusion de carrito al login | Migracion automatica del carrito anonimo al autenticado |
| Auditoria administrativa | Registro detallado de todas las acciones de administradores |
| Seguridad en login | Bloqueo por intentos fallidos, rate limiting |

## 3.3 Justificacion Social y Economica

La plataforma democratiza el acceso a la personalizacion textil al ofrecer:

- Una interfaz intuitiva que no requiere conocimientos tecnicos de diseno
- Visualizacion previa del producto final, reduciendo devoluciones y desperdicio
- Un canal de venta digital accesible desde cualquier dispositivo con conexion a internet
- Herramientas de gestion que permiten a pequenos emprendedores administrar su inventario y pedidos de forma eficiente
