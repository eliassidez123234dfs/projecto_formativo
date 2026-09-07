# Seguridad — RED Estampacion

Estrategia de Defensa en Profundidad aplicada al proyecto RED Estampacion
(Django REST Framework + React + PostgreSQL + Docker)

---

## 4 Capas de Seguridad

El proyecto implementa 4 niveles de validación y protección
inspirados en la metodología de la competencia y alineados con
OWASP ASVS v4.0.

```
┌─────────────────────────────────────────────────────┐
│  Capa 1: HTML5 — Validación nativa del navegador    │
│  (required, type, minLength, pattern)               │
├─────────────────────────────────────────────────────┤
│  Capa 2: JavaScript — Validación client-side        │
│  (React hooks, estado local, feedback visual)       │
├─────────────────────────────────────────────────────┤
│  Capa 3: Django REST — Backend (Serializers,        │
│  Permisos, CSRF, Rate Limiting, JWT)                │
├─────────────────────────────────────────────────────┤
│  Capa 4: PostgreSQL — Base de datos (tipos estrictos│
│  constraints, unique, NOT NULL, hashes)             │
└─────────────────────────────────────────────────────┘
```

### Capa 1: HTML5 (Navegador)

Atributos nativos en los formularios del frontend React:

- `required` — Impide envío de campos vacíos
- `type="email"` — Validación de formato de correo
- `type="password"` — Oculta caracteres
- `minLength` — Longitud mínima
- `maxLength` — Longitud máxima
- `pattern` — Expresión regular para formatos específicos

Archivos clave:
- `frontend/src/pages/AuthPage.jsx` (login/registro)
- `frontend/src/pages/Cart.jsx` (formulario de envío)

### Capa 2: JavaScript (React)

Validación interactiva antes de enviar la petición HTTP:

- Estado local con `useState` para errores de campo
- Bloqueo de envío si hay errores de validación
- Feedback visual con clases CSS (`is-invalid`)
- Toggle de visibilidad de contraseña
- Toast de errores con `react-hot-toast`

Archivos clave:
- `frontend/src/pages/AuthPage.jsx` — validación de registro
- `frontend/src/services/api.js` — interceptores de errores

### Capa 3: Django REST Framework (Backend)

La barrera principal de seguridad del servidor:

- **Serializers**: Validación de tipos y formatos en `apps/*/api/serializers.py`
- **Permisos**: `IsAuthenticated`, `IsAdminUser`, permisos personalizados
- **Rate Limiting**: `ScopedRateThrottle` (10/min login, 3/hour contacto)
- **CSRF**: Tokens de sesión en formularios tradicionales
- **JWT**: Access token (15 min) + Refresh token (7 días) con blacklist
- **RegexValidator**: Expresiones regulares en campos críticos
- **Control de acceso**: `get_queryset()` filtra por usuario autenticado

Archivos clave:
- `backend/config/settings.py` — SIMPLE_JWT, REST_FRAMEWORK
- `backend/apps/users/api/viewset.py` — LoginViewSet, RegistroViewSet
- `backend/apps/users/api/serializers.py` — validaciones
- `backend/apps/users/middleware.py` — CSP, RequestID, ExceptionLogging
- `backend/apps/users/error_handler.py` — manejo de errores estructurado

### Capa 4: PostgreSQL (Base de Datos)

Integridad y tipado a nivel de almacenamiento:

- **Tipos estrictos**: CharField, EmailField, DecimalField, IntegerField
- **Constraints**: `unique`, `blank=False`, `null=False`, `default`
- **Campos privados**: `is_staff`, `rol` — no expuestos en serializers públicos
- **Hash de contraseñas**: PBKDF2 con SHA256 (Django default)
- **Soft-delete**: `eliminado=True` en lugar de DELETE físico
- **Constraints del modelo**: `CheckConstraint` para valores positivos

Archivos clave:
- `backend/apps/users/models.py` — Usuario, Token_Verificacion
- `backend/apps/products/models.py` — Product, Review
- `backend/apps/orders/models.py` — Order, Invoice

---

## Defensa OWASP Top 10 (Web Applications)

| OWASP | Riesgo | Defensa en el Proyecto |
|-------|--------|----------------------|
| **A01:2021** Broken Access Control | Acceso no autorizado a recursos | RBAC en ViewSets, `get_queryset()` filtra por usuario, `ProtectedRoute` en React |
| **A02:2021** Cryptographic Failures | Robo de credenciales | HTTPS (HSTS), PBKDF2 SHA256, JWT en cookies HttpOnly, tokens en memoria |
| **A03:2021** Injection (SQLi/XSS) | Inyección de código | ORM Django (parametrizado), auto-escape JSX, CSP header, sanitización en serializers |
| **A04:2021** Insecure Design | Diseño vulnerable | Defensa en 4 capas, patrón Strategy (config por entorno), Modular Monolith |
| **A05:2021** Security Misconfiguration | Configuración por defecto | `DEBUG=False`, usuario no-root en Docker, puertos DB no expuestos, cabeceras HTTP |
| **A06:2021** Vulnerable Components | Dependencias con CVE | `npm audit fix`, `pip-audit`, Dependabot en GitHub Actions |
| **A07:2021** Auth Failures | Robo de sesión | Rate limiting (5 intentos → bloqueo), JWT 15min, token_version, blacklist |
| **A08:2021** Data Integrity | Deserialización insegura | DRF serializers (no pickle), validación estricta de inputs |
| **A09:2021** Logging Failures | Falta de auditoría | `ExceptionLoggingMiddleware`, `RequestIDMiddleware`, logs rotativos en archivos |
| **A10:2021** SSRF | Falsificación de request server | URLs de Cloudinary/Wompi fijas en server, no se aceptan URLs de usuarios |

---

## Defensa OWASP API Security Top 10

| OWASP API | Riesgo | Defensa en el Proyecto |
|-----------|--------|----------------------|
| **API1:2023** BOLA/IDOR | Acceso a objetos de otros usuarios | `get_queryset()` filtra por `request.user` en todos los ViewSets |
| **API2:2023** Broken Authentication | Robo/suplantación de tokens | JWT cookies HttpOnly, access 15min, refresh 7d con rotación, blacklist |
| **API3:2023** Mass Assignment | Inyección de campos no autorizados | `read_only_fields` en serializers, `fields` explícitos |
| **API4:2023** Resource Consumption | Ataques DoS | Rate limiting DRF (`1000/hour` anon, `10000/hour` user), paginación |
| **API5:2023** BFLA | Acceso a funciones admin sin permiso | `AdminPermission` custom, `IsAdminUser` en endpoints administrativos |
| **API6:2023** Business Flow Abuse | Abuso de flujos (bots, scraping) | Rate limiting en login (10/min), verificación de email, captcha futuro |
| **API7:2023** SSRF | Peticiones server-side arbitrarias | URLs de servicios externos fijas en settings, no se aceptan de usuarios |
| **API8:2023** Security Misconfiguration | Config débil | `DEBUG=False`, CORS restringido, CSP estricto, tokens firmados con `SECRET_KEY` |
| **API9:2023** Inventory Management | Endpoints deprecados expuestos | Versionado bajo `/api/`, documentación Swagger/OpenAPI |
| **API10:2023** Unsafe API Consumption | Consumo inseguro de APIs externas | Serializers validan datos de Cloudinary/Wompi antes de persistir |

---

## Capa de Red y Servidor (Docker/Nginx)

### nginx.conf

Cabeceras de seguridad HTTP:

- `X-Frame-Options: SAMEORIGIN` — Previene clickjacking
- `X-Content-Type-Options: nosniff` — Previene MIME sniffing
- `X-XSS-Protection: 1; mode=block` — XSS filter legacy
- `Referrer-Policy: strict-origin-when-cross-origin` — Control de referer
- `Content-Security-Policy` — Fuentes permitidas (self, Cloudinary, Wompi)
- `Permissions-Policy` — Deshabilita cámara, micrófono, geolocalización
- `server_tokens off` — Oculta versión de Nginx

### Docker (docker-compose.prod.yml)

- Puertos de PostgreSQL (5432) y Redis (6379) **NO expuestos** al exterior
- Solo accesibles desde la red interna `app_network`
- Backend ejecuta como usuario `appuser` (no-root)
- Redis con contraseña (`--requirepass`)

### Dockerfiles

- Backend: multi-stage build, usuario `appuser` sin privilegios
- Frontend: multi-stage build, nginx como servidor estático

---

## Autenticación JWT — Flujo Completo

```
1. Login: POST /api/login/login/
   ├── Backend valida credenciales
   ├── Genera access token (15 min) + refresh token (7 días)
   ├── Guarda refresh token en cookie HttpOnly + localStorage
   ├── Access token → solo en memoria del frontend (nunca localStorage)
   └── Responde con datos del usuario

2. Request autenticado:
   ├── Frontend envía access token en header Authorization: Bearer <token>
   ├── Backend valida JWT con SIMPLE_JWT config
   └── Si expira (401), interceptor renueva automáticamente

3. Refresh automático:
   ├── Interceptor de Axios detecta 401
   ├── Llama POST /api/token/refresh/ con refresh token
   ├── Backend emite nuevo access token + refresh token
   ├── Frontend almacena access en memoria, refresh en localStorage
   └── Reintenta la petición original

4. Logout:
   ├── Backend blacklist el refresh token
   ├── Elimina cookies HttpOnly
   └── Frontend limpia memoria y localStorage
```

---

## Configuración de Seguridad en settings.py

```python
# JWT: Access 15 min, Refresh 7 días
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

# HTTPS obligatorio en producción
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000  # 1 año
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'

# Cookies seguras
SESSION_COOKIE_SECURE = True   # Solo HTTPS
CSRF_COOKIE_SECURE = True      # Solo HTTPS
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'

# CORS restringido
CORS_ALLOWED_ORIGINS = ['https://tudominio.com']
CORS_ALLOW_CREDENTIALS = True

# Rate Limiting
DEFAULT_THROTTLE_RATES = {
    'anon': '1000/hour',
    'user': '10000/hour',
    'contact_form': '3/hour',
    'client_errors': '30/minute',
}
```

---

## Monitoreo y Auditoría

### Middleware de Seguridad

- `RequestIDMiddleware` — ID único por request para trazabilidad
- `ExceptionLoggingMiddleware` — Captura excepciones no manejadas
- `ContentSecurityPolicyMiddleware` — Inyecta CSP en cada respuesta

### Logging

- Logs rotativos en `backend/logs/` (app.log, errors.log, requests.log, client_errors.log)
- Formato estructurado con timestamp, level, request_id, user
- Niveles: DEBUG → INFO → WARNING → ERROR → CRITICAL

### Error Handler

- `apps/users/error_handler.py` — Manejo centralizado de excepciones
- Respuestas JSON uniformes: `errorCode`, `userMessage`, `severity`, `requestId`
- No expone trazas internas al cliente

---

## Checklist de Seguridad para Producción

- [ ] `DEBUG=False` en `.env`
- [ ] `SECRET_KEY` seguro y único (no el de desarrollo)
- [ ] `ALLOWED_HOSTS` configurado con dominio real
- [ ] `CORS_ALLOWED_ORIGINS` solo con dominio del frontend
- [ ] Puertos de DB/Redis NO expuestos externamente
- [ ] Docker ejecutando como usuario no-root
- [ ] Nginx con todas las cabeceras de seguridad
- [ ] HTTPS habilitado con TLS 1.2/1.3
- [ ] HSTS habilitado (31536000 segundos)
- [ ] `npm audit` y `pip audit` sin vulnerabilidades críticas
- [ ] Logs configurados y rotativos
- [ ] Rate limiting en endpoints de autenticación
- [ ] Backups de PostgreSQL configurados
- [ ] Variables sensibles en `.env` (no en `.env.example`)
- [ ] `.env` en `.gitignore`

---

## Equilibrio Seguridad-Rendimiento

Lograr el equilibrio entre seguridad y rendimiento requiere descargar las
tareas de protección intensivas hacia los bordes de la red y optimizar
el procesamiento en el núcleo de la aplicación.

```
┌──────────────────────────────────────────────────────────────────┐
│  CDN/WAF (Cloudflare)                                           │
│  Bloqueo DDoS + WAF antes de llegar al servidor                 │
├──────────────────────────────────────────────────────────────────┤
│  Nginx (Reverse Proxy)                                          │
│  TLS 1.3 + HTTP/2 + Gzip + Cache Headers                       │
├──────────────────────────────────────────────────────────────────┤
│  Django (Backend)                                               │
│  JWT Stateless + Redis Cache + Celery Async + ORM Optimizado    │
├──────────────────────────────────────────────────────────────────┤
│  React (Frontend)                                               │
│  Code Splitting + Validación Híbrida + Cache de Navegador       │
└──────────────────────────────────────────────────────────────────┘
```

### Infraestructura y Red

- **CDN con WAF integrado**: Cloudflare o AWS CloudFront. El WAF bloquea
  tráfico malicioso y DDoS antes de tocar el servidor. La CDN sirve el
  frontend React y modelos 3D desde servidores geográficamente cercanos.
- **TLS 1.3 + HTTP/2**: Reduce handshakes de TLS (casi tan rápido como
  tráfico no cifrado). HTTP/2 permite multiplexar múltiples peticiones
  en una sola conexión.
- **Connection Pooling**: PgBouncer para PostgreSQL. Mantener conexiones
  abiertas y reutilizables es drásticamente más rápido que abrir una
  conexión nueva por cada request de Django.

### Backend (Django + DRF)

- **Autenticación Stateless (JWT)**: Django solo verifica criptográficamente
  la firma del token en memoria (CPU) en lugar de hacer una query a la
  base de datos (I/O) en cada petición.
- **Caché Diferenciada (Redis)**: Endpoints de lectura pública cacheados
  con TTL de 3-10 minutos. Nunca cachear vistas protegidas por login.
- **Procesamiento Asíncrono (Celery)**: Tareas pesadas (emails, procesamiento
  3D) delegadas a workers en segundo plano. No bloquean el hilo principal.
- **Optimización del ORM**: `select_related` y `prefetch_related` eliminan
  el problema N+1. Mantiene la velocidad de lectura sin abandonar la
  protección nativa contra inyecciones SQL.

### Frontend (React)

- **Code Splitting (React.lazy)**: Cada ruta carga solo su código JS.
  Reduce el bundle inicial de ~800KB a ~150KB (solo React + routing).
  Los módulos admin se cargan solo cuando el usuario es admin.
- **Validación Híbrida**: Zod/Yup en React para retroalimentación
  instantánea. El servidor Django solo procesa peticiones que ya
  pasaron un filtro primario de sanidad.

### Configuración de caché por endpoint

| Endpoint | TTL | Razón |
|----------|-----|-------|
| `GET /api/catalog/` (list) | Sin caché | Side effects: session tracking |
| `GET /api/catalog/{id}/` | 5 min | Producto estático, sin side effects |
| `GET /api/catalog/filters/` | 10 min | Filtros computados, cambian raramente |
| `GET /api/catalog/featured/` | 5 min | Top 12 productos, lectura pura |
| `GET /api/catalog/deals/` | 5 min | Top 8 ofertas, lectura pura |
| `GET /api/catalog/popular-searches/` | 10 min | Top 20 búsquedas |
| `GET /api/catalog/{id}/products/` | 5 min | Productos por categoría |
| `GET /api/products/search/` | 3 min | Búsqueda avanzada |
| `GET /api/products/` (admin) | Sin caché | Vista de admin, datos sensibles |
| `POST /api/auth/*` | Sin caché | Escritura, autenticación |

### Celery — Tareas asíncronas

Las tareas pesadas se ejecutan en workers separados via Celery + Redis:

| Tarea | Trigger | Razón |
|-------|---------|-------|
| `send_contact_notification_async` | POST /api/contacto/ | No bloquear respuesta al usuario |
| `send_password_reset_email_async` | POST /api/registro/recuperar_password/ | Email puede tardar 1-3s |
| `send_welcome_email_async` | POST /api/admin/usuarios/ | Email de bienvenida, no crítico |
| `send_admin_reset_email_async` | POST /api/admin/usuarios/resetear_password/ | Email de admin, no crítico |

Configuración Celery:
- `CELERY_BROKER_URL`: Redis (mismo que caché, database offset /1)
- `CELERY_TASK_TIME_LIMIT`: 5 min máximo por tarea
- `CELERY_WORKER_PREFETCH_MULTIPLIER`: 1 (fair scheduling)
- `CELERY_WORKER_MAX_TASKS_PER_CHILD`: 100 (reciclar workers)

### ORM Optimization — Anti N+1

| ViewSet | Query Optimizada | Impacto |
|---------|-----------------|---------|
| `CatalogViewSet` | `prefetch_related('images', 'variants', 'categories', 'reviews')` | 6 queries → 3 |
| `ProductViewSet` | `prefetch_related('images', 'variants', 'audit_entries')` | 4 queries → 2 |
| `ReviewViewSet` | `select_related('user')` | N+1 → 1 query |
| `UsuarioViewSet` | `select_related('admin_desbloqueador', 'admin_eliminador')` | N+1 → 1 query |
| `LoginViewSet` (cart merge) | Pre-fetch + dict lookup | N queries → 1 query |

### Nginx — Cache Headers

| Tipo de archivo | TTL | Header |
|-----------------|-----|--------|
| JS/CSS (Vite hashed) | 1 año | `Cache-Control: public, immutable` |
| Fuentes (woff2, ttf) | 30 días | `Cache-Control: public, immutable` |
| Imágenes (png, jpg, svg) | 7 días | `Cache-Control: public` |
| index.html | Sin caché | `Cache-Control: no-cache, no-store` |
| API responses | Sin caché | `Cache-Control: no-store, no-cache` |
| Admin panel | Sin caché | `Cache-Control: no-store, no-cache` |

### Code Splitting — React.lazy

El bundle inicial se divide en chunks por ruta:

```
Initial bundle (~150KB):  React + React Router + CSS
├── chunk: Landing (~30KB)
├── chunk: Catalog (~25KB)
├── chunk: ProductDetail (~20KB)
├── chunk: Auth (login/register) (~15KB)
├── chunk: Cart (~15KB)
├── chunk: Dashboard/UserProfile (~20KB)
├── chunk: Admin* (~60KB) — solo se carga si el usuario es admin
└── chunk: Checkout (~15KB)
```

Beneficio: Un usuario que solo visita el catálogo nunca descarga
el código de administración (~60KB). Un usuario que nunca entra
al dashboard no descarga esos componentes.
