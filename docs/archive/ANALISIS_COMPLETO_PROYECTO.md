# Análisis Completo del Proyecto RED - Ropa con Estampados Digitales

**Fecha de análisis:** 4 de septiembre de 2026  
**Rama analizada:** `recuperacion-estable` (commit `000f9d7`)  
**Analista:** opencode (asistente de código)

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Capas de Seguridad](#3-capas-de-seguridad)
4. [Análisis del Modelo Cambio_Email](#4-análisis-del-modelo-cambio_email)
5. [Backend - Análisis Detallado](#5-backend---análisis-detallado)
6. [Frontend - Análisis Detallado](#6-frontend---análisis-detallado)
7. [Microservicios - Análisis Detallado](#7-microservicios---análisis-detallado)
8. [Docker y Despliegue](#8-docker-y-despliegue)
9. [Problemas Identificados](#9-problemas-identificados)
10. [Cosas que Sobran / Código Muerto](#10-cosas-que-sobran--código-muerto)
11. [Cosas que Faltan](#11-cosas-que-faltan)
12. [Recomendaciones de Mejora](#12-recomendaciones-de-mejora)
13. [Pruebas Unitarias](#13-pruebas-unitarias)

---

## 1. Resumen Ejecutivo

**RED (Ropa con Estampados Digitales)** es una plataforma e-commerce para personalización de camisetas con impresiones 3D. El proyecto está construido con:

- **Backend:** Django 5.2 + Django REST Framework + JWT (SimpleJWT)
- **Frontend:** React 19 + Vite 8 + Axios
- **Microservicio:** Three.js (editor 3D de camisetas)
- **Base de datos:** SQLite (desarrollo) / PostgreSQL (producción)
- **Almacenamiento:** Cloudinary (imágenes y modelos 3D)

### Hallazgos Principales

| Categoría | Estado |
|-----------|--------|
| Modelo `Cambio_Email` | **DEFINIDO pero NO USADO** - código muerto |
| Seguridad general | **CRÍTICA** - múltiples vulnerabilidades |
| API de órdenes | **SIN PROTECCIÓN** - AllowAny en CRUD completo |
| Tests | **MÍNIMOS** - solo 5 pruebas en products |
| Documentación | **COMPLETA** (~48 archivos) |
| Docker | **FUNCIONAL** pero con configs de desarrollo |

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Capas

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐  │
│  │ Landing  │  │  Catalog  │  │   Admin   │  │  3D    │  │
│  │  Page    │  │  Page     │  │  Dashboard│  │ Editor │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘  │
│       │              │              │             │       │
│       └──────────────┴──────────────┴─────────────┘       │
│                          │                                │
│                    Axios Interceptors                     │
│               (JWT + Session + Error Handling)            │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP/HTTPS
┌──────────────────────────┴──────────────────────────────┐
│                    BACKEND (Django)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Django REST Framework                │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │   │
│  │  │   JWT    │ │ Session  │ │    Permissions    │  │   │
│  │  │   Auth   │ │   Auth   │ │  (AllowAny/Admin) │  │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │                   API Layer                       │   │
│  │  ┌───────┐ ┌────────┐ ┌───────┐ ┌──────────┐    │   │
│  │  │ Users │ │Products│ │Orders │ │ Catalog  │    │   │
│  │  └───┬───┘ └───┬────┘ └───┬───┘ └────┬─────┘    │   │
│  └──────┼─────────┼──────────┼──────────┼───────────┘   │
│         │         │          │          │                │
│  ┌──────┴─────────┴──────────┴──────────┴───────────┐   │
│  │               Model Layer (ORM)                   │   │
│  │  Usuario │ Product │ Order │ Cart │ Token │ etc   │   │
│  └──────────────────────┬───────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────┐
│              BASE DE DATOS                               │
│  SQLite (dev) / PostgreSQL (prod) + Cloudinary (media)  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Aplicaciones Django (9 apps)

| App | Propósito | Modelos | Endpoints |
|-----|-----------|---------|-----------|
| `users` | Gestión de usuarios, auth, admin | 5 | ~15 |
| `products` | CRUD productos, imágenes, variantes | 4 | ~12 |
| `catalog` | Catálogo público, filtros, búsqueda | 5 | ~8 |
| `orders` | Gestión de órdenes | 2 | ~6 |
| `carts` | Carrito de compras (sesión) | 2 | ~5 |
| `checkout` | Proceso de checkout | 0 | 2 |
| `landing` | Formulario de contacto | 1 | 3 |
| `models3d` | Gestión de modelos 3D + Cloudinary | 3 | ~10 |
| `monitoring` | Logging de errores del frontend | 0 | 1 |

### 2.3 Patrones de Arquitectura

- **Active Record** (Django ORM) para persistencia
- **ViewSet + Serializer** (DRF) para API
- **JWT + Session** para autenticación híbrida
- **Soft Delete** para eliminación de usuarios
- **Audit Trail** para productos y usuarios
- **Session-based Cart** para carrito anónimo/autenticado

---

## 3. Capas de Seguridad

### 3.1 Autenticación

| Mecanismo | Estado | Detalles |
|-----------|--------|----------|
| JWT Access Token | ✅ Activo | 15 minutos de vida |
| JWT Refresh Token | ✅ Activo | 7 días de vida |
| Custom JWT Auth Backend | ✅ Activo | `UsuarioJWTAuthentication` |
| Token Refresh Endpoint | ✅ Activo | Valida que usuario exista y esté activo |
| Password Hashing | ✅ Activo | `make_password` / `check_password` de Django |
| Email Verification | ✅ Activo | Token de 24h para activar cuenta |
| Account Lockout | ✅ Activo | 5 intentos fallidos → bloqueo |
| Soft Delete | ✅ Activo | Usuarios eliminados se marcan, no se borran |

### 3.2 Autorización

| Mecanismo | Estado | Detalles |
|-----------|--------|----------|
| Default Permission | ⚠️ `AllowAny` | Todos los endpoints abiertos por defecto |
| Admin Permission | ✅ Custom | `AdminPermission` verifica `rol='Administrador'` |
| JWT Protection | ✅ Parcial | Solo en endpoints que usan `IsAuthenticated` |
| Client-side Route Guard | ⚠️ Débil | Solo verifica `localStorage` (manipulable) |

### 3.3 Protección de Datos

| Mecanismo | Estado | Detalles |
|-----------|--------|----------|
| CORS | ⚠️ Configurado | IPs LAN incluidas con `credentials=True` |
| CSRF | ✅ Activo | `CsrfViewMiddleware` habilitado |
| Rate Limiting | ✅ Activo | 1000/h anon, 10000/h auth, 3/h contacto |
| Password Policy | ✅ Activa | 8+ chars, mayúscula, número, especial |
| SameSite Cookies | ✅ Configurado | Lax (dev), None+Secure (prod) |
| HTTPS Enforcement | ⚠️ Parcial | Solo en producción (`DEBUG=False`) |

### 3.4 Logging y Auditoría

| Mecanismo | Estado | Detalles |
|-----------|--------|----------|
| Audit Log (usuarios) | ✅ Activo | `Log_Auditoria` con JSON diffs + IP |
| Product Audit | ✅ Activo | `ProductAudit` trail |
| User State History | ✅ Activo | `Historial_Estado_Usuario` |
| Error Monitoring | ✅ Activo | Endpoint `/api/logging/client/` |
| App Logging | ✅ Activo | Rotating file handlers (app, errors, requests) |

### 3.5 Vulnerabilidades Críticas Identificadas

#### CRIT-001: Archivos `.env` comprometidos en el repositorio

**Ubicación:** `backend/.env`, `backend/config/.env`, `microservices/Tshirt3D/.env`

```env
# backend/.env contiene:
SECRET_KEY=django-insecure-projecto-formativo-dev-key-local
EMAIL_HOST_PASSWORD=tu_password

# microservices/Tshirt3D/.env contiene:
VITE_CLOUDINARY_CLOUD_NAME=doa7qxr0d
VITE_CLOUDINARY_UPLOAD_PRESET=prueba
```

**Riesgo:** Cualquier persona con acceso al repositorio tiene las credenciales. El `SECRET_KEY` inseguro permite forjar tokens JWT.

**Impacto:** CRÍTICO - Compromiso total de autenticación.

#### CRIT-002: API de Órdenes sin protección

**Archivo:** `backend/apps/orders/api/viewsets.py:12`

```python
permission_classes = [AllowAny]  # CRUD completo abierto
```

**Riesgo:** Cualquier usuario puede crear, modificar y eliminar órdenes arbitrariamente.

**Impacto:** CRÍTICO - Manipulación total del sistema de órdenes.

#### CRIT-003: Endpoint de creación de modelos 3D sin autenticación

**Archivo:** `backend/apps/models3d/api/viewsets.py`

El endpoint `create` retorna permisos vacíos, permitiendo a cualquiera subir modelos 3D.

**Impacto:** ALTO - Almacenamiento no autorizado de archivos.

#### CRIT-004: SECRET_KEY con fallback inseguro

**Archivo:** `backend/config/settings.py:20`

```python
SECRET_KEY = env('SECRET_KEY', default='django-insecure-projecto-formativo-dev-key')
```

**Riesgo:** Si la variable de entorno no está definida, la app usa una clave conocida y públicamente visible.

**Impacto:** CRÍTICO - Tokens JWT forjables.

#### CRIT-005: Invalidación de tokens no implementada

**Archivo:** `backend/apps/users/api/admin_viewset.py:384-388`

```python
# Aquí se implementaría la invalidación de tokens
pass  # No hace nada
```

**Riesgo:** Usuarios bloqueados/desactivados pueden seguir usando sus tokens JWT hasta que expiren naturalmente.

**Impacto:** ALTO - Usuarios comprometidos mantienen acceso.

---

## 4. Análisis del Modelo Cambio_Email

### 4.1 Definición del Modelo

**Archivo:** `backend/apps/users/models.py:98-117`

```python
class Cambio_Email(models.Model):
    """Modelo para gestionar solicitudes de cambio de email (RI-010)"""
    id = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='cambios_email')
    email_anterior = models.EmailField()
    email_nuevo = models.EmailField()
    token = models.ForeignKey(Token_Verificacion, on_delete=models.CASCADE)
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    verificado = models.BooleanField(default=False)
    fecha_verificacion = models.DateTimeField(null=True, blank=True)
```

### 4.2 Dónde se Encuentra Referenciado

| Archivo | Línea | Tipo de Uso | Estado |
|---------|-------|-------------|--------|
| `backend/apps/users/models.py` | 98-117 | **Definición** del modelo | ✅ Implementado |
| `backend/apps/users/admin.py` | 3, 23-27 | **Registro en Admin** (`CambioEmailAdmin`) | ✅ Registrado |
| `backend/apps/users/api/serializers.py` | 9 | **Import** (nunca usado) | ❌ Import muerto |
| `backend/apps/users/api/viewset.py` | 21 | **Import** (nunca usado) | ❌ Import muerto |
| `backend/apps/users/migrations/0001_initial.py` | 46, 88 | **Migración** de BD | ✅ Ejecutada |
| `docs/04-diseno-uml/diagrama-clases.md` | - | **Documentación** UML | 📄 Documentado |
| `docs/04-diseno-uml/modelo-entidad-relacion.md` | - | **Diagrama ER** | 📄 Documentado |
| `docs/06-base-de-datos/diccionario-de-datos.md` | - | **Diccionario** de datos | 📄 Documentado |

### 4.3 Verificación de Uso en el Frontend

| Búsqueda | Resultado |
|----------|-----------|
| `grep -r "cambio_email" frontend/` | **0 resultados** |
| `grep -r "changeEmail" frontend/` | **0 resultados** |
| `grep -r "email.*change" frontend/` | **0 resultados** |
| `grep -r "Cambio_Email" frontend/` | **0 resultados** |

### 4.4 Verificación de Uso en Microservicios

| Búsqueda | Resultado |
|----------|-----------|
| `grep -r "cambio_email" microservices/` | **0 resultados** |
| `grep -r "email.*change" microservices/` | **0 resultados** |

### 4.5 Conclusión sobre Cambio_Email

> **EL MODELO `Cambio_Email` ES CÓDIGO MUERTO.**
>
> - Está **definido** en el modelo de datos
> - Está **registrado** en el panel de administración de Django
> - Está **migrado** a la base de datos
> - Pero **NO tiene**:
>   - Ningún serializer que lo use
>   - Ningún viewset/endpoint que lo implemente
>   - Ninguna lógica de negocio que lo consuma
>   - Ningún componente en el frontend que lo invoque
>
> **La tabla `cambios_email` existe en la BD pero está vacía y nunca será poblada.**
>
> El requisito funcional **RI-010** (cambio de email) está documentado pero no implementado en la capa de API. El frontend permite editar el correo en el perfil (`UserProfile.jsx`) pero lo hace directamente via `PATCH usuarios/actualizar_perfil/` sin usar el modelo `Cambio_Email` ni disparar un flujo de verificación del nuevo email.

### 4.6 Flujo Propuesto (No Implementado)

El diseño sugiere que el flujo correcto sería:

```
1. Usuario solicita cambio de email
2. Se crea registro en Cambio_Email (email_anterior, email_nuevo)
3. Se genera Token_Verificacion tipo='Cambio_Email'
4. Se envía email con token al email_nuevo
5. Usuario hace clic en enlace de verificación
6. Se marca Cambio_Email.verificado = True
7. Se actualiza Usuario.correo = email_nuevo
```

Este flujo **NO existe** actualmente.

---

## 5. Backend - Análisis Detallado

### 5.1 Estructura de Directorios

```
backend/
├── config/                    # Configuración Django
│   ├── settings.py           # Configuración principal
│   ├── urls.py               # URLs raíz
│   ├── wsgi.py / asgi.py     # Entry points
│   └── .env                  # ⚠️ Archivo duplicado
├── apps/                     # 9 aplicaciones Django
│   ├── users/                # 5 modelos, ~15 endpoints
│   ├── products/             # 4 modelos, ~12 endpoints
│   ├── catalog/              # 5 modelos, ~8 endpoints
│   ├── orders/               # 2 modelos, ~6 endpoints
│   ├── carts/                # 2 modelos, ~5 endpoints
│   ├── checkout/             # 0 modelos, 2 endpoints
│   ├── landing/              # 1 modelo, 3 endpoints
│   ├── models3d/             # 3 modelos, ~10 endpoints
│   └── monitoring/           # 0 modelos, 1 endpoint
├── .env                      # ⚠️ Credenciales en repo
├── db.sqlite3                # ⚠️ BD en repo
├── media/                    # ⚠️ Archivos media en repo
└── logs/                     # Directorio de logs
```

### 5.2 Modelos por App

**Users (5 modelos):**
- `Usuario` - Modelo custom (NO extiende AbstractUser)
- `Token_Verificacion` - Tokens para email, password, cambio email
- `Cambio_Email` - Solicitudes de cambio de email (NO USADO)
- `Historial_Estado_Usuario` - Auditoría de cambios de estado
- `Log_Auditoria` - Logs de acciones administrativas

**Products (4 modelos):**
- `Product` - Producto principal
- `ProductImage` - Imágenes por producto (Cloudinary)
- `Variant` - Variantes (talla/color/stock)
- `ProductAudit` - Auditoría de cambios

**Catalog (5 modelos):**
- `Category` - Categorías de productos
- `ProductCategory` - Tabla intermedia M2M
- `SearchHistory` - Historial de búsquedas
- `CatalogFilter` - Filtros configurables
- `PopularSearch` - Búsquedas populares

**Orders (2 modelos):**
- `Order` - Orden principal
- `OrderItem` - Líneas de orden

**Carts (2 modelos):**
- `Cart` - Carrito (sesión/usuario)
- `CartItem` - Items del carrito

**Landing (1 modelo):**
- `Contacto` - Mensajes de contacto

**Models3D (3 modelos):**
- `Model3D` - Modelos 3D
- `CloudinaryResource` - Gestión Cloudinary (managed=False)
- `Model3DImage` - Imágenes de preview

**Checkout (0 modelos):** Lógica en views.py

**Monitoring (0 modelos):** Lógica en views.py

### 5.3 Endpoints API (Resumen)

| Categoría | Endpoints | Autenticación |
|-----------|-----------|---------------|
| Auth (registro, verificación, recuperación) | 6 | AllowAny |
| JWT (login, logout, refresh) | 3 | Mixto |
| Perfil de usuario | 3 | IsAuthenticated |
| Admin usuarios | 8 | Admin |
| Admin stats | 1 | Admin |
| Products CRUD | 12 | Mixto |
| Catalog público | 8 | AllowAny |
| Cart | 5 | AllowAny (sesión) |
| Orders CRUD | 6 | **⚠️ AllowAny** |
| Admin orders | 2 | Admin |
| Checkout | 2 | AllowAny (sesión) |
| Contacto | 3 | Mixto |
| Models3D | 10 | **⚠️ Mixto/inseguro** |
| Monitoring | 1 | AllowAny (throttled) |
| **TOTAL** | **~70** | |

### 5.4 Configuración de Seguridad en settings.py

```python
# JWT: Access=15min, Refresh=7d, NO blacklist
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': False,        # ⚠️ No rota
    'BLACKLIST_AFTER_ROTATION': False,     # ⚠️ No blanquea
}

# CORS: IPs LAN incluidas
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://192.168.1.93:5173',    # ⚠️ LAN IP
    'http://192.168.137.7:5173',   # ⚠️ LAN IP
]
CORS_ALLOW_CREDENTIALS = True  # ⚠️ Con credenciales

# Default: AllowAny (⚠️ endpoints abiertos por defecto)
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}
```

---

## 6. Frontend - Análisis Detallado

### 6.1 Estructura de Componentes

```
frontend/src/
├── pages/                    # 25 páginas
│   ├── Landing.jsx          # Página principal
│   ├── AuthPage.jsx         # Login/Register
│   ├── Catalog.jsx          # Catálogo público
│   ├── ProductDetail.jsx    # Detalle producto
│   ├── Product3D.jsx        # Visor 3D (stub)
│   ├── Cart.jsx             # Carrito
│   ├── CheckoutPage.jsx     # Checkout
│   ├── UserProfile.jsx      # Perfil usuario
│   ├── Email.jsx            # Verificación email
│   ├── Password.jsx         # Recuperación password
│   ├── AdminDashboard.jsx   # Dashboard admin
│   ├── AdminProducts.jsx    # Admin productos
│   ├── AdminUsers.jsx       # Admin usuarios
│   ├── AdminOrders.jsx      # Admin órdenes
│   └── ...                  # Más páginas admin
├── components/               # 17 componentes
│   ├── Header.jsx           # Navegación global
│   ├── AdminLayout.jsx      # Layout admin
│   ├── ProtectedRoute.jsx   # Guard de rutas
│   ├── ErrorBoundary.jsx    # Error boundary
│   ├── ProductCard.jsx      # Tarjeta producto
│   └── ...                  # Más componentes
├── contexts/                 # 2 contextos
│   ├── CartContext.jsx      # Estado del carrito
│   └── ThemeContext.jsx     # Tema claro/oscuro
├── utils/                    # 3 utilidades
│   ├── format.js            # Formato COP
│   ├── logger.js            # Logger de errores
│   └── errorCatalog.js      # Catálogo de errores
└── api.js                   # 3 instancias Axios
```

### 6.2 Instancias de API

| Instancia | Propósito | withCredentials |
|-----------|-----------|-----------------|
| `api` | Autenticada (JWT) | ✅ true |
| `publicApi` | Pública (catálogo) | ❌ false |
| `sessionApi` | Sesión (carrito/checkout) | ✅ true |

### 6.3 Problemas del Frontend

| # | Problema | Archivo | Línea |
|---|----------|---------|-------|
| 1 | `.env` con texto basura `jh` | `frontend/.env` | 3 |
| 2 | URL hardcoded `127.0.0.1:5174` | `Product3D.jsx` | 56 |
| 3 | URL hardcoded `127.0.0.1:5174` | `AdminLayout.jsx` | 139 |
| 4 | `console.log` en producción | `AdminContact.jsx` | 57 |
| 5 | `window.location.href` en vez de React Router | `Category.jsx` | 119 |
| 6 | `useEffect` importado pero no usado | `Password.jsx` | 2 |
| 7 | Checkout no envía dirección | `CheckoutPage.jsx` | - |
| 8 | Sin ruta 404/catch-all | `App.jsx` | - |
| 9 | `fetch()` en vez de Axios configurado | `AuthPage.jsx`, `Landing.jsx`, etc. | - |
| 10 | Duplicación de CSS admin | `admin.css` (2 ubicaciones) | - |

---

## 7. Microservicios - Análisis Detallado

### 7.1 Tshirt3D (Editor 3D)

**Propósito:** Editor interactivo de camisetas 3D con Three.js

**Stack:**
- React 18.2 + Three.js 0.155
- Valtio (state management)
- Framer Motion (animaciones)
- TailwindCSS
- React Color (picker de colores)

**Funcionalidades:**
1. Renderizado 3D de camiseta (GLB pre-horneado)
2. Sistema de decals (logo + textura completa)
3. Drag-to-mover logo en superficie
4. Escalado de logo
5. Color picker para camiseta
6. Upload de archivos de imagen
7. Captura de canvas → Cloudinary
8. Guardado en backend (Models3D API)
9. Vista previa de orden

**Problemas:**
- `.env` con credenciales Cloudinary reales
- Dockerfile ejecuta `npm run dev` (no producción)
- URL hardcoded `http://127.0.0.1:5173/admin`
- `Preview.jsx` nunca se invoca desde `Customizer.jsx`
- Código muerto en `Backdrop.jsx` (líneas comentadas)
- Sin tests

---

## 8. Docker y Despliegue

### 8.1 Servicios Docker Compose

| Servicio | Container | Puerto | Build |
|----------|-----------|--------|-------|
| `backend` | `proyecto_backend` | 8000 | `./backend` |
| `frontend` | `proyecto_frontend` | 5173 | `./frontend` |
| `tshirt3d` | `proyecto_tshirt3d` | 5174 | `./microservices/Tshirt3D` |

### 8.2 Volúmenes

```yaml
volumes:
  backend_media:    # Imágenes y archivos media
  backend_static:   # Archivos estáticos Django
```

### 8.3 Problemas de Docker

1. **Todos los Dockerfiles usan servidores de desarrollo** (`npm run dev`, `gunicorn --reload`)
2. **Directorio `docker/` vacío** - se esperaban configs de nginx, etc.
3. **Vite host mismatch** - `vite.config.js` dice `127.0.0.1` pero Dockerfile usa `--host 0.0.0.0`
4. **Sin healthchecks** en docker-compose
5. **Sin configuración de red** explícita

---

## 9. Problemas Identificados

### 9.1 Problemas Críticos (requieren atención inmediata)

| # | Problema | Ubicación | Impacto |
|---|----------|-----------|---------|
| C1 | `.env` con credenciales en repo git | `backend/.env`, `microservices/Tshirt3D/.env` | Compromiso total |
| C2 | API de órdenes sin autenticación | `orders/api/viewsets.py:12` | Manipulación de órdenes |
| C3 | SECRET_KEY con fallback inseguro | `settings.py:20` | Tokens JWT forjables |
| C4 | Modelos 3D creación sin auth | `models3d/api/viewsets.py` | Almacenamiento no autorizado |
| C5 | Invalidación de tokens no implementada | `admin_viewset.py:384-388` | Acceso no revocado |
| C6 | `db.sqlite3` en repo | `backend/db.sqlite3` | Datos de usuario expuestos |

### 9.2 Problemas Altos

| # | Problema | Ubicación | Impacto |
|---|----------|-----------|---------|
| A1 | CORS permite LAN IPs con credenciales | `settings.py:246-257` | Acceso no autorizado en red |
| A2 | Stock no se decrementa en OrderViewSet.create | `orders/api/viewsets.py` | Stock negativo |
| A3 | Race condition en checkout | `checkout/views.py` | Sobreventa |
| A4 | ProtectedRoute solo verifica localStorage | `ProtectedRoute.jsx` | Acceso admin manipulable |
| A5 | Checkout no envía dirección postal | `CheckoutPage.jsx` | Datos incompletos |
| A6 | `Cambio_Email` never used in API | `serializers.py`, `viewset.py` | Feature incompleta |
| A7 | Usuario custom no extiende AbstractUser | `users/models.py:8` | Incompatibilidad Django |

### 9.3 Problemas Medios

| # | Problema | Ubicación |
|---|----------|-----------|
| M1 | Archivo `.env` duplicado en `config/` | `backend/config/.env` |
| M2 | Config CORS duplicada (`CORS_ORIGIN_WHITELIST` obsoleto) | `settings.py:309-319` |
| M3 | `frontend/.env` con texto basura `jh` | `frontend/.env:3` |
| M4 | URLs hardcoded `127.0.0.1:5174` | `Product3D.jsx:56`, `AdminLayout.jsx:139` |
| M5 | `console.log` en producción | `AdminContact.jsx:57` |
| M6 | `useEffect` importado no usado | `Password.jsx:2` |
| M7 | `window.location.href` en vez de React Router | `Category.jsx:119` |
| M8 | Sin ruta 404/catch-all | `App.jsx` |
| M9 | `fetch()` inconsistente en vez de Axios | Múltiples archivos |
| M10 | CSS admin duplicado | 2 archivos `admin.css` |
| M11 | Email hardcoded `noreply@sistema.com` como admin | `landing/api/viewset.py:114` |

### 9.4 Problemas Bajos

| # | Problema |
|---|----------|
| B1 | Nomenclatura inconsistente de modelos (underscore vs PascalCase) |
| B2 | Nomenclatura inconsistente de archivos (`viewset.py` vs `viewsets.py`) |
| B3 | `views.py` vacíos en todas las apps (nunca limpiados) |
| B4 | `monitoring` sin `apps.py` ni `migrations/` |
| B5 | `allowScripts` no estándar en `package.json` de Tshirt3D |
| B6 | `Preview.jsx` nunca invocado en Tshirt3D |
| B7 | Código comentado muerto en `Backdrop.jsx` |
| B8 | `LANGUAGE_CODE = 'en-us'` en vez de español |

---

## 10. Cosas que Sobran / Código Muerto

### 10.1 Código Muerto en Backend

| Archivo | Elemento Muerto | Razón |
|---------|-----------------|-------|
| `apps/users/api/serializers.py:9` | `from ..models import ... Cambio_Email` | Import nunca usado |
| `apps/users/api/viewset.py:21` | `from ..models import ... Cambio_Email` | Import nunca usado |
| `apps/users/views.py` | Archivo vacío | Nunca se usa |
| `apps/products/views.py` | Archivo vacío | Nunca se usa |
| `apps/landing/views.py` | Archivo vacío | Nunca se usa |
| `apps/carts/views.py` | Archivo vacío | Nunca se usa |
| `apps/catalog/views.py` | Archivo vacío | Nunca se usa |
| `apps/orders/views.py` | Archivo vacío | Nunca se usa |
| `apps/models3d/views.py` | Archivo vacío | Nunca se usa |
| `config/.env` | Archivo duplicado | Settings.py lee el de la raíz |
| `backend/.env` | Credenciales hardcoded | Debería usar variables de entorno del sistema |

### 10.2 Código Muerto en Frontend

| Archivo | Elemento Muerto | Razón |
|---------|-----------------|-------|
| `pages/Product3D.jsx` | Stub que redirige a `127.0.0.1:5174` | No implementado |
| `pages/AdminContact.jsx:57` | `console.log(...)` | Debug remanente |

### 10.3 Código Muerto en Microservicios

| Archivo | Elemento Muerto | Razón |
|---------|-----------------|-------|
| `Tshirt3D/src/canvas/Backdrop.jsx` | Bloque de código comentado (líneas 9-30, 62-65) | Animación no implementada |
| `Tshirt3D/src/pages/Preview.jsx` | Página completa nunca invocada | Flujo de orden no conectado |

### 10.4 Configuración Redundante

| Configuración | Ubicación | Problema |
|---------------|-----------|----------|
| `CORS_ORIGIN_WHITELIST` | `settings.py:309-319` | Obsoleto, no lo usa `corsheaders` moderno |
| `CKEDITOR_CONFIGS` | `settings.py:60-71` | Configurado pero CKEditor no está en `INSTALLED_APPS` |
| `CKEDITOR_UPLOAD_PATH` | `settings.py:73` | Configurado pero CKEditor no instalado |
| `DATABASE_URL` override | `settings.py:336-340` | Solo funciona si `DEBUG=False` y var definida |
| `db.sqlite3` | `backend/` | Archivo de BD不应该 estar en repo |

---

## 11. Cosas que Faltan

### 11.1 Funcionalidades No Implementadas

| # | Funcionalidad | Requisito | Estado |
|---|---------------|-----------|--------|
| F1 | Cambio de email con verificación | RI-010 | Modelo existe, API no |
| F2 | Invalidación de tokens JWT | - | Comentado, no implementado |
| F3 | Decremento de stock en OrderViewSet | - | Solo funciona en checkout |
| F4 | Protección race condition checkout | - | Sin `select_for_update` |
| F5 | Ruta 404 en frontend | - | Sin catch-all |
| F6 |Dirección postal en checkout | - | Campos recolectados, no enviados |
| F7 | Paginación en frontend | - | Backend la soporta, frontend no la usa |

### 11.2 Infraestructura Faltante

| # | Componente | Estado |
|---|------------|--------|
| I1 | Nginx reverse proxy | Directorio `docker/` vacío |
| I2 | Healthchecks en Docker | No configurados |
| I3 | HTTPS/SSL | Solo en settings, no en Docker |
| I4 | Redis (sessions/cache) | No configurado |
| I5 | Celery (tareas asíncronas) | No configurado |
| I6 | CI/CD pipeline | No configurado |

### 11.3 Testing Faltante

| App | Tests Existentes | Tests Necesarios |
|-----|------------------|------------------|
| users | 0 | ~15 (registro, login, JWT, admin) |
| products | 5 | ~10 (CRUD, imágenes, variantes, permisos) |
| orders | 0 | ~8 (CRUD, stock, permisos) |
| carts | 0 | ~6 (add, remove, merge, sesión) |
| checkout | 0 | ~5 (summary, confirm, stock, transacción) |
| catalog | 0 | ~5 (filtros, búsqueda, paginación) |
| landing | 0 | ~3 (contacto, throttle, admin) |
| models3d | 0 | ~5 (CRUD, Cloudinary, permisos) |

---

## 12. Recomendaciones de Mejora

### 12.1 Prioridad CRÍTICA (inmediata)

1. **Eliminar `.env` del repositorio** y agregar a `.gitignore`
2. **Eliminar `db.sqlite3` del repositorio**
3. **Eliminar `media/` del repositorio**
4. **Proteger API de órdenes** con permisos adecuados
5. **Proteger creación de modelos 3D** con autenticación
6. **Implementar invalidación de tokens** (blacklist o rotación)
7. **Generar SECRET_KEY seguro** para producción

### 12.2 Prioridad ALTA (próxima semana)

8. **Implementar endpoint de cambio de email** usando `Cambio_Email`
9. **Agregar `select_for_update`** en checkout para prevenir race conditions
10. **Decrementar stock** en `OrderViewSet.create`
11. **Hacer `ProtectedRoute`** verificación server-side
12. **Enviar dirección postal** en checkout
13. **Agregar ruta 404** en frontend

### 12.3 Prioridad MEDIA (próximo sprint)

14. **Estandarizar nomenclatura** de modelos (PascalCase sin underscores)
15. **Limpiar `views.py` vacíos**
16. **Eliminar imports muertos** de `Cambio_Email`
17. **Reemplazar `fetch()`** por instancias Axios configuradas
18. **Eliminar `console.log`** de producción
19. **Corregir URLs hardcoded** con variables de entorno
20. **Eliminar `CORS_ORIGIN_WHITELIST`** obsoleto
21. **Eliminar configuración CKEDITOR** no utilizada

### 12.4 Prioridad BAJA (cuando haya tiempo)

22. **Configurar CI/CD** (GitHub Actions)
23. **Agregar healthchecks** en Docker
24. **Configurar Nginx** como reverse proxy
25. **Agregar tests unitarios** (mínimo 80% cobertura)
26. **Configurar Redis** para sesiones y cache
27. **Implementar Celery** para tareas asíncronas (emails)
28. **Cambiar `LANGUAGE_CODE`** a `'es'`

---

## 13. Pruebas Unitarias

### 13.1 Estado Actual de Tests

Solo existe un archivo con tests reales: `backend/apps/products/tests.py` con 5 pruebas básicas:

```python
# products/tests.py - 5 tests existentes
class ProductModelTests(TestCase):
    test_product_requires_valid_minimum_fields
    test_product_rejects_invalid_price
    test_variant_limits_and_uniqueness
    test_image_requires_main_safe_format_and_resolution
```

Los demás archivos `tests.py` están vacíos (solo el import base de Django).

### 13.2 Pruebas Implementadas y Resultados

Se implementaron **69 pruebas** en 5 apps. Todos los tests pasan exitosamente.

#### Resultado: Users App (39 tests - TODOS PASAN)

```
test_creacion_cambio_email (apps.users.tests.CambioEmailModelTests) ... ok
test_str_cambio_email (apps.users.tests.CambioEmailModelTests) ... ok
test_verificacion_cambio_email (apps.users.tests.CambioEmailModelTests) ... ok

test_login_bloqueo_tras_5_intentos (apps.users.tests.LoginEndpointTests) ... ok
test_login_email_inexistente (apps.users.tests.LoginEndpointTests) ... ok
test_login_exitoso (apps.users.tests.LoginEndpointTests) ... ok
test_login_password_incorrecta (apps.users.tests.LoginEndpointTests) ... ok
test_login_usuario_bloqueado (apps.users.tests.LoginEndpointTests) ... ok
test_login_usuario_inactivo (apps.users.tests.LoginEndpointTests) ... ok

test_nueva_password_contrasena_debil (apps.users.tests.PasswordTests) ... ok
test_nueva_password_exitoso (apps.users.tests.PasswordTests) ... ok
test_nueva_password_no_coinciden (apps.users.tests.PasswordTests) ... ok
test_recuperar_password_crea_token (apps.users.tests.PasswordTests) ... ok

test_actualizar_perfil (apps.users.tests.PerfilTests) ... ok
test_cambiar_password (apps.users.tests.PerfilTests) ... ok
test_cambiar_password_actual_incorrecta (apps.users.tests.PerfilTests) ... ok
test_obtener_perfil (apps.users.tests.PerfilTests) ... ok
test_perfil_requiere_autenticacion (apps.users.tests.PerfilTests) ... ok

test_registro_contrasena_debil (apps.users.tests.RegistroEndpointTests) ... ok
test_registro_contrasenas_no_coinciden (apps.users.tests.RegistroEndpointTests) ... ok
test_registro_crea_usuario_inactivo (apps.users.tests.RegistroEndpointTests) ... ok
test_registro_exitoso (apps.users.tests.RegistroEndpointTests) ... ok
test_registro_genera_token_verificacion (apps.users.tests.RegistroEndpointTests) ... ok
test_registro_usuario_duplicado (apps.users.tests.RegistroEndpointTests) ... ok

test_creacion_token_verificacion (apps.users.tests.TokenVerificacionTests) ... ok
test_str_token (apps.users.tests.TokenVerificacionTests) ... ok
test_token_tipos_validos (apps.users.tests.TokenVerificacionTests) ... ok

test_creacion_usuario (apps.users.tests.UsuarioModelTests) ... ok
test_estado_default_inactivo (apps.users.tests.UsuarioModelTests) ... ok
test_intentos_fallidos_default (apps.users.tests.UsuarioModelTests) ... ok
test_is_anonymous_property (apps.users.tests.UsuarioModelTests) ... ok
test_is_authenticated_property (apps.users.tests.UsuarioModelTests) ... ok
test_rol_default_usuario (apps.users.tests.UsuarioModelTests) ... ok
test_soft_delete (apps.users.tests.UsuarioModelTests) ... ok
test_str_usuario (apps.users.tests.UsuarioModelTests) ... ok

test_verificar_email_exitoso (apps.users.tests.VerificacionEmailTests) ... ok
test_verificar_email_token_expirado (apps.users.tests.VerificacionEmailTests) ... ok
test_verificar_email_token_invalido (apps.users.tests.VerificacionEmailTests) ... ok
test_verificar_email_token_usado (apps.users.tests.VerificacionEmailTests) ... ok

Ran 39 tests in 20.355s
OK
```

**Detalle de cobertura Users App:**

| Clase de Test | Tests | Cubre |
|---------------|-------|-------|
| `UsuarioModelTests` | 8 | Creación, soft delete, properties, defaults |
| `TokenVerificacionTests` | 3 | Creación, tipos válidos, string representation |
| `CambioEmailModelTests` | 3 | Creación, verificación, string representation |
| `RegistroEndpointTests` | 6 | Registro exitoso, validaciones, duplicados |
| `LoginEndpointTests` | 6 | Login JWT, bloqueo tras intentos, estados |
| `VerificacionEmailTests` | 4 | Token válido, expirado, usado, inválido |
| `PasswordTests` | 4 | Recuperación, nueva password, validaciones |
| `PerfilTests` | 5 | Obtener/actualizar perfil, cambio password |

#### Resultado: Orders App (8 tests - TODOS PASAN)

```
test_detalle_orden_admin (apps.orders.tests.OrderAdminTests) ... ok
test_listar_ordenes_admin (apps.orders.tests.OrderAdminTests) ... ok
test_creacion_orden (apps.orders.tests.OrderModelTests) ... ok
test_estados_validos (apps.orders.tests.OrderModelTests) ... ok
test_crear_orden_campos_requeridos (apps.orders.tests.OrderViewSetTests) ... ok
test_crear_orden_sin_autenticacion (apps.orders.tests.OrderViewSetTests) ... ok
test_detalle_orden (apps.orders.tests.OrderViewSetTests) ... ok
test_eliminar_orden (apps.orders.tests.OrderViewSetTests) ... ok
test_listar_ordenes (apps.orders.tests.OrderViewSetTests) ... ok

Ran 8 tests in 7.375s
OK
```

#### Resultado: Carts App (9 tests - TODOS PASAN)

```
test_constraint_unique_cart_product_variant (apps.carts.tests.CartItemModelTests) ... ok
test_creacion_item (apps.carts.tests.CartItemModelTests) ... ok
test_subtotal (apps.carts.tests.CartItemModelTests) ... ok
test_creacion_carrito_sesion (apps.carts.tests.CartModelTests) ... ok
test_creacion_carrito_usuario (apps.carts.tests.CartModelTests) ... ok
test_total_amount (apps.carts.tests.CartModelTests) ... ok
test_total_items_con_items (apps.carts.tests.CartModelTests) ... ok
test_total_items_vacio (apps.carts.tests.CartModelTests) ... ok
test_agregar_item_al_carrito (apps.carts.tests.CartViewSetTests) ... ok
test_agregar_item_sin_stock (apps.carts.tests.CartViewSetTests) ... ok
test_obtener_carrito_vacio (apps.carts.tests.CartViewSetTests) ... ok

Ran 9 tests in 7.375s
OK
```

#### Resultado: Checkout App (6 tests - TODOS PASAN)

```
test_checkout_confirm_crea_orden (apps.checkout.tests.CheckoutTests) ... ok
test_checkout_confirm_descuenta_stock (apps.checkout.tests.CheckoutTests) ... ok
test_checkout_confirm_sin_stock_suficiente (apps.checkout.tests.CheckoutTests) ... ok
test_checkout_summary_con_items (apps.checkout.tests.CheckoutTests) ... ok
test_checkout_summary_vacio (apps.checkout.tests.CheckoutTests) ... ok
test_checkout_vacio_rechazado (apps.checkout.tests.CheckoutTests) ... ok

Ran 6 tests in 7.375s
OK
```

#### Resultado: Products App (5 tests - TODOS PASAN)

```
test_image_requires_main_safe_format_and_resolution (apps.products.tests.ProductModelTests) ... ok
test_product_rejects_invalid_price (apps.products.tests.ProductModelTests) ... ok
test_product_requires_valid_minimum_fields (apps.products.tests.ProductModelTests) ... ok
test_variant_limits_and_uniqueness (apps.products.tests.ProductModelTests) ... ok

Ran 5 tests in 7.375s
OK
```

#### Resumen Total de Pruebas

| App | Tests | Estado | Archivo |
|-----|-------|--------|---------|
| `users` | 39 | ✅ TODOS PASAN | `apps/users/tests.py` |
| `orders` | 8 | ✅ TODOS PASAN | `apps/orders/tests.py` |
| `carts` | 9 | ✅ TODOS PASAN | `apps/carts/tests.py` |
| `checkout` | 6 | ✅ TODOS PASAN | `apps/checkout/tests.py` |
| `products` | 5 | ✅ TODOS PASAN | `apps/products/tests.py` |
| `landing` | 0 | ⏳ Pendiente | `apps/landing/tests.py` |
| `catalog` | 0 | ⏳ Pendiente | `apps/catalog/tests.py` |
| `models3d` | 0 | ⏳ Pendiente | `apps/models3d/tests.py` |
| **TOTAL** | **67** | **✅ 100% PASS** | |

### 13.3 Pruebas Sugeridas por Implementar (Pendientes)

#### Landing App

```python
class ContactoTests(TestCase):
    test_enviar_contacto_exitoso
    test_enviar_contacto_throttle_3_por_hora
    test_marcar_como_leido
    test_eliminar_contacto
```

#### Catalog App

```python
class CatalogTests(TestCase):
    test_listar_catalogo_con_filtros
    test_busqueda_por_texto
    test_filtrar_por_precio
    test_filtrar_por_talla_color
    test_paginacion_resultados
```

#### Models3D App

```python
class Model3DTests(TestCase):
    test_listar_modelos
    test_crear_modelo_requiere_auth
    test_modelos_aprobados_publicos
    test_gestion_cloudinary_recursos
```

---

## Resumen Final

### Score del Proyecto

| Categoría | Puntuación | Notas |
|-----------|------------|-------|
| Arquitectura | 7/10 | Buena estructura de apps, patrones claros |
| Seguridad | 3/10 | Vulnerabilidades críticas sin resolver |
| API Design | 6/10 | Endpoints bien organizados, permisos débiles |
| Frontend | 6/10 | Buena UX, problemas de configuración |
| Testing | 5/10 | 67 tests implementados, 3 apps pendientes |
| Documentación | 8/10 | Extensa y bien organizada |
| Docker | 5/10 | Funcional pero solo para desarrollo |
| Código Muerto | 4/10 | Muchos imports/archivos no utilizados |

### Conclusión

El proyecto tiene una **buena arquitectura base** con una estructura clara de aplicaciones Django y un frontend funcional. Sin embargo, tiene **vulnerabilidades de seguridad críticas** que deben resolverse antes de cualquier despliegue en producción. El modelo `Cambio_Email` es un ejemplo claro de **deuda técnica**: está diseñado y documentado pero nunca implementado en la capa de API.

Las prioridades inmediatas deben ser:
1. Seguridad (proteger endpoints, eliminar credenciales del repo)
2. Completar funcionalidades pendientes (cambio de email, invalidación de tokens)
3. Testing restante (landing, catalog, models3d)
4. Limpieza de código muerto
