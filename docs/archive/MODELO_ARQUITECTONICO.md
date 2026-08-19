# Modelo Arquitectónico - RED Estampación

> Documento de arquitectura de software del proyecto. Describe el estilo arquitectónico,
> las capas, los componentes y los flujos de datos del sistema.

---

## 1. Estilo Arquitectónico

**Monolito Modular con APIs REST**

El proyecto adopta un enfoque de **monolito modular** donde el backend Django se organiza
en aplicaciones independientes (módulos) que se comunican a través de APIs REST.
Cada módulo tiene una responsabilidad específica y mantiene su propia lógica de negocio,
serializadores y vistas, pero comparten una misma base de datos y despliegue.

### ¿Por qué Monolito Modular y no Microservicios?

| Criterio | Decisión |
|----------|----------|
| Tamaño del equipo | 4 desarrolladores — un monolito es más manejable |
| Dominio | Catálogo, carrito, pedidos, pagos — dominio cohesionado con baja necesidad de escalado independiente |
| Deployment | Un solo servidor elimina complejidad de orquestación |
| Consistencia transaccional | El flujo checkout → pago → orden requiere ACID, más fácil en una BD compartida |
| Flexibilidad futura | La separación en módulos permite extraer microservicios si es necesario |

---

## 2. Diagrama de Arquitectura (ASCII)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       CLIENTE (Navegador Web)                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    FRONTEND (React + Vite)                            │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │  │
│  │  │ Landing   │  │ Catálogo  │  │ Carrito   │  │ Editor 3D        │  │  │
│  │  │ Page      │  │ Productos │  │ & Checkout│  │ (Three.js/R3F)   │  │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └──────────────────┘  │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────────────┐  │  │
│  │  │ Auth /     │  │ Perfil    │  │ Admin     │  │ Diseño           │  │  │
│  │  │ Registro   │  │ Usuario   │  │ Panel     │  │ Personalizado    │  │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └──────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTPS / REST API (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   BACKEND (Django + DRF)                                    │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    CAPA DE PRESENTACIÓN (API)                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │ JWT Auth  │ │ Permisos │ │ Throttle │ │ ViewSets │ │ Serializa │  │  │
│  │  │ Middleware│ │  (DRF)   │ │  (DRF)   │ │  (DRF)   │ │  dores    │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                CAPA DE NEGOCIO (Módulos Django)                       │  │
│  │                                                                       │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │   Users   │ │ Products │ │ Catalog  │ │  Carts   │ │  Orders   │  │  │
│  │  │ (usuarios │ │(productos│ │(categor. │ │(carrito) │ │ (pedidos, │  │  │
│  │  │ auth/jwt) │ │imágenes, │ │ /búsqued)│ │          │ │  pagos)   │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └───────────┘  │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────────┐  │  │
│  │  │  Checkout│ │ Landing  │ │ Models3D │ │  Management (admin)    │  │  │
│  │  │(wompi)   │ │(contacto)│ │(archivos)│ │  (dashboard/logs)      │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────────────────┘  │  │
│  │                                                                       │  │
│  │  ┌─────────────────────────────────────┐  ┌─────────────────────────┐ │  │
│  │  │       Servicios de Negocio          │  │   Tareas Asíncronas     │ │  │
│  │  │  ┌──────────┐ ┌──────────────────┐  │  │    (Celery)             │ │  │
│  │  │  │WompiSvc  │ │ CloudinarySvc    │  │  │  ┌───────────────────┐ │ │  │
│  │  │  │(adapter) │ │ (adapter)        │  │  │  │ Envío de emails  │ │ │  │
│  │  │  └──────────┘ └──────────────────┘  │  │  │ Limpieza BD       │ │ │  │
│  │  └─────────────────────────────────────┘  │  │ Reportes          │ │ │  │
│  │                                           │  └───────────────────┘ │ │  │
│  │                                           └─────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                    CAPA DE DATOS                                      │  │
│  │  ┌─────────────────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │   ORM Django        │  │    Redis      │  │    Sistema de        │ │  │
│  │  │   (Modelos/QuerySet)│  │  (Caché/Colas)│  │    Archivos          │ │  │
│  │  └─────────────────────┘  └──────────────┘  └──────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                               │                        │
                               ▼                        ▼
              ┌─────────────────────┐     ┌─────────────────────┐
              │  PostgreSQL (prod)  │     │  Cloudinary (CDN)   │
              │  SQLite (dev)       │     │  Imágenes y 3D      │
              └─────────────────────┘     └─────────────────────┘
                               │
                               ▼
              ┌─────────────────────┐
              │  Wompi (Pagos)      │
              │  (Sistema Externo)  │
              └─────────────────────┘
```

---

## 3. Capas Arquitectónicas

### 3.1 Capa de Presentación (Frontend — React SPA)

| Componente | Tecnología | Responsabilidad |
|------------|-----------|-----------------|
| **Landing Page** | React + Tailwind | Página principal con productos destacados, formulario de contacto |
| **Catálogo** | React + Axios | Listado, filtrado, búsqueda y detalle de productos |
| **Editor 3D** | Three.js + R3F + Drei | Visualización y personalización de modelos 3D |
| **Carrito** | React + Context API | Gestión del carrito de compras (añadir, eliminar, actualizar) |
| **Checkout** | React + Axios | Proceso de pago y redirección a Wompi |
| **Perfil** | React + Axios | Datos del usuario, historial de pedidos |
| **Admin Panel** | React + Axios | Dashboard, CRUD de productos/usuarios/pedidos, auditoría |
| **Auth** | React + JWT | Login, registro, recuperación de contraseña |

**Comunicación:** HTTPS + JSON mediante Axios hacia la API REST.

### 3.2 Capa API (Django REST Framework)

| Componente | Responsabilidad |
|------------|-----------------|
| **JWT Authentication** | `SimpleJWT` — autenticación basada en tokens |
| **Permission System** | Permisos por rol (Administrador/Usuario) y por recurso (propietario) |
| **Throttling** | Límites de tasa para endpoints sensibles (auth, contacto) |
| **ViewSets** | `ModelViewSet`, `ReadOnlyModelViewSet`, `GenericViewSet` |
| **Serializers** | Validación y transformación de datos request/response |
| **Routers** | Enrutamiento automático con `DefaultRouter` |
| **Versioning** | Namespace de URLs (no versioning explícito — API interna) |

### 3.3 Capa de Negocio (Módulos Django)

| Módulo | Ubicación | Modelos principales | Responsabilidad |
|--------|-----------|-------------------|-----------------|
| **users** | `backend/apps/users/` | `Usuario`, `Token_Verificacion`, `Cambio_Email`, `Historial_Estado_Usuario`, `Log_Auditoria` | Autenticación, registro, perfiles, auditoría |
| **products** | `backend/apps/products/` | `Product`, `ProductImage`, `Variant`, `ProductAudit` | Gestión de productos, imágenes, variantes |
| **catalog** | `backend/apps/catalog/` | `Category`, `ProductCategory`, `SearchHistory`, `CatalogFilter`, `PopularSearch` | Categorización y búsqueda |
| **carts** | `backend/apps/carts/` | `Cart`, `CartItem` | Carrito de compras |
| **checkout** | `backend/apps/checkout/` | — (usa modelos de orders, carts) | Orquestación del flujo de pago |
| **orders** | `backend/apps/orders/` | `Order`, `OrderItem` | Pedidos y su ciclo de vida |
| **models3d** | `backend/apps/models3d/` | `Model3D`, `Model3DImage` | Modelos y assets 3D |
| **landing** | `backend/apps/landing/` | `Contacto` | Landing page y contacto |
| **management** | `backend/apps/management/` | — (comandos personalizados) | Tareas de administración |

#### Servicios transversales

- **WompiService** (`backend/apps/checkout/services/wompi.py`): Adaptador para la API de Wompi (crear transacción, verificar, procesar webhook).
- **CloudinaryService** (`backend/apps/products/services/cloudinary.py`): Adaptador para subir/eliminar imágenes y modelos 3D en Cloudinary.

### 3.4 Capa de Datos

| Componente | Tecnología | Uso |
|------------|-----------|-----|
| **Base de datos** | SQLite (dev) / PostgreSQL 16+ (prod) | Persistencia principal — modelos Django |
| **Caché** | Redis | Caché de consultas frecuentes, sesiones, rate limiting |
| **Colas** | Redis + Celery | Tareas asíncronas (envío de emails, limpieza, reportes) |
| **Almacenamiento externo** | Cloudinary | Imágenes de productos, modelos 3D |
| **Sistema de archivos local** | `MEDIA_ROOT` | Fallback para desarrollo local |

---

## 4. Flujos de Datos

### 4.1 Flujo de catálogo

```
Usuario → Frontend → GET /api/products/?category=... → 
Backend → ORM Query → PostgreSQL → 
Serializer → JSON Response → Frontend → Render
```

### 4.2 Flujo de autenticación

```
Usuario → Frontend → POST /api/auth/login/ → 
Backend → Validar credenciales → JWT Token → 
Response {access, refresh} → Frontend (localStorage) → 
Enviar access_token en header Authorization: Bearer <token>
```

### 4.3 Flujo de checkout (completo)

```
1. Usuario agrega producto → POST /api/cart/add/
2. Usuario inicia checkout → POST /api/checkout/init/
3. Backend crea Order y OrderItems
4. Backend llama a WompiService.create_transaction()
5. Wompi responde con transaction_id + redirect_url
6. Backend guarda datos de transacción en Order
7. Backend responde con redirect_url
8. Frontend redirige al usuario a Wompi
9. Usuario paga en Wompi
10. Wompi envía webhook POST /api/webhook/wompi/
11. Backend valida firma, actualiza estado de Order
12. Backend descuenta stock de Variants
13. Backend confirma orden (email, websocket)
```

### 4.4 Flujo de administración

```
Admin → Frontend → GET /api/admin/dashboard/ → 
Backend → Consultas agregadas → PostgreSQL → 
JSON con métricas → Frontend → Gráficos

Admin → POST /api/admin/products/ → 
Backend → Permisos (IsAdminUser) → 
Serializer.validate() → Model.save() → 
Log_Auditoria.create() → Response
```

---

## 5. Integraciones Externas

### 5.1 Wompi (Pasarela de Pagos)

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Procesar pagos con tarjeta, PSE, y otros métodos |
| **Tipo** | API REST síncrona + Webhooks asíncronos |
| **Autenticación** | Public key (frontend), Private key (backend, firma HMAC) |
| **Métodos de pago** | Tarjeta crédito/débito, PSE (Colombia), Nequi, Daviplata |
| **Webhook** | `POST /api/webhook/wompi/` — validación de firma HMAC-SHA256 |
| **Modos** | Sandbox (desarrollo) / Producción |

### 5.2 Cloudinary (Almacenamiento de Media)

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Almacenar imágenes de productos y modelos 3D |
| **Tipo** | API REST + CDN |
| **Autenticación** | Cloud name + API Key + API Secret |
| **Formatos imagen** | JPG, PNG (con transformaciones: webp automático, calidad optimizada) |
| **Formatos 3D** | GLB, GLTF, OBJ, FBX, DAE |
| **Límites** | Máx. 5 imágenes por producto, máx. 2MB por imagen |

### 5.3 Email (SMTP)

| Aspecto | Detalle |
|---------|---------|
| **Propósito** | Verificación de email, recuperación de contraseña, notificaciones de pedido |
| **Tipo** | SMTP (Mailtrap en dev, SendGrid / SES en prod) |
| **Cola** | Tareas de Celery para envío asíncrono |

---

## 6. Seguridad

- **Autenticación:** JWT (access + refresh tokens) con `SimpleJWT`.
- **Autorización:** Permisos DRF por rol (Administrador/Usuario).
- **Rate Limiting:** Throttling en endpoints sensibles (login: 5/min, registro: 3/min, contacto: 3/min).
- **CSRF:** Deshabilitado para API REST, habilitado para admin Django.
- **CORS:** `django-cors-headers` configurado para el origen del frontend.
- **Validación:** `full_clean()` en modelos (validación centralizada antes de guardar).
- **Secretos:** Variables de entorno con `django-environ`, escaneo con `ggshield`.
- **Contraseñas:** Hash con `PBKDF2` (por defecto Django), rotación periódica.

---

## 7. Despliegue

```
Frontend (React + Vite)          → Servicio estático (Nginx / Vercel / Netlify)
Backend (Django + DRF + Celery)  → Servidor Python (Gunicorn + Uvicorn)
Base de datos                    → PostgreSQL 16+
Redis                            → Cache + Celery broker
Cloudinary                       → CDN externo
Wompi                            → API externa

Contenedores: Docker + Docker Compose (desarrollo)
Orquestación: docker compose up (dev) / docker-compose.prod.yml (prod)
```

---

> **Última actualización:** Junio 2026
> **Mantenido por:** Equipo RED Estampación
