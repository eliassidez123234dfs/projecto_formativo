# Stack Tecnologico

## 17.1 Stack Completo

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| **Lenguaje Backend** | Python | 3.12 | Logica de negocio del servidor |
| **Framework Backend** | Django | 5.2 | Framework web completo (ORM, admin, migraciones) |
| **API REST** | Django REST Framework | 3.16 | Creacion de API REST con serializers y viewsets |
| **Autenticacion JWT** | djangorestframework-simplejwt | 5.5 | Tokens JWT para autenticacion stateless |
| **CORS** | django-cors-headers | 4.9 | Permitir peticiones cross-origin desde el frontend |
| **Variables de Entorno** | django-environ | 0.13 | Gestion de configuracion por entorno |
| **Procesamiento Imagenes** | Pillow | 12.1 | Validacion y procesamiento de imagenes |
| **Servidor WSGI** | Gunicorn | 26.0 | Servidor de produccion para Django |
| **Base de Datos (dev)** | SQLite | 3.x | Base de datos embebida para desarrollo |
| **Base de Datos (prod)** | PostgreSQL | 16.x | Base de datos relacional para produccion |
| **Cliente PostgreSQL** | psycopg2-binary | 2.9 | Driver de conexion a PostgreSQL |
| **Cola de Tareas** | Celery | 5.4 | Procesamiento asincrono (pendiente de configuracion) |

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| **Lenguaje Frontend** | JavaScript (ES2024) | - | Logica del navegador |
| **Framework Frontend** | React | 19.2 | Construccion de interfaz de usuario basada en componentes |
| **Bundler** | Vite | 8.0 | Empaquetado y dev server con HMR |
| **Ruteo** | React Router DOM | 7.14 | Enrutamiento del lado del cliente |
| **Cliente HTTP** | Axios | 1.16 | Peticiones HTTP con interceptors |
| **Notificaciones** | react-hot-toast | 2.6 | Notificaciones toast no obstructivas |
| **Preprocesador CSS** | Sass | 1.101 | Estilos avanzados con SCSS |
| **Linter** | ESLint | 10.2 | Analisis estatico de codigo |

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| **Contenedorizacion** | Docker | 24+ | Empaquetado de aplicaciones en contenedores |
| **Orquestacion** | Docker Compose | 2.20+ | Orquestacion multi-contenedor |
| **Control de Versiones** | Git / GitHub | - | Versionado y repositorio remoto |

| Capa | Tecnologia | Version | Proposito |
|------|-----------|---------|-----------|
| **Almacenamiento Cloud** | Cloudinary | - | Almacenamiento y transformacion de imagenes/modelos 3D |
| **Correo** | Gmail SMTP | - | Envio de correos transaccionales |

## 17.2 Dependencias Backend (requirements.txt)

| Paquete | Version | Uso |
|---------|---------|-----|
| Django | 5.2.13 | Framework principal |
| djangorestframework | 3.16.1 | API REST |
| djangorestframework_simplejwt | 5.5.1 | JWT authentication |
| django-cors-headers | 4.9.0 | CORS headers |
| django-environ | 0.13.0 | Variables de entorno |
| django-ckeditor | 6.7.3 | Editor de texto enriquecido |
| django-ratelimit | 4.1.0 | Rate limiting |
| django-storages | 1.14.6 | Almacenamiento cloud |
| gunicorn | 26.0.0 | Servidor WSGI |
| pillow | 12.1.1 | Procesamiento de imagenes |
| psycopg2-binary | 2.9.12 | Driver PostgreSQL |
| celery | 5.4.0 | Tareas asincronas |
| python-decouple | 3.8 | Configuracion simplificada |

## 17.3 Dependencias Frontend (package.json)

| Paquete | Version | Uso |
|---------|---------|-----|
| react | ^19.2.5 | Framework UI |
| react-dom | ^19.2.5 | Renderizado DOM |
| react-router-dom | ^7.14.2 | Enrutamiento SPA |
| axios | ^1.16.0 | Cliente HTTP |
| react-hot-toast | ^2.6.0 | Notificaciones |
| vite | ^8.0.10 | Bundler (dev) |
| sass | ^1.101.0 | Preprocesador CSS (dev) |
| eslint | ^10.2.1 | Linter (dev) |

## 17.4 Arquitectura de 3 Instancias de Axios

El frontend configura tres instancias de Axios para diferentes propositos:

| Instancia | Caracteristicas | Uso |
|-----------|----------------|------|
| `api` | Con JWT en Header, refresh token interceptor | Endpoints protegidos que requieren JWT |
| `publicApi` | Sin autenticacion | Endpoints publicos (catalogo, detalle producto) |
| `sessionApi` | Con `withCredentials: true` (cookies de sesion) | Carrito de compras (usa session_key de Django) |
