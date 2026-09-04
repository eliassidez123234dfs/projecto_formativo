# Capas de Seguridad del Proyecto

## Lo que cubrimos aqui

Vamos a repasar todas las capas de seguridad que tiene este proyecto. No es nada super tecnico, es mas como para que entiendas que esta pasando por detras cuando un usuario usa la pagina.

---

## Primero: De donde viene la seguridad

La seguridad del proyecto esta dividida en **4 grandes zonas**:

```
proyecto_formativo/
├── backend/          ← Aqui esta el grueso de la seguridad (Django)
├── frontend/         ← Protecciones del lado del cliente (React)
├── docker-compose.yml ← Seguridad de infraestructura/contenedores
└── .env / .env.example ← Los secretos (nunca se suben al repositorio)
```

---

## BACKEND

### 1. Variables de entorno (los secretos no se tocan)

Todo lo que es secreto (contraseñas, API keys, la SECRET_KEY de Django) vive en archivos `.env` que **nunca** se suben al repositorio git. Esto lo controla el `.gitignore` que esta en la raiz.

- `backend/.env` → secretos del backend
- `backend/config/.env` → secretos adicionales
- `.env.example` → es como una plantilla que SÍ se sube, para que otros devs sepan que variables necesitan configurar

**Archivo clave:** `.gitignore` (lineas 149-151) excluye `.env`, `.env.*` y solo permite `.env.example`

---

### 2. Autenticacion JWT (como te identificas)

Cuando un usuario hace login, el backend le genera **dos tokens**:

- **Access token** → dura **15 minutos** (el que se usa para hacer peticiones)
- **Refresh token** → dura **7 dias** (el que renueva el access token sin tener que loguearse de nuevo)

Esto esta configurado en `backend/config/settings.py` (lineas 228-243).

El backend tiene su propia clase de autenticacion JWT en `backend/apps/users/api/auth_backend.py` que valida que el usuario exista en la base de datos y este activo **cada vez que se hace una peticion**.

Tambien hay validacion extra en `backend/apps/users/api/token_refresh.py` que al refrescar el token verifica que:
- El usuario no este eliminado
- El usuario este en estado "Activo"

Si cualquiera de esas dos falla, el refresh se rechaza con 401.

---

### 3. Permisos (quien puede hacer que)

El proyecto usa un sistema de permisos por roles:

**Archivo:** `backend/apps/users/api/admin_viewset.py` (lineas 28-37)

- **AdminPermission** → Solo usuarios con rol "Administrador" y estado "Activo" pueden acceder a los endpoints de admin
- **AllowAny** → Endpoints publicos (catalogo, registro, login)
- **IsAuthenticated** → Requiere estar logueado pero no ser admin

Esto se aplica en cada ViewSet. Por ejemplo, en `backend/apps/products/api/viewset.py` (lineas 53-57):
- GET (ver productos) → AllowAny (cualquiera puede ver el catalogo)
- POST/PUT/DELETE (crear/editar/eliminar) → AdminPermission

---

### 4. Rate Limiting (cuantas peticiones puedes hacer)

Para evitar abuso, hay limites de peticiones por IP:

| Tipo | Limite | Archivo |
|------|--------|---------|
| Usuarios anonimos | 1000/hora | `settings.py` linea 215 |
| Usuarios autenticados | 10000/hora | `settings.py` linea 216 |
| Formulario de contacto | 3/hora | `apps/landing/api/viewset.py` linea 20 |
| Errores del frontend | 30/minuto | `apps/monitoring/views.py` linea 12 |

Esto esta en `backend/config/settings.py` (lineas 199-223).

---

### 5. Proteccion de contrasenas

Las contraseñas **nunca** se guardan en texto plano. Se usa `make_password` de Django (algoritmo PBKDF2 por defecto).

**Archivo:** `backend/apps/users/api/serializers.py` (linea 74)

Ademas, las contraseñas deben cumplir reglas estrictas (RN-001):
- Minimo 8 caracteres
- Al menos una mayuscula
- Al menos un numero
- Al menos un caracter especial (!@#$%^&*)

Esto se valida en el serializer de registro (lineas 50-61), en el cambio de contraseña (linea 256), y en la creacion de usuarios por admin (lineas 213-228).

Si un usuario falla el login **5 veces seguidas**, su cuenta se bloquea automaticamente (lineas 112-121). Los admins no se bloquean por seguridad.

---

### 6. Tokens de verificacion

Cuando te registras, te envian un email con un token que **expira en 24 horas** y **solo se puede usar una vez**.

Si recuperas contraseña, ese token **expira en 1 hora**.

Y si intentas reenviar el email de verificacion, maximo puedes hacerlo **3 veces en 24 horas** (lineas 173-182).

Todo esto esta en `backend/apps/users/api/serializers.py`.

---

### 7. Protecciones extra en la logica de negocio

Estas son cosas que protegen la integridad de los datos:

- **No puedes desactivar al ultimo admin** → `admin_viewset.py` (lineas 305-312)
- **No puedes cambiar tu propio rol de admin** → `admin_viewset.py` (lineas 292-302)
- **No puedes extraer mas de 10,000 usuarios de una vez** → `admin_viewset.py` (lineas 122-126)
- **Las ordenes se crean en transacciones atomicas** → `apps/checkout/views.py` (linea 93) - si algo falla, se revierte todo
- **No puedes editar el nombre de un producto si tiene pedidos activos** → `apps/products/api/viewset.py` (lineas 129-133)
- **No puedes eliminar una variante con pedidos activos** → `apps/products/api/viewset.py` (lineas 289-293)
- **Stock se valida antes de crear la orden** → `apps/checkout/views.py` (lineas 104-108)

---

### 8. Auditoria (quien hizo que y cuando)

Cada accion administrativa se registra en un log:

**Archivo:** `backend/apps/users/models.py` (lineas 141-164)

El modelo `Log_Auditoria` guarda:
- Quien ejecuto la accion (el admin)
- A quien le afecto
- Que accion fue
- Datos antes y despues
- La IP del admin
- Timestamp

Esto se registra al: crear usuario, editar usuario, cambiar estado, desbloquear, resetear contraseña, eliminar usuario, y acciones con productos.

---

### 9. Headers de seguridad HTTP

Django tiene middlewares que automaticamente agregan headers de seguridad a cada respuesta:

**Archivo:** `backend/config/settings.py` (lineas 75-85)

- **SecurityMiddleware** → Headers como HSTS, X-Content-Type-Options
- **CsrfViewMiddleware** → Proteccion CSRF en formularios
- **XFrameOptionsMiddleware** → Previene clickjacking (X-Frame-Options: DENY)
- **CorsMiddleware** → Solo permite peticiones desde dominios whitelistados

---

### 10. CORS (que dominios pueden llamar a la API)

**Archivo:** `backend/config/settings.py` (lineas 246-256)

Solo estos origenes pueden hacer peticiones al backend:
- localhost:3000, localhost:5173, localhost:5174 (desarrollo)
- IPs de red local especificas

En produccion, se usan los dominios configurados en `CSRF_TRUSTED_ORIGINS` (lineas 310-318).

---

### 11. Cookies seguras

**Archivo:** `backend/config/settings.py` (lineas 258-268)

En **desarrollo**: SameSite=Lax, Secure=False (para que funcione en localhost)
En **produccion**: SameSite=None, Secure=True (requiere HTTPS, mas restrictivo)

---

### 12. Logging rotativo

**Archivo:** `backend/config/settings.py` (lineas 328-405)

Hay 4 archivos de log separados:
- `app.log` → Logs generales (5MB, 3 backups)
- `errors.log` → Errores HTTP (5MB, 5 backups)
- `requests.log` → Todas las peticiones (5MB, 3 backups)
- `client_errors.log` → Errores del frontend (5MB, 5 backups)

---

## FRONTEND (el otro lado) 🖥️

### 1. Rutas protegidas

**Archivo:** `frontend/src/components/ProtectedRoute.jsx`

Todas las rutas que empiezan con `/admin` estan envueltas en un componente que verifica que el usuario tenga rol "Administrador" en localStorage. Si no lo tiene, lo manda a login.

**Nota:** Esto es una proteccion de interfaz. La proteccion real la da el backend con el JWT.

---

### 2. Manejo de tokens

**Archivo:** `frontend/src/services/api.js`

Hay **3 instancias de axios** separadas:
- `api` → Con JWT y cookies (para admin)
- `publicApi` → Sin credenciales (para catalogo publico)
- `sessionApi` → Solo cookies de sesion (para carrito y checkout)

El interceptor de requests inyecta automaticamente el token en cada peticion. El interceptor de respuestas detecta errores 401 y automaticamente intenta refrescar el token. Si el refresh falla, limpia todo y redirige a login.

---

### 3. Error Boundary

**Archivo:** `frontend/src/components/ErrorBoundary.jsx`

Captura errores de React y muestra un componente amigable en lugar de una pantalla blanca. Tambien envia el error al backend para monitoreo.

---

### 4. Validacion de formularios

**Archivo:** `frontend/src/pages/AuthPage.jsx`

El frontend valida antes de enviar:
- Login: correo con formato valido
- Registro: usuario minimo 3 caracteres, password con reglas, confirmacion de password
- Hay un medidor de fortaleza de contraseña visual

---

### 5. Limpieza de sesion

Al cerrar sesion o al fallar el refresh token, se eliminan **3 cosas** de localStorage:
1. access_token
2. refresh_token
3. usuario

Esto se hace en 3 lugares distintos (Header.jsx, AdminLayout.jsx, api.js) para asegurar la limpieza.

---

### 6. Sin dangerouslySetInnerHTML

No se encontro **ningun** uso de `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval()` ni `Function()` en todo el frontend. React escapa automaticamente el contenido, lo que previene ataques XSS.

---

### 7. Logger sanitizado

**Archivo:** `frontend/src/utils/logger.js`

Los errores se limpian antes de enviarlos al backend: el mensaje se trunca a 300 caracteres, el nombre a 60, y la URL se limpia de query strings.

---

## INFRAESTRUCTURA (Docker) 🐳

### Dockerfile del backend

**Archivo:** `backend/Dockerfile`

- Usa imagen `python:3.12-slim` (minima, menos superficie de ataque)
- Limpia caches de apt despues de instalar dependencias
- Usa **gunicorn** como servidor (no el servidor de desarrollo de Django)
- El `.dockerignore` excluye archivos `.env`, `__pycache__`, `db.sqlite3`, y `node_modules`

### Docker Compose

**Archivo:** `docker-compose.yml`

- Variables de entorno se inyectan desde `.env` (no hardcodeadas)
- Volumenes nombrados para persistir datos de media y static
- El `/app/node_modules` se excluye del bind mount para no sobrescribirlo

---

## RESUMEN RAPIDO (para el video)

Si tuvieras que decirlo en 30 segundos:

> "Tenemos seguridad en 4 niveles: **backend** (Django con JWT, permisos por rol, rate limiting, validacion de passwords, auditoria, transacciones atomicas), **frontend** (rutas protegidas, manejo seguro de tokens, error boundaries, sin XSS), **infraestructura** (Docker con imagenes slim, archivos sensibles excluidos), y **gestion de secretos** (variables de entorno que nunca se suben al repositorio)."

---

## Consejos que te doy a ti mismo (para implementar o mejorar)

### Cosas que faltan y deberias agregar:

1. **Cookies HttpOnly en vez de localStorage para JWT**
   - Ahora los tokens se guardan en localStorage, que es accesible por JavaScript. Si alguien logra inyectar XSS (aunque no encontramos vectores), podria robar los tokens. Lo ideal es usar cookies HttpOnly+Secure+SameSite.

2. **Headers de seguridad HTTP en el frontend**
   - Falta Content-Security-Policy, X-Content-Type-Options, Referrer-Policy. Estos se pueden configurar en Nginx o en el backend.

3. **Dockerfile de produccion para el frontend**
   - Ahora el Dockerfile ejecuta `npm run dev` (servidor de desarrollo). Deberia hacer un build de produccion y servir con Nginx.

4. **Docker containers sin usuario root**
   - Los contenedores corren como root. Deberian usar un usuario no-root con `USER node` o similar.

5. **Healthchecks en docker-compose**
   - Falta definir healthchecks para que Docker sepa si el contenedor esta vivo.

6. **Blacklist de tokens JWT**
   - Esta configurado `BLACKLIST_AFTER_ROTATION: False` en settings. Si lo activas, cada refresh invalidaria el token anterior.

7. **NO commitmentes el `.env` real al repositorio**
   - Aunque el `.gitignore` lo excluye, doble checkea con `git status` antes de hacer push.

8. **SECRET_KEY en produccion**
   - La SECRET_KEY actual tiene prefijo `django-insecure-`. En produccion genera una real con `python -c "import secrets; print(secrets.token_url64(64))"`.

9. **Consolida los archivos .env**
   - Tienes `.env` en la raiz, en `backend/`, en `backend/config/`, en `frontend/`, y en `microservices/Tshirt3D/`. Algunos tienen secretos distintos. Unifica todo en un solo `.env` raiz.

10. **Validacion server-side obligatoria para admin**
    - El ProtectedRoute del frontend es solo para UI. Asegurate de que **cada** endpoint admin valide el JWT y el rol en el backend (que ya lo hace, pero es bueno verificar que no haya endpoints admin sin proteccion).
