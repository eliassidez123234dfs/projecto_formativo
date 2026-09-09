# Auditoría de Seguridad — Red Estampación

**Fecha:** 2026-09-08  
**Auditor:** opencode (análisis automatizado + revisión manual de código)  
**Stack:** Django 5.2 + DRF + React 19 + Vite 8 + PostgreSQL (Supabase) + Cloudinary + MongoDB  
**Alcance:** Dependencias, código fuente backend/frontend, configuración, endpoints API

---

## Resumen Ejecutivo

| Severidad | Cantidad | Corregidas |
|-----------|----------|------------|
| Crítica   | 6        | 3          |
| Alta      | 8        | 1          |
| Media     | 9        | 3          |
| Baja      | 4        | 0          |
| **Total** | **27**   | **7**      |

### Dependencias con vulnerabilidades conocidas

| Componente | Vulnerabilidades npm/pip | Severidad máxima |
|------------|--------------------------|------------------|
| frontend/ | 12 (1 low, 1 moderate, 10 high) | Alta |
| microservices/Tshirt3D/ | 28 (1 low, 11 moderate, 16 high) | Alta |
| backend/ (pip) | No se pudo ejecutar `pip-audit` (no instalado); paquetes obsoletos detectados | N/A |

> **Nota:** `pip-audit` no estaba instalado en el entorno. Se detectaron 19 paquetes Python con versiones obsoletas mediante `pip list --outdated`. Se recomienda instalar `pip-audit` y ejecutarlo contra ambos `requirements.txt`.

---

## Vulnerabilidades Encontradas

### VULN-001 — Secretos hardcodeados en archivos .env locales

| Campo | Valor |
|-------|-------|
| **ID** | VULN-001 |
| **Severidad** | **Crítica** |
| **Ubicación** | `.env` (raíz), `backend/.env` |
| **Descripción** | Los archivos `.env` contienen credenciales reales en texto plano: SECRET_KEY de Django, contraseña SMTP de Gmail, URL completa de PostgreSQL con contraseña (Supabase), API key y API secret de Cloudinary. Aunque `.gitignore` los excluye, el conflicto de merge sin resolver en `.gitignore` (marcadores `<<<<<<< HEAD`) puede impedir que las reglas de exclusión se apliquen correctamente. |
| **Evidencia** | `.env:6` — `SECRET_KEY=django-insecure-projecto-formativo-dev-key`; `.env:18` — `EMAIL_HOST_PASSWORD=vksyzeknckzzufnf`; `.env:22` — `DATABASE_URL=postgresql://...:0520077e234we1%2524@...`; `.env:27` — `CLOUDINARY_API_SECRET=dQRVQOOKpJ4LRDsiioIzVFdE3uA` |
| **Recomendación** | Resolver el conflicto de merge en `.gitignore`. Rotar todas las credenciales expuestas (SECRET_KEY, contraseña SMTP, contraseña de BD, API secret de Cloudinary). Usar un gestor de secretos (Vault, AWS SSM, variables de entorno del proveedor de hosting). Nunca commitear `.env` con valores reales. |
| **Estado** | Pendiente |

---

### VULN-002 — Credenciales de administrador hardcodeadas en código fuente

| Campo | Valor |
|-------|-------|
| **ID** | VULN-002 |
| **Severidad** | **Crítica** |
| **Ubicación** | `backend/apps/users/management/commands/ensure_admin.py:8-16` |
| **Descripción** | El comando `ensure_admin` contiene un diccionario `ADMIN_DATA` con usuario, correo y contraseña del administrador superuser en texto plano. La contraseña se imprime en stdout en la línea 81. |
| **Evidencia** | `ensure_admin.py:11` — `"contrasena": "RedAdmin_2026_xQ7m_4"`; `ensure_admin.py:81` — `self.stdout.write(f"  Contrasena:  {ADMIN_DATA['contrasena']}")` |
| **Recomendación** | Eliminar las credenciales del código fuente. Usar variables de entorno o un archivo de configuración separado que no se versione. Nunca imprimir contraseñas en stdout. |
| **Estado** | **Corregido** — Credenciales migradas a variables de entorno (ADMIN_USUARIO, ADMIN_CORREO, ADMIN_PASSWORD). Ya no se imprimen contraseñas en stdout. |

---

### VULN-003 — Contraseñas de usuarios de prueba hardcodeadas

| Campo | Valor |
|-------|-------|
| **ID** | VULN-003 |
| **Severidad** | **Crítica** |
| **Ubicación** | `backend/apps/users/management/commands/seed_users.py:7-57` |
| **Descripción** | El comando `seed_users` contiene 6 usuarios con contraseñas hardcodeadas en texto plano, incluyendo un superuser con contraseña `Admin123!`. Las credenciales se imprimen en stdout al ejecutar el comando. |
| **Evidencia** | Línea 11: `"contrasena": "Admin123!"` (superuser); Líneas 20-56: contraseñas `Cliente1!` a `Cliente5!` |
| **Recomendación** | Eliminar contraseñas del código. Generar contraseñas aleatorias y mostrarlas una sola vez, o usar variables de entorno. Asegurar que estos comandos solo se ejecuten en entornos de desarrollo. |
| **Estado** | **Corregido** — Contraseñas generadas aleatoriamente con `secrets` (función `_generar_contrasena()`). Solo se imprimen una vez al crear el usuario. |

---

### VULN-004 — SSRF (Server-Side Request Forgery) en endpoints de vinculación de diseño

| Campo | Valor |
|-------|-------|
| **ID** | VULN-004 |
| **Severidad** | **Crítica** |
| **Ubicación** | `backend/config/urls.py:324`, `backend/apps/products/api/viewset.py:473` |
| **Descripción** | Dos endpoints aceptan una URL arbitraria del request body (`cloudinary_url`) y realizan un HTTP GET a esa URL sin validación del dominio. Ambos endpoints son `@csrf_exempt` con permiso `AllowAny` (sin autenticación). Un atacante puede pasar cualquier URL (incluyendo servicios internos como `http://169.254.169.254/` para metadata de AWS, bases de datos internas, etc.) y el servidor la descargará. |
| **Evidencia** | `urls.py:324` — `img_response = http_requests.get(cloudinary_url, timeout=15)` dentro de `editor_session_link_design` (AllowAny, csrf_exempt); `viewset.py:473` — `img_response = http_requests.get(cloudinary_url, timeout=15)` dentro de `link_design_to_product` (AllowAny, csrf_exempt) |
| **Recomendación** | Implementar allowlist de dominios permitidos (solo `res.cloudinary.com`). Rechazar URLs que no pertenezcan a dominios conocidos. Autenticar estos endpoints. Considerar usar un proxy de descarga de imágenes que valide el contenido. |
| **Estado** | Pendiente |

---

### VULN-005 — Checkout sin autenticación permite agotar stock

| Campo | Valor |
|-------|-------|
| **ID** | VULN-005 |
| **Severidad** | **Crítica** |
| **Ubicación** | `backend/apps/checkout/views.py:86-200` |
| **Descripción** | El endpoint `checkout_confirm` usa `@permission_classes([AllowAny])` y permite a cualquier usuario no autenticado crear órdenes, disminuir stock de productos y generar URLs de descarga de facturas. Un atacante puede sistemáticamente reducir el stock de cualquier producto a cero sin autenticarse. |
| **Evidencia** | `views.py:88` — `@permission_classes([AllowAny])`; `views.py:178` — `item.variant.stock -= item.quantity`; `views.py:196` — genera `download_pdf_url` con firma TimestampSigner |
| **Recomendación** | Requerir autenticación (JWT o session) para confirmar checkout. Implementar rate limiting agresivo en este endpoint. Considerar validación adicional de stock antes de la transacción. |
| **Estado** | Pendiente |

---

### VULN-006 — Secretos impresos en logs y stdout

| Campo | Valor |
|-------|-------|
| **ID** | VULN-006 |
| **Severidad** | **Crítica** |
| **Ubicación** | `backend/apps/users/management/commands/ensure_admin.py:81`, `backend/apps/users/api/viewset.py:184` |
| **Descripción** | Múltiples puntos del sistema imprimen secretos en texto plano: el comando `ensure_admin` imprime la contraseña del admin en stdout, y el viewset de usuarios logea el enlace completo de verificación (que contiene el token secreto) en texto plano. |
| **Evidencia** | `ensure_admin.py:81` — `self.stdout.write(f"  Contrasena:  {ADMIN_DATA['contrasena']}")`; `viewset.py:184` — `logger.info('Enlace de verificación para %s: %s', usuario.correo, enlace)` |
| **Recomendación** | Nunca imprimir contraseñas en logs o stdout. Redactar tokens en logs (mostrar solo los últimos 4 caracteres). Usar logging estructurado con redacción automática de secretos. |
| **Estado** | **Corregido** — `ensure_admin.py` ya no imprime contraseñas. `viewset.py:179` ahora logea solo el ID del usuario (`logger.info('Enlace de verificación enviado para usuario %s', usuario.id)`) sin el enlace completo. |

---

### VULN-007 — Webhook de Wompi con secret por defecto vacío

| Campo | Valor |
|-------|-------|
| **ID** | VULN-007 |
| **Severidad** | **Alta** |
| **Ubicación** | `backend/config/settings.py:679`, `backend/apps/checkout/wompi.py:168-169` |
| **Descripción** | `WOMPI_WEBHOOK_SECRET` tiene valor por defecto vacío (`''`). Si la variable de entorno no está configurada, la verificación de firma HMAC del webhook usa un secret vacío, lo que permite a un atacante forjar notificaciones de pago y marcar órdenes como pagadas. |
| **Evidencia** | `settings.py:679` — `WOMPI_WEBHOOK_SECRET = env('WOMPI_WEBHOOK_SECRET', default='')`; `wompi.py:168` — `secret = settings.WOMPI_WEBHOOK_SECRET.encode('utf-8')` |
| **Recomendación** | Hacer que `WOMPI_WEBHOOK_SECRET` sea obligatorio en producción (lanzar error si está vacío). Nunca usar secrets vacíos como valor por defecto para componentes de seguridad. |
| **Estado** | Pendiente |

---

### VULN-008 — Uso excesivo de @csrf_exempt en endpoints que modifican datos

| Campo | Valor |
|-------|-------|
| **ID** | VULN-008 |
| **Severidad** | **Alta** |
| **Ubicación** | `backend/config/urls.py:88,198,281`, `backend/apps/products/api/viewset.py:445` |
| **Descripción** | Cuatro endpoints POST que modifican datos (crear items de carrito, vincular imágenes a productos) tienen `@csrf_exempt` deshabilitando la protección CSRF. Tres de ellos además usan `AllowAny` (sin autenticación), lo que los hace vulnerables a ataques CSRF donde un sitio malicioso puede realizar acciones en nombre de un usuario. |
| **Evidencia** | `urls.py:88` — `editor_session_save` (csrf_exempt + IsAuthenticated); `urls.py:198` — `editor_session_commit` (csrf_exempt + AllowAny); `urls.py:281` — `editor_session_link_design` (csrf_exempt + AllowAny); `viewset.py:445` — `link_design_to_product` (csrf_exempt + AllowAny) |
| **Recomendación** | Eliminar `@csrf_exempt` y usar la protección CSRF nativa de DRF. Para endpoints que usan JWT, configurar DRF para que accepte el header `Authorization` en lugar de depender de cookies de sesión (lo que eliminaría la necesidad de csrf_exempt). Autenticar todos los endpoints que modifican datos. |
| **Estado** | Pendiente |

---

### VULN-009 — Excepciones filtran detalles internos al cliente

| Campo | Valor |
|-------|-------|
| **ID** | VULN-009 |
| **Severidad** | **Alta** |
| **Ubicación** | `backend/apps/users/error_handler.py:77-78,136-137` |
| **Descripción** | El manejador de excepciones personalizado retorna al cliente el nombre de la clase de excepción (`type(exc).__name__`) y el mensaje crudo de la excepción (`str(exc)`). Para errores no controlados, esto puede exponer mensajes de base de datos, rutas del sistema, nombres de tablas y otra información sensible. |
| **Evidencia** | `error_handler.py:77` — `'exception': type(exc).__name__`; `error_handler.py:78` — `'message': str(exc) or 'Error interno del servidor'`; `error_handler.py:136` — `'message': str(exc)` |
| **Recomendación** | En producción, no retornar el nombre de la excepción ni el mensaje crudo al cliente. Usar mensajes genéricos para errores 500. Loggear los detalles completos internamente. |
| **Estado** | **Corregido** — Manejador reescrito: errores no controlados retornan `APP-500` con mensaje genérico ("Error interno del servidor"). Solo errores controlados (`BaseAppException`) devuelven detalles. Loggea con nivel CRITICAL y traceback completo. |

---

### VULN-010 — Refresh token almacenado en localStorage

| Campo | Valor |
|-------|-------|
| **ID** | VULN-010 |
| **Severidad** | **Alta** |
| **Ubicación** | `frontend/src/services/authService.js:108-109` |
| **Descripción** | El refresh token se almacena tanto en `localStorage` como en `sessionStorage`. Ambos son accesibles por JavaScript, lo que significa que cualquier vulnerabilidad XSS podría permitir el robo del refresh token. El token de acceso se mantiene correctamente solo en memoria (buena práctica), pero el refresh token en localStorage anula parcialmente esa protección. |
| **Evidencia** | `authService.js:108` — `writeLS(LS_REFRESH, refresh)`; `authService.js:109` — `sessionStorage.setItem('refresh_token', refresh)` |
| **Recomendación** | Almacenar el refresh token en una cookie `httpOnly` `Secure` `SameSite=Strict` configurada por el servidor. Esto impide que JavaScript acceda al token, cerrando la vectoría de robo por XSS. |
| **Estado** | Pendiente |

---

### VULN-011 — Token de acceso enviado como parámetro de URL

| Campo | Valor |
|-------|-------|
| **ID** | VULN-011 |
| **Severidad** | **Alta** |
| **Ubicación** | `frontend/src/services/api.js:175`, `backend/apps/checkout/views.py:196` |
| **Descripción** | El token de acceso JWT se envía como parámetro de query string (`?access=...`) para la descarga de facturas PDF. Los parámetros de URL quedan en el historial del navegador, logs del servidor, headers `Referer`, y pueden ser capturados por proxies intermedios. |
| **Evidencia** | `api.js:175` — `params: accessToken ? { access: accessToken } : undefined`; `views.py:196` — `f'/api/checkout/orders/{order.id}/invoice-pdf/?access={invoice_signer.sign(order.id)}'` |
| **Recomendación** | Enviar tokens de autenticación en el header `Authorization` en lugar de parámetros de URL. Si es necesario usar query params (para descargas directas), usar tokens de corta vida y de un solo uso. |
| **Estado** | Pendiente |

---

### VULN-012 — Enumeración de usuarios mediante respuestas de error

| Campo | Valor |
|-------|-------|
| **ID** | VULN-012 |
| **Severidad** | **Alta** |
| **Ubicación** | `backend/apps/users/api/viewset.py:91,120,150` |
| **Descripción** | Múltiples endpoints de autenticación revelan si un correo electrónico está registrado mediante mensajes de error diferentes. El endpoint `recuperar_password` lanza `Usuario.DoesNotExist` sin catch, y el serializer genera mensajes distintos para usuarios existentes vs. no existentes. Esto permite a un atacante enumerar correos electrónicos registrados. |
| **Evidencia** | `viewset.py:91` — `Usuario.objects.get(correo=...)` sin try/except en `reenviar_verificacion`; `viewset.py:120` — misma situación en `recuperar_password` |
| **Recomendación** | Usar mensajes de error idénticos independientemente de si el usuario existe o no (ej: "Si el correo está registrado, recibirás un enlace"). Capturar `DoesNotExist` y retornar siempre la misma respuesta. |
| **Estado** | Pendiente |

---

### VULN-013 — CSP apunta al dominio sandbox de Wompi

| Campo | Valor |
|-------|-------|
| **ID** | VULN-013 |
| **Severidad** | **Media** |
| **Ubicación** | `backend/apps/users/middleware.py:117` |
| **Descripción** | La directiva `form-action` del Content-Security-Policy está hardcodeada al dominio sandbox de Wompi (`https://sandbox.wompi.co`). En producción, esto bloquearía los envíos de formularios a la pasarela de pagos real, o forzaría un cambio manual que podría ser olvidado. |
| **Evidencia** | `middleware.py:117` — `"form-action 'self' https://sandbox.wompi.co; "` |
| **Recomendación** | Hacer que el dominio de CSP sea configurable via variable de entorno. Usar `https://checkout.wompi.co` en producción y `https://sandbox.wompi.co` en desarrollo. |
| **Estado** | Pendiente |

---

### VULN-014 — CSP permite 'unsafe-inline' para estilos

| Campo | Valor |
|-------|-------|
| **ID** | VULN-014 |
| **Severidad** | **Media** |
| **Ubicación** | `backend/apps/users/middleware.py:110` |
| **Descripción** | La directiva `style-src` incluye `'unsafe-inline'`, lo que permite inyección de CSS que podría usarse para exfiltración de datos via ataques CSS (CSS injection/data exfiltration). |
| **Evidencia** | `middleware.py:110` — `"style-src 'self' 'unsafe-inline'; "` |
| **Recomendación** | Eliminar `'unsafe-inline'` y usar nonce-based o hash-based CSP para estilos. Si no es posible, al menos usar `'unsafe-hashes'` con hashes de los estilos inline específicos. |
| **Estado** | Pendiente |

---

### VULN-015 — Falta CSRF_COOKIE_HTTPONLY

| Campo | Valor |
|-------|-------|
| **ID** | VULN-015 |
| **Severidad** | **Media** |
| **Ubicación** | `backend/config/settings.py` |
| **Descripción** | `SESSION_COOKIE_HTTPONLY = True` está configurado, pero `CSRF_COOKIE_HTTPONLY` no se establece. Sin esta configuración, JavaScript puede leer la cookie CSRF, lo que podría facilitar ataques de bypass CSRF en escenarios específicos. |
| **Evidencia** | `settings.py:548` — `SESSION_COOKIE_HTTPONLY = True`; ausencia de `CSRF_COOKIE_HTTPONLY` |
| **Recomendación** | Agregar `CSRF_COOKIE_HTTPONLY = True` en settings.py para prevenir que JavaScript lea la cookie CSRF. |
| **Estado** | Pendiente |

---

### VULN-016 — Refresh token no se invalida en logout

| Campo | Valor |
|-------|-------|
| **ID** | VULN-016 |
| **Severidad** | **Media** |
| **Ubicación** | `backend/apps/users/api/viewset.py:274-280` |
| **Descripción** | El endpoint `logout` solo cicla la clave de sesión Django pero no agrega el refresh token a la blacklist de SimpleJWT. Un atacante que haya robado un refresh token puede seguir obteniendo nuevos access tokens después de que el usuario cierre sesión. |
| **Evidencia** | `viewset.py:274-280` — el método `logout` ejecuta `request.session.cycle_key()` pero no hace blacklist del refresh token |
| **Recomendación** | Extraer el refresh token del request, encontrarlo en la blacklist de SimpleJWT y agregarlo. Usar `RefreshToken(token).blacklist()` de SimpleJWT. |
| **Estado** | **Corregido** — `viewset.py:270-288` ahora extrae el refresh token del request body, busca el `OutstandingToken` por `jti` y lo blacklisteia con `BlacklistedToken.objects.get_or_create()`. |

---

### VULN-017 — Bypass de bloqueo de cuenta para administradores

| Campo | Valor |
|-------|-------|
| **ID** | VULN-017 |
| **Severidad** | **Media** |
| **Ubicación** | `backend/apps/users/api/serializers.py:113-120` |
| **Descripción** | La lógica de bloqueo de cuenta por intentos fallidos excluye explícitamente a los administradores (`if usuario.rol != 'Administrador'`). Un atacante que conozca el email de un admin puede realizar fuerza bruta indefinidamente sin que la cuenta se bloquee. |
| **Evidencia** | `serializers.py:114` — `if usuario.rol != 'Administrador':` antes de incrementar `intentos_fallidos` |
| **Recomendación** | Aplicar el mecanismo de bloqueo a TODOS los usuarios, incluyendo administradores. Implementar rate limiting por IP adicional al bloqueo de cuenta. |
| **Estado** | **Corregido** — `serializers.py:114` ahora dice "Incrementar intentos fallidos (RN-010) — aplica a TODOS los usuarios". La excluseon de admin fue eliminada. |

---

### VULN-018 — Auth solo del lado del cliente en ProtectedRoute

| Campo | Valor |
|-------|-------|
| **ID** | VULN-018 |
| **Severidad** | **Media** |
| **Ubicación** | `frontend/src/components/ProtectedRoute.jsx:5-7` |
| **Descripción** | El componente `ProtectedRoute` verifica el rol del usuario leyendo de `localStorage`. Un atacante puede modificar el valor de `usuario` en localStorage para establecer `rol: 'Administrador'` y acceder a las rutas de administración en el frontend. Aunque la autorización real debe ser server-side, esto representa una debilidad de defense-in-depth. |
| **Evidencia** | `ProtectedRoute.jsx:5` — `const usuario = getCurrentUser()` (lee de localStorage); `ProtectedRoute.jsx:7` — `usuario.rol !== 'Administrador'` |
| **Recomendación** | Asegurar que todos los endpoints de admin en el backend verifiquen el rol del usuario. En el frontend, validar el token JWT contra el servidor antes de renderizar rutas protegidas. |
| **Estado** | Pendiente |

---

### VULN-019 — .gitignore con conflictos de merge sin resolver

| Campo | Valor |
|-------|-------|
| **ID** | VULN-019 |
| **Severidad** | **Media** |
| **Ubicación** | `.gitignore` (raíz del proyecto) |
| **Descripción** | El archivo `.gitignore` contiene marcadores de conflicto de merge sin resolver (`<<<<<<< HEAD`, `=======`, `>>>>>>> origin/main`). Esto puede causar que las reglas de exclusión de archivos sensibles (`.env`, `*.key`, etc.) no se apliquen correctamente, permitiendo que secretos se commiteen al repositorio. |
| **Evidencia** | `.gitignore:2` — `<<<<<<< HEAD`; `.gitignore:9` — `=======`; `.gitignore:20` — `>>>>>>> origin/main` (múltiples conflictos similares en todo el archivo) |
| **Recomendación** | Resolver todos los conflictos de merge en `.gitignore`. Verificar que las reglas de exclusión de `.env` y archivos sensibles estén activas. Ejecutar `git status` para asegurar que no hay archivos sensibles trackeados. |
| **Estado** | **Corregido** — Todos los conflictos de merge resueltos. `.gitignore` unificado con reglas completas para Python, Node, Docker, IDEs y archivos sensibles. |

---

### VULN-020 — Dependencias frontend con vulnerabilidades conocidas (npm audit)

| Campo | Valor |
|-------|-------|
| **ID** | VULN-020 |
| **Severidad** | **Alta** |
| **Ubicación** | `frontend/package-lock.json` |
| **Descripción** | `npm audit` reporta 12 vulnerabilidades en dependencias del frontend, incluyendo: axios (Prototype pollution, DoS), react-router (DoS, CSRF, XSS, open redirect), vite (NTLM hash disclosure), postcss (path traversal), browserslist (DoS por memoria), brace-expansion (DoS). Todas tienen parche disponible via `npm audit fix`. |
| **Evidencia** | Salida de `npm audit`: axios 1.0.0-1.17.0 (10 advisories, severity high), react-router 6.0.0-7.18.1 (7 advisories, severity high), vite 8.0.0-8.0.15 (2 advisories, severity high) |
| **Recomendación** | Ejecutar `npm audit fix` para actualizar todas las dependencias a versiones parcheadas. Considerar ejecutar `npm audit fix --force` para cambios de breaking change si es necesario. |
| **Estado** | Pendiente |

---

### VULN-021 — Dependencias microservicio con vulnerabilidades conocidas (npm audit)

| Campo | Valor |
|-------|-------|
| **ID** | VULN-021 |
| **Severidad** | **Alta** |
| **Ubicación** | `microservices/Tshirt3D/package-lock.json` |
| **Descripción** | `npm audit` reporta 28 vulnerabilidades en el microservicio Tshirt3D, incluyendo: lodash (Prototype Pollution, Code Injection), postcss (XSS, path traversal), rollup (DOM Clobbering XSS, Arbitrary File Write), js-yaml (Prototype Pollution, DoS), minimatch (ReDoS), cross-spawn (ReDoS), braces (DoS). Todas tienen parche disponible. |
| **Evidencia** | Salida de `npm audit`: lodash <=4.17.23 (3 advisories, severity high), postcss <=8.5.22 (5 advisories, severity high), rollup 3.0.0-3.29.5 (2 advisories, severity high) |
| **Recomendación** | Ejecutar `npm audit fix` en `microservices/Tshirt3D/`. Actualizar Three.js y dependencias de React Three. |
| **Estado** | Pendiente |

---

### VULN-022 — Paquetes Python desactualizados

| Campo | Valor |
|-------|-------|
| **ID** | VULN-022 |
| **Severidad** | **Media** |
| **Ubicación** | `backend/requirements.txt` |
| **Descripción** | `pip list --outdated` reporta 19 paquetes con versiones obsoletas, incluyendo Django (5.2.13 → 6.1.1), Pillow (12.1.1 → 12.3.0), Celery (5.4.0 → 5.6.3), PyJWT (2.12.1 → 2.13.0). Las actualizaciones de Django y Pillow pueden contener parches de seguridad. |
| **Evidencia** | Salida de `pip list --outdated`: Django 5.2.13 (Latest: 6.1.1), Pillow 12.1.1 (Latest: 12.3.0), PyJWT 2.12.1 (Latest: 2.13.0) |
| **Recomendación** | Instalar `pip-audit` y ejecutar contra `requirements.txt` para identificar CVEs específicos. Actualizar paquetes críticos (Django, Pillow, PyJWT) priorizando parches de seguridad. |
| **Estado** | Pendiente |

---

### VULN-023 — SQL string-interpolation en management command

| Campo | Valor |
|-------|-------|
| **ID** | VULN-023 |
| **Severidad** | **Baja** |
| **Ubicación** | `backend/apps/users/management/commands/fix_db.py:101-116` |
| **Descripción** | El management command `fix_db` construye sentencias SQL usando f-strings (`f'ALTER TABLE {table_name} ADD COLUMN...'`) y las ejecuta sin parametrización. Aunque los valores provienen de metadatos internos de Django (no de input de usuario directo), un campo con default conteniendo comillas simples podría generar SQL inyectable. |
| **Evidencia** | `fix_db.py:114` — `alter = f'ALTER TABLE {table_name} ADD COLUMN {col_name} {sql_type} {nullable}'`; `fix_db.py:116` — `cursor.execute(alter)` |
| **Recomendación** | Usar `cursor.execute()` con parámetros parametrizados en lugar de f-strings. Aunque es un management command (no expuesto web), seguir buenas prácticas reduce riesgo de regressión. |
| **Estado** | Pendiente |

---

### VULN-024 — DEBUG=True en archivos .env

| Campo | Valor |
|-------|-------|
| **ID** | VULN-024 |
| **Severidad** | **Baja** |
| **Ubicación** | `.env:7`, `backend/.env:7` |
| **Descripción** | Los archivos `.env` tienen `DEBUG=True`. Si estos archivos se usan en producción (o si el valor se hereda), Django mostrará trazas de error completas, configuración del sistema y queries SQL a los usuarios finales. |
| **Evidencia** | `.env:7` — `DEBUG=True` |
| **Recomendación** | Asegurar que `.env` de producción tenga `DEBUG=False`. Usar archivos de configuración separados por entorno. En settings.py, el default de DEBUG ya depende de `ENVIRONMENT`, pero la variable en `.env` lo sobreescribe. |
| **Estado** | Pendiente |

---

### VULN-025 — console.error filtra detalles en frontend

| Campo | Valor |
|-------|-------|
| **ID** | VULN-025 |
| **Severidad** | **Baja** |
| **Ubicación** | `frontend/src/context/CartContext.jsx:19,106`, `frontend/src/pages/CheckoutPage.jsx:51,164` |
| **Descripción** | Múltiples archivos usan `console.error()` para loggear errores de API en producción. Estos mensajes son visibles en DevTools y pueden contener detalles de la API (endpoints, mensajes de error del servidor, stack traces del frontend). |
| **Evidencia** | `CartContext.jsx:19` — `console.error('Error loading cart:', err)`; `CheckoutPage.jsx:51` — `console.error('Error fetching cart:', err)` |
| **Recomendación** | Usar un logger condicional que solo loggee en modo desarrollo (ej: `if (import.meta.env.DEV) console.error(...)`). En producción, enviar errores a un servicio de monitoreo (Sentry, LogRocket). |
| **Estado** | Pendiente |

---

### VULN-026 — Datos personales (PII) en localStorage

| Campo | Valor |
|-------|-------|
| **ID** | VULN-026 |
| **Severidad** | **Baja** |
| **Ubicación** | `frontend/src/services/authService.js:111` |
| **Descripción** | Los datos del perfil de usuario (nombre, correo, rol) se almacenan en `localStorage` como JSON. Aunque no son credenciales, son datos personales (PII) accesibles por cualquier script que se ejecute en la página. |
| **Evidencia** | `authService.js:111` — `writeLS(LS_USER, JSON.stringify(usuario))` |
| **Recomendación** | Almacenar solo el mínimo necesario en localStorage (rol para UI). Para datos sensibles, obtenerlos del servidor bajo demanda o usar httpOnly cookies. |
| **Estado** | Pendiente |

---

### VULN-027 — Falta de validación de password en formulario de cambio de contraseña

| Campo | Valor |
|-------|-------|
| **ID** | VULN-027 |
| **Severidad** | **Baja** |
| **Ubicación** | `frontend/src/pages/Password.jsx:98-128` |
| **Descripción** | El componente `NuevaPassword` no valida la fortaleza de la contraseña en el lado del cliente antes de enviarla al servidor. Solo usa `minLength={8}` como atributo HTML (bypassable). La validación completa existe en el backend, pero la UX de usuario podría mejorar. |
| **Evidencia** | `Password.jsx` — solo validación de coincidencia de contraseñas, sin validación de mayúsculas/números/caracteres especiales en el cliente |
| **Recomendación** | Reutilizar la lógica de validación de contraseña del componente `AuthPage.jsx` (que sí tiene indicador de fortaleza) en el formulario de cambio de contraseña. |
| **Estado** | Pendiente |

---

## Prácticas de Seguridad Positivas Detectadas

1. **Sin `dangerouslySetInnerHTML` ni `innerHTML`** en todo el frontend — previene XSS反射性
2. **Access token almacenado solo en memoria** (`authService.js:33`) — buena práctica OWASP
3. **JWT con rotación y blacklist** configurados en SimpleJWT
4. **Rate limiting** implementado en DRF (`DEFAULT_THROTTLE_RATES`)
5. **CSP header** implementado via middleware personalizado
6. **HSTS configurado** para producción
7. **Validadores de contraseña** de Django habilitados
8. **Formularios React con componentes controlados** — previene inyección de input
9. **`noopener,noreferrer`** usado correctamente en `window.open()`
10. **Logging estructurado** con request ID para trazabilidad
11. **Validación de firma HMAC** en webhook de Wompi (aunque con secret vacío por defecto)
12. **Tokens de verificación de email con expiración** y marca de uso

---

## Plan de Acción Recomendado (por prioridad)

### Inmediato (esta semana)
1. ~~Resolver conflictos de merge en `.gitignore` (VULN-019)~~ ✅
2. Rotar TODAS las credenciales expuestas en `.env` (VULN-001)
3. Ejecutar `npm audit fix` en frontend y microservicio (VULN-020, VULN-021)
4. ~~Eliminar credenciales hardcodeadas de `ensure_admin.py` y `seed_users.py` (VULN-002, VULN-003)~~ ✅

### Corto plazo (2 semanas)
5. Implementar allowlist de dominios en endpoints SSRF (VULN-004)
6. Requerir autenticación en checkout (VULN-005)
7. Hacer `WOMPI_WEBHOOK_SECRET` obligatorio en producción (VULN-007)
8. Eliminar `@csrf_exempt` de endpoints que modifican datos (VULN-008)
9. ~~Redactar información sensible en logs (VULN-006)~~ ✅

### Mediano plazo (1 mes)
10. Mover refresh token a cookie httpOnly (VULN-010)
11. Corregir enumeración de usuarios (VULN-012)
12. Actualizar dependencias Python (VULN-022)
13. ~~Implementar invalidación de refresh token en logout (VULN-016)~~ ✅
14. Configurar CSP de forma dinámica (VULN-013, VULN-014)

---

*Reporte generado por auditoría automatizada + revisión manual. Se recomienda una auditoría adicional con herramientas especializadas (Snyk, SonarQube, OWASP ZAP) para validación completa.*
