# 🏛️ Patrones de Diseño del Software — Proyecto Red Estampación

Este documento compila y explica formalmente la arquitectura y los patrones de diseño (GoF, Arquitectónicos y de Seguridad) implementados en el proyecto formativo, cubriendo las cuatro capas de la aplicación.

---

## 1. Patrones de Seguridad (4 Capas)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CAPA 1: RED (Network)                           │
│  - ContentSecurityPolicyMiddleware (Anti-XSS)                          │
│  - X-Content-Type-Options: nosniff (Anti-MIME Sniffing)                │
│  - Referrer-Policy: strict-origin-when-cross-origin                    │
│  - CORS restringido (Whitelist de orígenes autorizados)                │
│  - RequestIDMiddleware (Header X-Request-ID para trazabilidad)         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                      CAPA 2: SERVIDOR (Server)                         │
│  - SecurityMiddleware Django (HTTPS/HSTS, Secure Cookies)              │
│  - X_FRAME_OPTIONS = 'DENY' (Anti-Clickjacking)                        │
│  - Throttling en DRF (AnonRateThrottle: 1000/h, UserRateThrottle)     │
│  - WhiteNoiseMiddleware (Distribución segura de archivos estáticos)    │
│  - ExceptionLoggingMiddleware (Auditoría y captura de excepciones)     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                    CAPA 3: APLICACIÓN (Application)                    │
│  - Autenticación JWT Stateless (SimpleJWT con token_version)           │
│  - RBAC (Role-Based Access Control) con AdminPermission                │
│  - Prevención BFLA & Mass Assignment (Sin selección de rol en registro)│
│  - Doble factor/confirmación de contraseña en promote_to_admin         │
│  - Validaciones de entrada con Expresiones Regulares (Regex)           │
│  - Política de bloqueo de cuenta tras 5 intentos fallidos              │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│                   CAPA 4: BASE DE DATOS (Database)                     │
│  - ORM Django (Prevención automática de SQL Injection)                 │
│  - Hashing robusto de contraseñas (PBKDF2/bcrypt)                      │
│  - Soft-Delete (eliminado=True para retención y auditoría forense)     │
│  - Log_Auditoria con instantáneas JSON de estados previo/posterior     │
│  - Tokens criptográficos de un solo uso (Token_Verificacion)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Patrones de Diseño Clásicos (GoF) Implementados

### 🔗 Chain of Responsibility (Cadena de Responsabilidad)
* **Dónde**: `backend/apps/users/middleware.py` y `settings.py (MIDDLEWARE)`.
* **Propósito**: Cada middleware procesa la petición de forma secuencial y puede modificarla, rechazarla o transferirla al siguiente eslabón en la cadena antes de que llegue a la vista.

### 🎯 Strategy (Estrategia)
* **Dónde**: 
  - `backend/apps/users/api/admin_viewset.py` (`AdminPermission`).
  - `backend/config/settings.py` (Múltiples motores de BD: SQLite, Neon, PostgreSQL).
* **Propósito**: Permite cambiar algoritmos y comportamientos (por ejemplo, validaciones de permisos o backends de persistencia) sin modificar el código cliente.

### 📦 Repository (Repositorio)
* **Dónde**: `backend/apps/users/models.py` (Django ORM).
* **Propósito**: Desacopla la lógica de negocio de la capa de almacenamiento de datos, permitiendo consultas tipadas y seguras.

### 👁️ Observer (Observador)
* **Dónde**: `backend/apps/users/models.py` (`crear_carrito_para_nuevo_usuario`).
* **Propósito**: Se suscribe a señales del ciclo de vida de los modelos (`post_save`) para ejecutar acciones secundarias (como crear el carrito del usuario) sin acoplar los módulos.

### ⚙️ State Machine (Máquina de Estados)
* **Dónde**: `frontend/src/hooks/usePromiseState.js`.
* **Propósito**: Controla el ciclo de vida asíncrono con estados inmutables `Object.freeze({ IDLE, PENDING, FULFILLED, REJECTED })`, evitando estados inconsistentes en la interfaz de usuario.

---

## 3. Manejo de Promesas y Concurrencia en Frontend

1. **`Promise.all`**: Usado en `AdminDashboard.jsx` para realizar peticiones concurrentes independientes (estadísticas + auditorías) de forma paralela, reduciendo el tiempo de carga total.
2. **`usePromiseState`**: Hook reactivo reutilizable para gestionar el flujo asíncrono de promesas evitando fugas de memoria (`isMounted` ref) y facilitando reintentos.
