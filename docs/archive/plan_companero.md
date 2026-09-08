mire mani para que lo tenga ahi y no le toque hacerlo.. # AUDITORÍA TÉCNICA COMPLETA — Migración Supabase + Docker

**Proyecto:** Red Estampación (proyecto_formativo)  
**Fecha:** 2026-09-07  
**Rama:** `recuperacion-estable`  
**Objetivo:** Preparar el proyecto para despliegue gratuito y estable, manteniendo desarrollo local.

---

## 1. RESUMEN EJECUTIVO

| Aspecto | Estado Actual |
|---------|---------------|
| Backend | Django 5.2.13 + DRF 3.16.1, Python 3.12 |
| Frontend | React 19.2.5 + Vite 8.0.10, Node 20 |
| Base de datos | SQLite (448 KB, desarrollo) |
| Auth | JWT (SimpleJWT), 15min access / 7d refresh |
| Archivos | Cloudinary (imágenes + 3D) |
| Docker | 3 contenedores (dev mode), sin producción |
| CI/CD | No existe |
| Producción | No desplegado |

**Hallazgos críticos:**
1. Secretos reales en `.env` (SMTP, Neon DB, Cloudinary) — posible exposición en historial de git
2. `SECRET_KEY` es `django-insecure-...` — jamás usar en producción
3. `OrderViewSet` tiene CRUD completo con `AllowAny` — cualquiera puede leer/modificar/eliminar órdenes
4. Frontend y Tshirt3D corren en modo `dev` dentro de Docker — no apto para producción
5. No existe nginx, no hay healthchecks, no hay HTTPS

---

## 2. ESTADO ACTUAL DEL PROYECTO

### 2.1 Estructura del Proyecto

```
proyecto_formativo/
├── .env # Variables de entorno raíz (NO commitear)
├── .env.example # Plantilla de variables
├── .gitignore # Excluye .env, db.sqlite3, etc.
├── docker-compose.yml # 3 servicios: backend, frontend, tshirt3d
├── requirements.txt # Dependencias Python (duplicado en backend/)
│
├── backend/ # Django REST API
│ ├── Dockerfile # python:3.12-slim + gunicorn
│ ├── entrypoint.sh # migrate + collectstatic
│ ├── manage.py
│ ├── requirements.txt # Idéntico al raíz
│ ├── db.sqlite3 # Base de datos SQLite (448 KB)
│ ├── config/
│ │ ├── settings.py # Configuración principal (423 líneas)
│ │ ├── urls.py # URLs raíz
│ │ ├── wsgi.py
│ │ └── asgi.py
│ └── apps/
│ ├── users/ # Modelo custom, auth, JWT, admin
│ ├── products/ # Productos, imágenes, variantes, audit
│ ├── catalog/ # Categorías, búsqueda, filtros
│ ├── orders/ # Órdenes, items
│ ├── carts/ # Carrito (session + user)
│ ├── checkout/ # Resumen, confirmación, PDF factura
│ ├── landing/ # Formulario de contacto
│ ├── models3d/ # Modelos 3D, Cloudinary management
│ └── monitoring/ # Logging de errores del frontend
│
├── frontend/ # React + Vite
│ ├── Dockerfile # node:20-alpine + npm run dev
│ ├── package.json
│ ├── vite.config.js # Proxy /api → backend
│ └── src/
│ ├── App.jsx # Router principal (29 rutas)
│ ├── services/api.js # Axios instances (api, publicApi, sessionApi)
│ ├── context/ # CartContext, ThemeContext
│ ├── pages/ # 17 públicas + 12 admin
│ ├── components/ # 17 componentes
│ └── styles/ # Tailwind CSS v4 + CSS custom
│
├── microservices/
│ └── Tshirt3D/ # Editor 3D (React 18, Three.js, Vite 4)
│ ├── Dockerfile
│ ├── package.json
│ └── src/
│
└── docs/ # Documentación del proyecto
```

### 2.2 Versiones

| Tecnología | Versión | Archivo |
|------------|---------|---------|
| Python | 3.12.3 | Dockerfile (`python:3.12-slim`) |
| Django | 5.2.13 | `requirements.txt` |
| DRF | 3.16.1 | `requirements.txt` |
| SimpleJWT | 5.5.1 | `requirements.txt` |
| Node | 20 | Dockerfile (`node:20-alpine`) |
| React | 19.2.5 | `package.json` |
| Vite | 8.0.10 | `package.json` |
| Tailwind CSS | 4.3.3 | `package.json` |
| react-router-dom | 7.11.0 | `package.json` |
| axios | 1.16.0 | `package.json` |

---

## 3. AUDITORÍA BACKEND

### 3.1 Configuración de Base de Datos

**Archivo:** `backend/config/settings.py`

```python
# DESARROLLO (activo):
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# PRODUCCIÓN (solo cuando DEBUG=False):
if not DEBUG and env('DATABASE_URL', default=''):
    DATABASES = {'default': env.db('DATABASE_URL')}
    DATABASES['default']['ATOMIC_REQUESTS'] = True
```

**SQLite actual:**
- Ubicación: `backend/db.sqlite3`
- Tamaño: 448 KB
- 112 páginas de base de datos
- Tablas de 9 apps (19 modelos)

### 3.2 Todos los Modelos (19 modelos)

| App | Modelo | Tabla | Campos clave |
|-----|--------|-------|-------------|
| users | `Usuario` | `usuarios` | id, usuario, correo, contrasena, estado, rol, email_verificado, eliminado |
| users | `Token_Verificacion` | `tokens_verificacion` | usuario(FK), token, tipo, fecha_expiracion, usado |
| users | `Historial_Estado_Usuario` | `historial_estado_usuarios` | usuario(FK), estado_anterior/nuevo, admin(FK) |
| users | `Log_Auditoria` | `logs_auditoria` | usuario_admin(FK), accion, datos_anteriores(JSON), datos_nuevos(JSON) |
| products | `Product` | default | name, description, base_price, is_active, is_approved, creator(FK) |
| products | `ProductImage` | default | product(FK), image(ImageField), is_main, order |
| products | `Variant` | default | product(FK), size, color, color_hex, stock, price_variant |
| products | `ProductAudit` | default | product(FK), action, before_data(JSON), after_data(JSON) |
| catalog | `Category` | default | name, description, is_active |
| catalog | `ProductCategory` | default | product(FK), category(FK) — unique_together |
| catalog | `SearchHistory` | default | session_key, query, filters(JSON), results_count |
| catalog | `CatalogFilter` | default | name, filter_type, config(JSON) |
| catalog | `PopularSearch` | default | query, search_count |
| orders | `Order` | default | user(FK), customer_name, status, total, image(Base64), cloudinary_public_id |
| orders | `OrderItem` | default | order(FK), product(FK), variant(FK), quantity, unit_price |
| carts | `Cart` | default | session_key, user(FK) |
| carts | `CartItem` | default | cart(FK), product(FK), variant(FK), quantity, unit_price |
| landing | `Contacto` | `contactos` | nombre, correo, asunto, mensaje, ip_origen, leido |
| models3d | `Model3D` | default | name, cloudinary_url, file_type, is_active, is_approved |
| models3d | `Model3DImage` | default | model_3d(FK), cloudinary_url, is_main, order |

### 3.3 Relaciones entre Modelos

```
Usuario ──┬── Token_Verificacion (1:N, CASCADE)
          ├── Historial_Estado_Usuario (1:N, CASCADE)
          ├── Log_Auditoria (1:N, SET_NULL) [como admin y como afectado]
          ├── Product.creator (1:N, SET_NULL)
          ├── Product.approved_by (1:N, SET_NULL)
          ├── Order.user (1:N, SET_NULL)
          ├── Cart.user (1:N, SET_NULL)
          └── Usuario.admin_desbloqueador/eliminador (FK self, SET_NULL)

Product ──┬── ProductImage (1:N, CASCADE)
          ├── Variant (1:N, CASCADE)
          ├── ProductAudit (1:N, CASCADE)
          ├── ProductCategory (1:N, CASCADE)
          ├── OrderItem.product (FK, PROTECT)
          └── CartItem.product (FK, CASCADE)

Category ──┬── ProductCategory (1:N, CASCADE)

Order ──┬── OrderItem (1:N, CASCADE)

Cart ──┬── CartItem (1:N, CASCADE)

Model3D ──┬── Model3DImage (1:N, CASCADE)
```

### 3.4 Migraciones

| App | Migración | Tipo |
|-----|-----------|------|
| users | 0001_initial | Schema |
| users | 0002_alter_token_verificacion_token | Schema |
| users | 0003_remove_cambio_email | Schema |
| products | 0001_initial | Schema |
| products | 0002_product_approved_at... | Schema |
| products | 0003_backfill_colors_and_cop_prices | **Data** |
| catalog | 0001_initial | Schema |
| orders | 0001_initial | Schema |
| orders | 0002_order_cloudinary_public_id... | Schema |
| orders | 0003_alter_order_user | Schema |
| carts | 0001_initial | Schema |
| carts | 0002_cart_user | Schema |
| carts | 0003_alter_cart_session_key | Schema |
| landing | 0001_initial | Schema |
| landing | 0002_alter_contacto_options | Schema |
| models3d | 0001_initial | Schema |
| models3d | 0002_cloudinaryresource | Schema |

**TOTAL: 17 migraciones (16 schema + 1 data)**

### 3.5 Seed Commands

| Comando | Descripción |
|---------|-------------|
| `python manage.py seed_users` | Crea 6 usuarios (1 admin + 5 clientes) |
| `python manage.py seed_products` | Crea 7 productos con imágenes de Cloudinary + categorías + variantes |
| `python manage.py seed_all` | Ejecuta ambos |

### 3.6 Autenticación y JWT

| Configuración | Valor |
|---------------|-------|
| Access token lifetime | 15 minutos |
| Refresh token lifetime | 7 días |
| ROTATE_REFRESH_TOKENS | True |
| BLACKLIST_AFTER_ROTATION | True |
| Algorithm | HS256 |
| SIGNING_KEY | SECRET_KEY |

**Custom JWT Auth:** `UsuarioJWTAuthentication` verifica estado del usuario en cada request.

### 3.7 CORS

```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174',
    'http://127.0.0.1:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174',
    'http://192.168.1.93:5173', 'http://192.168.137.7:5173',
]
CORS_ALLOW_CREDENTIALS = True
```

**PROBLEMA:** Todos los orígenes son `http://` y están hardcodeados. No hay orígenes HTTPS para producción.

### 3.8 Rate Limiting

| Endpoint | Límite |
|----------|--------|
| Anónimo general | 1000/hora |
| Autenticado general | 10000/hora |
| Formulario contacto | 3/hora |
| Errores cliente | 30/minuto |

### 3.9 Archivos/Media

- **Storage:** Cloudinary (`MediaCloudinaryStorage`)
- **STATIC_ROOT:** `backend/static/`
- **MEDIA_ROOT:** `backend/media/`
- **STATIC_URL:** `/static/`
- **MEDIA_URL:** `/media/`
- **Signal cleanup:** `pre_delete` y `pre_save` en `ProductImage` destruyen assets de Cloudinary

### 3.10 Celery/Redis

**INSTALADO pero NO CONFIGURADO.** Celery 5.4.0 y Redis están en `requirements.txt` pero:
- No hay `celery.py` en `config/`
- No hay `@shared_task` en ningún archivo
- No hay servicio Celery en `docker-compose.yml`
- Los emails se envían síncronamente

---

## 4. AUDITORÍA FRONTEND

### 4.1 Rutas (29 total)

**Públicas (17):**
`/`, `/catalog`, `/category/:id`, `/product/:id`, `/product/:id/3d`, `/cart`, `/checkout`, `/login`, `/register`, `/email`, `/verificar-email`, `/verificar-email-pendiente`, `/password`, `/nueva-password`, `/perfil`, `/dashboard`

**Admin protegidas (12):**
`/admin`, `/admin-products`, `/admin-products/detail/:id`, `/admin-products/approval`, `/admin-users`, `/admin-cart`, `/admin-cart/:id`, `/admin-contact`, `/admin-orders`, `/admin-orders/:id`, `/admin-audit`, `/admin-cloudinary`

### 4.2 Endpoints API (~50 endpoints)

Todas las llamadas van a `/api/` que se proxean al backend via Vite dev server.

### 4.3 Estado

- **CartContext:** Carrito server-side via session API
- **ThemeContext:** Dark/light mode en localStorage
- **No Redux/Zustand/MobX** — todo con useState/useEffect local

### 4.4 URLs Hardcodeadas

| Archivo | URL | Problema |
|---------|-----|----------|
| `AdminLayout.jsx:138` | `http://127.0.0.1:5174/` | No funcionará en producción |
| `Product3D.jsx:56` | `http://127.0.0.1:5174/` | No funcionará en producción |

### 4.5 Problemas de Seguridad Frontend

1. **JWT en localStorage** — vulnerable a XSS
2. **ProtectedRoute solo verifica localStorage** — no valida token en servidor
3. **No existe ruta 404** — URLs incorrectas muestran página en blanco
4. **No hay code splitting** — todas las 29 rutas se cargan eagerly

### 4.6 Microservicio Tshirt3D

- React 18 (diferente a React 19 del frontend principal)
- Vite 4 (diferente a Vite 8)
- Tailwind CSS v3 (diferente a v4)
- Puerto 5174 hardcodeado
- Integración unidireccional: `window.open()` al microservicio

---

## 5. AUDITORÍA SQLite

### 5.1 Configuración Actual

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

El archivo `db.sqlite3` (448 KB) contiene datos reales de desarrollo.

### 5.2 Datos Existentes

- Migraciones aplicadas (17 migraciones)
- Datos de seed (si se ejecutaron): 6 usuarios, 7 productos
- Datos de prueba posibles (carritos, órdenes, contactos)

### 5.3 Compatibilidad SQLite → PostgreSQL

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Raw SQL | ✅ | No hay queries raw — todo usa ORM |
| SQLite-specific functions | ✅ | Ninguna detectada |
| Migraciones | ✅ | Todas usan operaciones estándar de Django |
| JSONField | ✅ | 6 campos — funcional en ambos motores |
| DateTimeField + USE_TZ | ✅ | Configurado correctamente |
| BooleanField | ✅ | Sin problemas |
| ImageField | ✅ | Cloudinary storage, no depende del motor |
| Data migration | ✅ | `0003_backfill_colors...` usa solo ORM |
| Índices | ✅ | Estándar de Django |
| Unique constraints | ✅ | `UniqueConstraint` estándar |
| Foreign keys | ✅ | CASCADE/SET_NULL/PROTECT — todos estándar |

**CONCLUSIÓN: La migración SQLite → PostgreSQL es segura.** No hay código dependiente de SQLite.

### 5.4 Incompatibilidades Potenciales

| Problema | Riesgo | Solución |
|----------|--------|----------|
| `order_by` case-sensitive | Bajo | PostgreSQL es case-sensitive por defecto |
| `LIKE` case-sensitive | Bajo | No hay búsquedas LIKE raw |
| Auto-increment IDs | Ninguno | Django usa `BigAutoField` |
| Transacciones | Ninguno | `ATOMIC_REQUESTS` configurado para producción |

---

## 6. AUDITORÍA DOCKER

### 6.1 Estado Actual

| Servicio | Dockerfile | Modo | Puerto |
|----------|-----------|------|--------|
| backend | `python:3.12-slim` | gunicorn con `--reload` | 8000 |
| frontend | `node:20-alpine` | `npm run dev` (DEV) | 5173 |
| tshirt3d | `node:20-alpine` | `npm run dev` (DEV) | 5174 |

### 6.2 Problemas Encontrados

| # | Problema | Severidad |
|---|----------|-----------|
| 1 | Frontend y Tshirt3D corren en modo desarrollo (`npm run dev`) | ALTO |
| 2 | `--reload` en gunicorn (desarrollo, no producción) | MEDIO |
| 3 | No hay nginx (reverse proxy) | ALTO |
| 4 | No hay healthchecks en ningún servicio | ALTO |
| 5 | No hay multi-stage builds | MEDIO |
| 6 | No hay `docker-compose.prod.yml` | ALTO |
| 7 | `entrypoint.sh` no espera a que la DB esté lista | MEDIO |
| 8 | No hay network isolation | BAJO |
| 9 | `requirements.txt` duplicado (raíz + backend) | BAJO |

### 6.3 Lo que Falta

- **Nginx** para servir frontend estático y proxy al backend
- **Production Dockerfiles** con multi-stage builds
- **Healthchecks** en docker-compose
- **Wait-for-db** en entrypoint.sh
- **docker-compose.prod.yml** con configuración de producción
- **Variables de entorno** para producción (separate de .env de desarrollo)

---

## 7. VARIABLES DE ENTORNO

### 7.1 Variables Activas (usadas en código)

| Variable | Dónde se usa | Obligatoria | Local | Producción |
|----------|-------------|-------------|-------|------------|
| `SECRET_KEY` | `settings.py:20` | SÍ | `django-insecure-...` | Generar nueva |
| `DEBUG` | `settings.py:23` | SÍ | `True` | `False` |
| `ALLOWED_HOSTS` | `settings.py:25` | SÍ | `127.0.0.1,localhost` | Dominio real |
| `FRONTEND_URL` | `settings.py:276` | SÍ | `http://localhost:5173` | URL de frontend |
| `BACKEND_URL` | `settings.py:277` | SÍ | `http://localhost:8000` | URL de backend |
| `EMAIL_BACKEND` | `settings.py:280` | SÍ | `smtp` | `smtp` |
| `EMAIL_HOST` | `settings.py:293` | SÍ | `smtp.gmail.com` | `smtp.gmail.com` |
| `EMAIL_PORT` | `settings.py:294` | SÍ | `587` | `587` |
| `EMAIL_USE_TLS` | `settings.py:295` | SÍ | `True` | `True` |
| `EMAIL_HOST_USER` | `settings.py:298` | SÍ | `hurtadoelias025@gmail.com` | Correo real |
| `EMAIL_HOST_PASSWORD` | `settings.py:299` | SÍ | `vksyzeknckzzufnf` | App password |
| `DEFAULT_FROM_EMAIL` | `settings.py:300` | SÍ | `hurtadoelias025@gmail.com` | Correo real |
| `DATABASE_URL` | `settings.py:342` | SÍ (prod) | Neon PostgreSQL | Supabase URL |
| `CLOUDINARY_CLOUD_NAME` | `settings.py:171` | SÍ | `doa7qxr0d` | Mismo |
| `CLOUDINARY_API_KEY` | `settings.py:172` | SÍ | `797558357283665` | Mismo |
| `CLOUDINARY_API_SECRET` | `settings.py:173` | SÍ | `dQRVQOOKpJ4LRDsiioIzVFdE3uA` | Mismo |
| `VITE_API_URL` | `api.js:4`, `vite.config.js:11` | SÍ | `http://127.0.0.1:8000/api/` | `/api/` |
| `VITE_CLOUDINARY_CLOUD_NAME` | Tshirt3D helpers.js | SÍ | `doa7qxr0d` | Mismo |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Tshirt3D helpers.js | SÍ | `prueba` | Mismo |
| `VITE_CLOUDINARY_URL` | Tshirt3D helpers.js | SÍ | URL Cloudinary | Mismo |
| `VITE_MODELS3D_API_URL` | Tshirt3D helpers.js | SÍ | `http://127.0.0.1:8000/api/models3d/models/` | URL prod |

### 7.2 SECRETOS QUE DEBEN ROTARSE

| Secreto | Ubicación actual | Acción |
|---------|-----------------|--------|
| Django SECRET_KEY | `.env` línea 7 | Generar nueva con `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"` |
| Gmail App Password | `.env` línea 19 | Regenerar en Google Account → Security → App passwords |
| Neon DB Password | `.env` línea 23 | Regenerar en Neon dashboard (o usar Supabase) |
| Cloudinary API Secret | `.env` línea 28 | Regenerar en Cloudinary dashboard |

---

## 8. PROBLEMAS ENCONTRADOS

### 8.1 CRÍTICOS

| # | Problema | Ubicación | Impacto |
|---|----------|-----------|---------|
| C1 | `SECRET_KEY` insegura y predecible | `.env:7` | JWT forjables, sesiones comprometidas |
| C2 | `OrderViewSet` con `AllowAny` CRUD completo | `orders/api/viewsets.py:12` | Cualquiera lee/modifica/elimina órdenes con PII |
| C3 | `download_order_invoice_pdf` sin autenticación | `checkout/views.py:202` | Cualquiera descarga facturas por ID |
| C4 | Credenciales reales en `.env` (posible historial git) | `.env` | Exposición de secretos |
| C5 | Frontend corre en modo `dev` en Docker | `frontend/Dockerfile` | No apto para producción |

### 8.2 ALTOS

| # | Problema | Ubicación |
|---|----------|-----------|
| A1 | No hay CORS origins HTTPS para producción | `settings.py:250-259` |
| A2 | No existe nginx/reverse proxy | `docker-compose.yml` |
| A3 | No hay healthchecks | `docker-compose.yml` |
| A4 | `CORS_ALLOWED_ORIGINS` hardcodeado, no configurable por env | `settings.py:250` |
| A5 | No hay `SECURE_SSL_REDIRECT` ni HSTS | `settings.py` |
| A6 | `Model3DViewSet` create sin auth | `models3d/api/viewsets.py:28` |
| A7 | `CategoryViewSet` usa `lookup_field='slug'` pero Category no tiene campo `slug` | `catalog/api/viewset.py` |

### 8.3 MEDIOS

| # | Problema | Ubicación |
|---|----------|-----------|
| M1 | `CORS_ORIGIN_WHITELIST` redundante (ignorado) | `settings.py:313` |
| M2 | IPs locales en CORS/CSRF trusted origins | `settings.py` |
| M3 | Gunicorn sin workers/threads configurados | `Dockerfile CMD` |
| M4 | Celery/Redis instalados pero no configurados | `requirements.txt` |
| M5 | `python-decouple` instalado pero no usado | `requirements.txt` |
| M6 | No hay ruta 404 en frontend | `App.jsx` |
| M7 | ProtectedRoute solo verifica localStorage | `ProtectedRoute.jsx` |
| M8 | `console.log` en código de producción | `AdminContact.jsx:57` |

---

## 9. RIESGOS DE MIGRACIÓN

### 9.1 SQLite → PostgreSQL

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Pérdida de datos | BAJO | Usar `dumpdata/loaddata` o `pgloader` |
| Incompatibilidad de tipos | BAJO | Django ORM abstrae las diferencias |
| Migraciones no aplicables | BAJO | Todas las migraciones son estándar |
| JSONField functionality | BAJO | PostgreSQL tiene JSONB completo (mejor) |
| DateTime timezone | BAJO | `USE_TZ=True` ya configurado |
| IDs auto-increment | BAJO | `BigAutoField` funciona en ambos |

### 9.2 Datos a Migrar

- **Usuarios** (6 seed + posibles registros)
- **Productos** (7 seed + posibles registros)
- **Categorías** (definidas en seed)
- **Órdenes** (posibles registros de prueba)
- **Carritos** (posibles registros)
- **Contactos** (posibles mensajes)
- **Tokens de verificación** (temporales, no migrar)
- **Logs de auditoría** (migrar por consistencia)

---

## 10. ARQUITECTURA PROPUESTA

### 10.1 Desarrollo Local

```
┌─────────────────────────────────────┐
│ Docker Compose (dev) │
│ │
│ ┌──────────┐ ┌──────────┐ │
│ │ Frontend │ │ Tshirt3D │ │
│ │ :5173 │ │ :5174 │ │
│ │ (Vite │ │ (Vite │ │
│ │ dev) │ │ dev) │ │
│ └────┬─────┘ └────┬─────┘ │
│ │ proxy │ │
│ ┌────▼──────────────▼────┐ │
│ │ Backend Django │ │
│ │ :8000 (gunicorn) │ │
│ └────────────┬────────────┘ │
│ │ │
│ ┌────────────▼────────────┐ │
│ │ SQLite (db.sqlite3) │ │
│ └─────────────────────────┘ │
└─────────────────────────────────────┘
```

### 10.2 Producción

```
┌─────────────────────────────────────────────────┐
│ Render.com (Backend) + Vercel/Netlify (Frontend)│
│ │
│ ┌─────────────┐ ┌──────────────────┐ │
│ │ Frontend │ │ Backend Django │ │
│ │ (Vite build) │───▶│ (gunicorn) │ │
│ │ Static files │ │ Render.com │ │
│ └─────────────┘ └────────┬─────────┘ │
│ │ │
│ ┌─────────▼─────────┐ │
│ │ Supabase │ │
│ │ PostgreSQL │ │
│ │ (DATABASE_URL) │ │
│ └───────────────────┘ │
│ │
│ Cloudinary (imágenes y modelos 3D) │
└─────────────────────────────────────────────────┘
```

### 10.3 Por Qué Esta Arquitectura

| Decisión | Razón |
|----------|-------|
| Supabase PostgreSQL | Gratis (500 MB), sin setup de Docker DB |
| Render.com (backend) | Gratis (750 hrs/mes), soporta Django nativo |
| Vercel/Netlify (frontend) | Gratis, builds automáticos desde git |
| Cloudinary (ya existe) | Manejo de imágenes ya configurado |
| Sin Docker en producción | Render/Vercel manejan su propio build |
| Docker solo para desarrollo | Mantener consistencia de equipo |

---

## 11. PLAN DE MIGRACIÓN

### PASO 1: Generar nuevo SECRET_KEY
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```
- **Archivo:** `.env`
- **Cambiar:** `SECRET_KEY=django-insecure-...` → nueva clave
- **Comprobar:** `python manage.py check` sin errores

### PASO 2: Configurar Supabase
1. Crear cuenta en supabase.com
2. Crear proyecto nuevo
3. Obtener connection string de PostgreSQL
4. **NO cambiar `.env` local todavía**

### PASO 3: Migrar datos de SQLite a PostgreSQL
```bash
# 1. Exportar datos de SQLite
python manage.py dumpdata --natural-foreign --natural-primary -o dump.json

# 2. Crear base de datos en Supabase y aplicar migraciones
DATABASE_URL="tu_url_supabase" python manage.py migrate

# 3. Importar datos
DATABASE_URL="tu_url_supabase" python manage.py loaddata dump.json
```
- **Riesgo:** Bajo — todas las migraciones son estándar
- **Comprobar:** Contar registros en cada tabla después de importar

### PASO 4: Actualizar settings.py para producción
```python
# Agregar después de la línea 344:
SECURE_SSL_REDIRECT = not DEBUG
SECURE_HSTS_SECONDS = 31536000 if not DEBUG else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https') if not DEBUG else None
```

### PASO 5: Configurar CORS para producción
```python
# Cambiar CORS_ALLOWED_ORIGINS para leer de env:
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:5173', 'http://localhost:5174',
])
```

### PASO 6: Agregar healthcheck endpoint
- **Archivo:** `backend/config/urls.py`
- **Agregar:** `path('api/health/', ...)` que retorne 200 OK

### PASO 7: Configurar gunicorn para producción
- **Archivo:** `Dockerfile`
- **Cambiar CMD:** `gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --threads 2 --timeout 120`

### PASO 8: Crear docker-compose.prod.yml
- Sin bind mounts
- Sin `--reload`
- Con healthchecks
- Con network isolation

### PASO 9: Configurar Render.com
1. Conectar repositorio de GitHub
2. Configurar build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput`
3. Configurar start command: `gunicorn config.wsgi:application`
4. Agregar variables de entorno (DATABASE_URL, SECRET_KEY, etc.)

### PASO 10: Desplegar frontend
1. Conectar repositorio a Vercel/Netlify
2. Build command: `npm run build`
3. Output directory: `dist`
4. Configurar variables de entorno VITE_*

---

## 12. ARCHIVOS QUE HABRÍA QUE MODIFICAR

| Archivo | Cambio | Motivo | Prioridad |
|---------|--------|--------|-----------|
| `backend/config/settings.py` | Agregar security headers producción | Seguridad | CRÍTICO |
| `backend/config/settings.py` | CORS configurable por env | Flexibilidad | ALTO |
| `backend/config/settings.py` | Corregir `CategoryViewSet` lookup_field | Bug | ALTO |
| `backend/apps/orders/api/viewsets.py` | Agregar permisos a OrderViewSet | Seguridad | CRÍTICO |
| `backend/apps/checkout/views.py` | Agregar auth a download invoice | Seguridad | CRÍTICO |
| `backend/apps/models3d/api/viewsets.py` | Agregar permisos a create | Seguridad | ALTO |
| `backend/Dockerfile` | Multi-stage build + gunicorn config | Producción | ALTO |
| `backend/entrypoint.sh` | Agregar wait-for-db | Confiabilidad | MEDIO |
| `frontend/Dockerfile` | Build producción + nginx | Producción | ALTO |
| `docker-compose.yml` | Agregar healthchecks | Confiabilidad | ALTO |
| `docker-compose.prod.yml` | **CREAR** - configuración producción | Despliegue | ALTO |
| `nginx.conf` | **CREAR** - reverse proxy | Despliegue | ALTO |
| `.env.example` | Agregar variables de producción | Documentación | MEDIO |

---

## 13. ARCHIVOS QUE FALTAN

| Archivo | Propósito | Prioridad |
|---------|-----------|-----------|
| `docker-compose.prod.yml` | Configuración Docker producción | ALTO |
| `nginx.conf` | Reverse proxy para frontend + API | ALTO |
| `backend/gunicorn.conf.py` | Configuración gunicorn producción | MEDIO |
| `backend/healthcheck.py` | Endpoint de salud | MEDIO |
| `.github/workflows/deploy.yml` | CI/CD con GitHub Actions | BAJO |
| `scripts/backup_db.sh` | Backup de base de datos | BAJO |
| `scripts/migrate_sqlite_to_pg.sh` | Migración automatizada | BAJO |
| `render.yaml` | Deploy en Render.com | MEDIO |
| `vercel.json` | Deploy en Vercel | MEDIO |

---

## 14. CHECKLIST FINAL

### Pre-Migración
- [ ] Generar nuevo SECRET_KEY para producción
- [ ] Respaldar `db.sqlite3`
- [ ] Ejecutar `python manage.py dumpdata` y guardar `dump.json`
- [ ] Verificar que todas las migraciones están aplicadas (`python manage.py showmigrations`)
- [ ] Crear cuenta en Supabase y obtener DATABASE_URL

### Migración PostgreSQL
- [ ] Crear proyecto en Supabase
- [ ] Aplicar migraciones a PostgreSQL
- [ ] Importar datos con `loaddata`
- [ ] Verificar conteo de registros en cada tabla
- [ ] Probar login/registro con la nueva DB

### Seguridad
- [ ] Nuevo SECRET_KEY en producción (no el insecure)
- [ ] Rotar Gmail App Password
- [ ] Verificar que .env no está en historial de git
- [ ] CORS configurable por env
- [ ] OrderViewSet con permisos adecuados
- [ ] Invoice PDF endpoint con auth
- [ ] Model3D create con auth
- [ ] SECURE_SSL_REDIRECT habilitado
- [ ] HSTS configurado

### Docker
- [ ] Frontend build de producción (no `npm run dev`)
- [ ] Nginx configurado
- [ ] Healthchecks en docker-compose
- [ ] Gunicorn con workers/threads
- [ ] entrypoint.sh con wait-for-db
- [ ] Sin bind mounts en producción
- [ ] Sin `--reload` en producción

### Backend
- [ ] `python manage.py check` sin errores
- [ ] `python manage.py test` pasar
- [ ] `python manage.py collectstatic` funciona
- [ ] Emails se envían correctamente
- [ ] Cloudinary funciona (upload + delete)
- [ ] JWT login/logout/refresh funciona

### Frontend
- [ ] `npm run build` sin errores
- [ ] Todas las rutas funcionan
- [ ] Login/logout funciona
- [ ] Catálogo carga productos
- [ ] Carrito funciona
- [ ] Checkout genera orden
- [ ] Admin panel accesible
- [ ] 3D Editor abre correctamente

### Despliegue
- [ ] Backend desplegado (Render/Railway)
- [ ] Frontend desplegado (Vercel/Netlify)
- [ ] Dominio configurado (opcional)
- [ ] HTTPS funcionando
- [ ] CORS con orígenes de producción
- [ ] Variables de entorno en plataforma
- [ ] DATABASE_URL apunta a Supabase
- [ ] Cloudinary funciona en producción

---

## 15. FUENTES DE INFORMACIÓN

| Archivo | Líneas relevantes |
|---------|-------------------|
| `backend/config/settings.py` | 1-423 (completo) |
| `backend/config/urls.py` | 1-102 |
| `backend/apps/users/models.py` | 1-203 |
| `backend/apps/products/models.py` | 1-300 |
| `backend/apps/orders/api/viewsets.py` | 1-200 |
| `backend/apps/checkout/views.py` | 1-260 |
| `backend/apps/checkout/utils.py` | 1-253 |
| `backend/apps/models3d/api/viewsets.py` | 1-200 |
| `frontend/src/App.jsx` | 1-100 |
| `frontend/src/services/api.js` | 1-414 |
| `frontend/src/components/ProtectedRoute.jsx` | 1-20 |
| `frontend/vite.config.js` | 1-35 |
| `docker-compose.yml` | 1-50 |
| `backend/Dockerfile` | 1-20 |
| `frontend/Dockerfile` | 1-15 |
| `.env` | 1-35 |