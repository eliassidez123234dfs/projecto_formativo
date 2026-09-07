# Arquitectura de Red Estampación

Documentación técnica completa del sistema: APIs, patrones de diseño,
requerimientos funcionales, módulos, y elementos complejos del código.

---

## 1. APIs — Interfaz de Programación de Aplicaciones

### ¿Qué son?
Las APIs (Application Programming Interfaces) son los contratos de comunicación
entre el frontend (React) y el backend (Django). Definen qué datos se pueden
leer, crear, actualizar o eliminar, y bajo qué reglas.

### ¿Cómo funcionan?
Arquitectura REST (Representational State Transfer):
- Cada recurso (usuario, producto, carrito, orden) tiene una URL única
- Las operaciones se realizan con verbos HTTP estándar
- La autenticación usa JWT (JSON Web Tokens) en cookies httpOnly
- Las respuestas son JSON

### ¿Cuándo se usan?

| Momento | API | ¿Por qué? |
|---------|-----|-----------|
| Usuario se registra | `POST /api/auth/registro/` | Crear cuenta nueva |
| Usuario inicia sesión | `POST /api/login/` | Obtener JWT |
| Navega catálogo | `GET /api/catalog/products/` | Listar productos públicos |
| Agrega al carrito | `POST /api/cart/add/` | Persistir selección |
| Paga | `POST /api/checkout/create-payment/` | Iniciar transacción Wompi |
| Admin bloquea usuario | `PATCH /api/admin/usuarios/{id}/cambiar_estado/` | Moderación |

### ¿Dónde están definidas?
- **Rutas:** `backend/config/urls.py` (líneas 1-108)
- **Views/ViewSets:** cada app tiene su `api/` con viewsets
- **Serializers:** definen la estructura JSON de entrada/salida

### ¿Por qué REST y no GraphQL o SOAP?
- REST es el estándar de facto para CRUD web
- Django REST Framework (DRF) lo implementa nativamente
- GraphQL sería overkill para este dominio (pocas relaciones profundas)
- SOAP está obsoleto para aplicaciones web modernas

---

## 2. Patrones de Diseño

### 2.1 Modelo-Vista-Serializador (MVS) — Django REST Framework

**¿Qué es?** Variante de MVC adaptada a APIs REST. El Serializador reemplaza
la "Vista" tradicional de Django para controlar la representación JSON.

**¿Dónde?**
```python
# backend/apps/products/models.py — Modelo (datos y reglas de negocio)
class Product(models.Model):
    ...

# backend/apps/products/api/serializers.py — Serializador (JSON ↔ Python)
class ProductSerializer(serializers.ModelSerializer):
    ...

# backend/apps/products/api/viewset.py — Vista (lógica de endpoints)
class ProductViewSet(viewsets.ModelViewSet):
    ...
```

**¿Por qué?** Separa responsabilidades: el modelo solo sabe de BD, el serializador
solo de formato, la vista solo de HTTP. Cambiar uno no afecta a los otros.

### 2.2 ViewSet + Router

**¿Qué es?** DRF agrupa las 7 acciones CRUD (list, create, retrieve, update,
partial_update, destroy) más acciones personalizadas en una sola clase.

**¿Dónde?**
```python
# backend/config/urls.py, línea 30
router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
```

**Líneas clave:**
- `backend/apps/users/api/viewset.py:35` — `RegistroViewSet(viewsets.ViewSet)`
- `backend/apps/products/api/viewset.py:27` — `ProductViewSet(viewsets.ModelViewSet)`
- `backend/apps/carts/api/viewset.py:22` — `CartViewSet(viewsets.ViewSet)`

**¿Por qué?** Elimina código repetitivo. Un `ModelViewSet` genera automáticamente
los 7 endpoints CRUD. Solo hay que escribir las acciones personalizadas.

### 2.3 Inyección de Dependencias (Simplificada) — EmailService

**¿Qué es?** En lugar de que cada ViewSet cree su propio `send_mail`, inyectamos
un `EmailService` centralizado.

**¿Dónde?**
```python
# backend/apps/users/services/email_service.py:1-155
class EmailService:
    """Servicio único de correos. Todos los viewsets lo importan."""

# Uso en viewset.py, línea 21:
from ..services.email_service import EmailService
EmailService.send_verification_email(usuario, token_obj)
```

**Líneas de uso:**
- `backend/apps/users/api/viewset.py:138` — verificación de email
- `backend/apps/users/api/admin_viewset.py:238` — bienvenida admin
- `backend/apps/landing/api/viewset.py:87` — notificación de contacto

**¿Por qué?** Principio de Inversión de Dependencias (DIP): los módulos de alto
nivel (viewsets) no dependen de detalles de bajo nivel (`send_mail`), sino de
abstracciones (`EmailService`). Cambiar el backend de correos (console → SMTP →
SendGrid) solo requiere modificar `EmailService`.

### 2.4 Middleware — ContentSecurityPolicyMiddleware

**¿Qué es?** Un middleware es una capa que procesa cada request/response antes
de llegar al viewset. Patrón Cadena de Responsabilidad (Chain of Responsibility).

**¿Dónde?**
```python
# backend/apps/users/middleware.py:1-51
class ContentSecurityPolicyMiddleware:
    """Agrega headers de seguridad a cada respuesta HTTP."""

# Registrado en settings.py, línea 78:
MIDDLEWARE = [
    'apps.users.middleware.ContentSecurityPolicyMiddleware',
    ...
]
```

**¿Por qué?** Permite agregar headers de seguridad (CSP, HSTS, XSS Protection)
sin modificar cada viewset. Es transparente para el resto del código.

### 2.5 Repositorio MongoDB — MongoService

**¿Qué es?** Abstracción sobre la colección MongoDB. Encapsula las operaciones
CRUD de cada dominio en funciones independientes.

**¿Dónde?**
```python
# backend/apps/users/mongo_service.py:83-183 — saved_designs
# backend/apps/users/mongo_service.py:188-242 — audit_logs
# backend/apps/users/mongo_service.py:249-350 — cart_sessions
# backend/apps/users/mongo_service.py:357-425 — community_templates
```

**Líneas clave:**
- `mongo_service.py:100` — `create_design()` inserta un documento
- `mongo_service.py:190` — `log_event()` registra evento de auditoría
- `mongo_service.py:260` — `upsert_cart()` sincroniza carrito

**¿Por qué?** Aísla la lógica de MongoDB del resto del negocio. Si mañana
cambiamos a Firestore, solo se modifica este archivo.

### 2.6 Event Sourcing (Logs de Auditoría)

**¿Qué es?** En lugar de solo almacenar el estado actual, registramos cada
evento que ocurre en el sistema como un documento inmutable.

**¿Dónde?**
```python
# backend/apps/users/mongo_service.py:190
def log_event(action, actor_id=None, ...):
    """Registra evento en MongoDB (complementario a Log_Auditoria en SQL)"""

# Llamado desde:
# admin_viewset.py:658 — acciones de administración
# products/viewset.py:89 — creación de productos
# checkout/views.py:377 — eventos de pago
```

**¿Por qué?** Permite reconstruir el estado histórico, auditar quién hizo qué,
y generar estadísticas sin afectar la base de datos transaccional (PostgreSQL).

### 2.7 JWT con httpOnly Cookies + Token Versioning

**¿Qué es?** Los tokens JWT se almacenan en cookies httpOnly (no accesibles
por JavaScript) y cada usuario tiene un `token_version` que permite invalidar
todas sus sesiones.

**¿Dónde?**
```python
# backend/apps/users/api/auth_backend.py:1-90
class UsuarioJWTAuthentication(BaseAuthentication):
    """Autenticación JWT con soporte de httpOnly cookies y token_version."""

# backend/apps/users/models.py, línea 43:
token_version = IntegerField(default=0)
```

**Líneas clave:**
- `auth_backend.py:45` — Lee token de cookie si no hay header
- `auth_backend.py:65` — Verifica `token_version` del usuario
- `admin_viewset.py:180` — Incrementa `token_version` al bloquear usuario

**¿Por qué?** Seguridad en capas:
1. httpOnly cookie → XSS no puede leer el token
2. Token versioning → bloqueo inmediato de sesiones sin cambiar contraseña
3. Refresh rotation → token de refresco de un solo uso

### 2.8 Lazy Loading + Code Splitting (Frontend)

**¿Qué es?** Los componentes de página se cargan bajo demanda con
`React.lazy()` y `Suspense`, no todos al inicio.

**¿Dónde?**
```javascript
// frontend/src/App.jsx, líneas 11-37
const Dashboard = lazy(() => import('./pages/Dashboard').then(...))
const Catalog = lazy(() => import('./pages/Catalog').then(...))
```

**¿Por qué?** Reduce el bundle inicial de ~500KB a ~50KB. Las páginas menos
usadas (admin, checkout) solo se descargan cuando el usuario las visita.

---

## 3. Módulos del Backend

### 3.1 `apps/users` — Usuarios, Autenticación, Roles
**Propósito:** Gestión completa de usuarios, registro, login, roles, auditoría.

| Archivo | Responsabilidad |
|---------|----------------|
| `models.py` | `Usuario`, `Token_Verificacion`, `Log_Auditoria`, `Historial_Estado_Usuario` |
| `api/viewset.py` | Registro público, login, perfil, cambio de contraseña |
| `api/admin_viewset.py` | CRUD admin de usuarios, bloqueo, eliminación lógica |
| `api/auth_backend.py` | Autenticación JWT personalizada con token_version |
| `api/serializers.py` | 15 serializadores para cada operación de usuario |
| `services/email_service.py` | Servicio centralizado de correos |
| `mongo_service.py` | CRUD MongoDB para diseños, logs, carritos, plantillas |
| `mongodb.py` | Cliente MongoDB lazy |

### 3.2 `apps/products` — Productos, Variantes, Imágenes
**Propósito:** Catálogo de productos con variantes (talla/color) e imágenes.

| Archivo | Responsabilidad |
|---------|----------------|
| `models.py` | `Product`, `Variant`, `ProductImage`, `ProductAudit`, `Review` |
| `api/viewset.py` | CRUD de productos, publicación, aprobación, auditoría |
| `api/serializers.py` | Serializadores con validación de stock y precios |

### 3.3 `apps/carts` — Carrito de Compras
**Propósito:** Carrito efímero (PostgreSQL) + persistente (MongoDB).

| Archivo | Responsabilidad |
|---------|----------------|
| `models.py` | `Cart`, `CartItem` con total agregado |
| `api/viewset.py` | CRUD carrito, merge session→user, sync a MongoDB |

### 3.4 `apps/checkout` — Pasarela de Pago (Wompi)
**Propósito:** Integración con Wompi para procesar pagos.

| Archivo | Responsabilidad |
|---------|----------------|
| `views.py` | Resumen, iniciar pago, status, webhook |
| `wompi.py` | Cliente HTTP para API de Wompi |
| `models.py` | `TransactionLog` para registro de transacciones |

### 3.5 `apps/orders` — Órdenes de Compra
**Propósito:** Gestión del ciclo de vida de las órdenes.

| Archivo | Responsabilidad |
|---------|----------------|
| `models.py` | `Order`, `OrderItem`, `Invoice` |
| `api/viewsets.py` | CRUD de órdenes para clientes |
| `api/admin_urls.py` | Endpoints de administración de órdenes |

### 3.6 `apps/models3d` — Modelos 3D
**Propósito:** Gestión de archivos .glb y sus previsualizaciones.

| Archivo | Responsabilidad |
|---------|----------------|
| `models.py` | `Model3D`, `Model3DImage` |
| `api/viewsets.py` | CRUD con filtros de activos/aprobados |

### 3.7 `apps/catalog` — Catálogo Público
**Propósito:** Búsqueda, filtros, categorías, historial.

| Archivo | Responsabilidad |
|---------|----------------|
| `models.py` | `Category`, `ProductCategory`, `SearchHistory`, `CatalogFilter` |
| `api/viewsets.py` | Endpoints públicos de catálogo |

### 3.8 `apps/landing` — Páginas Públicas
**Propósito:** Formulario de contacto y landing page.

| Archivo | Responsabilidad |
|---------|----------------|
| `models.py` | `Contacto` con rate limiting por IP |
| `api/viewset.py` | Envío de mensajes de contacto |

---

## 4. Módulos del Frontend

### 4.1 Servicios (`services/`)

| Archivo | Responsabilidad |
|---------|----------------|
| `authService.js` | Gestión de JWT en memoria, restauración de sesión |
| `api.js` | Cliente Axios con interceptors, refresh queue, endpoints |

### 4.2 Store (`store/`)

| Archivo | Responsabilidad |
|---------|----------------|
| `appStore.js` | Estado global (sidebar, tema, toasts) con persistencia |

### 4.3 Componentes (`components/`)

| Archivo | Responsabilidad |
|---------|----------------|
| `MainLayout.jsx` | Layout con sidebar, header, zona de contenido |
| `Header.jsx` | Barra superior con navegación pública y menú usuario |
| `Product3DViewer.jsx` | Visor 3D con React Three Fiber |
| `ui/Button.jsx` | Botón reutilizable con variantes Bootstrap |
| `ui/Card.jsx` | Tarjeta reutilizable |
| `ui/Modal.jsx` | Modal reutilizable |
| `ui/Input.jsx` | Input reutilizable con validación |

### 4.4 Páginas (`pages/`)

| Página | Ruta | Propósito |
|--------|------|-----------|
| `Landing.jsx` | `/` | Página principal con productos destacados |
| `AuthPage.jsx` | `/login`, `/register` | Login/registro con validación |
| `Catalog.jsx` | `/catalog` | Catálogo con búsqueda, filtros, paginación |
| `ProductDetail.jsx` | `/product/:id` | Detalle con variantes, reseñas, imagen 3D |
| `Cart.jsx` | `/cart` | Carrito con cantidades y total |
| `CheckoutPage.jsx` | `/checkout` | Formulario de envío + pago Wompi |
| `Dashboard.jsx` | `/dashboard` | Perfil de usuario y pedidos |
| `Admin*.jsx` | `/admin-*` | Paneles de administración |

---

## 5. Requerimientos Funcionales (RF)

| RF | Descripción | ¿Dónde se implementa? |
|-----|------------|----------------------|
| RF-001 | Registro de usuarios | `viewset.py:40-80` — `RegistroViewSet.registro()` |
| RF-002 | Verificación de email | `viewset.py:138` — `EmailService.send_verification_email()` |
| RF-003 | Inicio de sesión | `viewset.py:228-270` — `LoginViewSet` con JWT |
| RF-004 | Recuperación de contraseña | `viewset.py:272-320` — flujo de reset |
| RF-005 | Roles (Admin/Usuario) | `models.py:20` — `ROL_CHOICES`, `admin_viewset.py:29` — `AdminPermission` |
| RF-006 | CRUD productos | `products/api/viewset.py:27-260` — `ProductViewSet` |
| RF-007 | Variantes (talla/color) | `products/models.py:60` — `Variant`, validación en `clean()` |
| RF-008 | Catálogo público | `catalog/api/` — filtros, búsqueda, categorías |
| RF-009 | Carrito de compras | `carts/api/viewset.py:22-117` — `CartViewSet` |
| RF-010 | Checkout + Wompi | `checkout/views.py:88-220` — flujo de pago |
| RF-011 | JWT con refresh | `auth_backend.py:1-90` + `settings.py:200-260` SimpleJWT |
| RF-012 | Roles en UI | `MainLayout.jsx:80-120` — menú condicional por rol |
| RF-013 | Bloqueo de usuarios | `admin_viewset.py:180` — `cambiar_estado` + token_version++ |
| RF-014 | Logs de auditoría | `admin_viewset.py:647` — `_registrar_auditoria()` |
| RF-015 | Modelos 3D | `models3d/api/viewsets.py` — CRUD + previsualizaciones |
| RF-016 | Diseños guardados (MongoDB) | `mongo_service.py:83-183` — `saved_designs` |
| RF-017 | Carrito persistente (MongoDB) | `mongo_service.py:249-350` — `cart_sessions` |

---

## 6. Elementos Complejos del Código

### 6.1 Autenticación JWT con httpOnly Cookies + Token Versioning

**Archivo:** `backend/apps/users/api/auth_backend.py`

**Complejidad:** Alta. Combina 3 mecanismos de seguridad:
1. JWT estándar en header `Authorization: Bearer <token>`
2. JWT en cookie httpOnly (fallback si no hay header)
3. `token_version` en BD para invalidación masiva

**Flujo:**
```
Request → ¿Header Authorization? → Sí → Validar JWT normal
                                 → No  → ¿Cookie access_token? → Sí → Validar JWT
                                                                → No → 401
Validar JWT → Extraer user_id → Consultar Usuario → ¿token_version coincide? → Sí → OK
                                                                              → No → 401
```

**Líneas clave:**
- `auth_backend.py:30` — Define `class UsuarioJWTAuthentication(BaseAuthentication)`
- `auth_backend.py:45` — `token = request.COOKIES.get('access_token')` — lee de cookie
- `auth_backend.py:65` — `if usuario.token_version != token_data.get('ver'):` — versión check

### 6.2 Refresh Queue (Frontend)

**Archivo:** `frontend/src/services/api.js`

**Complejidad:** Media. Evita que múltiples requests fallidos disparen
varios refreshes de token simultáneos.

**Lógica:**
```javascript
// api.js:~50
let isRefreshing = false        // ← Bandera: ¿ya estamos refrescando?
let failedQueue = []            // ← Cola: requests que esperan el nuevo token

// Cuando un request da 401:
// 1. Si NO estamos refrescando → isRefreshing=true, POST /token/refresh/
// 2. Si SÍ estamos refrescando → agregar a failedQueue (promesa pendiente)
// 3. Cuando el refresh termina → procesar failedQueue, resolver todas
// 4. Si el refresh falla → rechazar todas, clearAuth()
```

### 6.3 Merge de Carrito (Session → Usuario)

**Archivo:** `backend/apps/carts/api/viewset.py:42-54` + `mongo_service.py:291-325`

**Complejidad:** Media. Al iniciar sesión, el carrito anónimo (session_key)
debe fusionarse con el carrito del usuario sin duplicar items.

**Lógica:**
```
login → ¿session_key tiene carrito? → No  → usar carrito del usuario
                                     → Sí  → merge:
                                              1. Para cada item del session_cart:
                                                 - Si existe en user_cart → sumar cantidades
                                                 - Si no existe → agregar
                                              2. Eliminar session_cart de PostgreSQL
                                              3. Hacer merge equivalente en MongoDB
```

### 6.4 Webhook Wompi con Validación de Firma

**Archivo:** `backend/apps/checkout/views.py:275-391`

**Complejidad:** Alta. El webhook de Wompi es un endpoint público que
recibe notificaciones de pago. Debe:
1. Validar la firma HMAC-SHA256 para asegurar que viene de Wompi
2. Evitar procesar dos veces la misma orden
3. Restaurar stock si el pago es rechazado
4. Todo dentro de una transacción atómica

**Líneas clave:**
- `checkout/views.py:286` — `verify_webhook_signature()` — validación HMAC
- `checkout/views.py:332` — `if order.status == Order.STATUS_PAID:` — idempotencia
- `checkout/views.py:361` — `with transaction.atomic():` + restauración de stock

### 6.5 Content Security Policy (CSP) Dinámica

**Archivo:** `backend/apps/users/middleware.py`

**Complejidad:** Media. Genera un header CSP que permite scripts/styles
de `'self'`, imágenes de Cloudinary, y form-action a Wompi.

```python
# middleware.py:25
csp_policy = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
    "img-src 'self' https://res.cloudinary.com data:; "
    "form-action 'self' https://sandbox.wompi.co;"
)
```

### 6.6 Token Versioning para Bloqueo de Sesiones

**Archivo:** `backend/apps/users/api/admin_viewset.py:180`

**Complejidad:** Baja conceptualmente, pero potente. Cuando un admin
bloquea un usuario, se incrementa `token_version`. Todos los JWT existentes
quedan inválidos porque el auth backend verifica que la versión del token
coincida con la versión en BD.

```python
# admin_viewset.py:180
usuario.token_version += 1
usuario.save(update_fields=['token_version'])

# auth_backend.py:65
if usuario.token_version != token_data.get('ver'):
    raise AuthenticationFailed('Token invalidado')
```
