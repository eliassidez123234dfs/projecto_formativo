# Páginas de error, logs y monitoría de errores

Este documento cubre tres capas complementarias:

1. **Páginas de error** — lo que ve el usuario cuando algo falla.
2. **Logs** — registro interno para diagnosticar qué pasó.
3. **Monitoría de errores** — alertas automáticas cuando algo se rompe en producción.

---

## 1. Páginas de error

### 1.1 Backend (Django + DRF)

Django activa sus páginas de error propias solo cuando `DEBUG = False`. Con `DEBUG = True`
siempre muestra el traceback completo — **nunca debe quedar así en producción**.

```python
# config/settings.py
DEBUG = False
ALLOWED_HOSTS = ['tu-backend.onrender.com', 'localhost']
```

Como el backend es una API (no sirve HTML al usuario final), lo correcto no son templates
`404.html`/`500.html`, sino que **cualquier error devuelva JSON con una forma consistente**.
Se logra centralizando el manejador de excepciones de DRF:

```python
# apps/core/exceptions.py
from rest_framework.views import exception_handler
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data = {
            'error': True,
            'status_code': response.status_code,
            'message': response.data.get('detail', str(response.data)),
        }
    else:
        # Excepción no controlada (error 500 real, no HTTPException de DRF)
        logger.error(f"Error no controlado: {exc}", exc_info=True)

    return response
```

```python
# config/settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'apps.core.exceptions.custom_exception_handler',
}
```

Resultado para el frontend, sin importar el tipo de error:

```json
{
  "error": true,
  "status_code": 404,
  "message": "No encontrado."
}
```

### 1.2 Frontend (React)

Dos mecanismos distintos, para dos situaciones distintas:

**a) Ruta que no existe (404 de navegación)** — con React Router, una ruta comodín al final:

```jsx
// App.jsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/catalogo" element={<Catalogo />} />
  {/* ...resto de rutas */}
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

**b) Error en tiempo de render (algo se rompe, ej. el visor 3D falla)** — Error Boundary:

```jsx
// components/ErrorBoundary.jsx
import { Component } from 'react';
import * as Sentry from '@sentry/react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    Sentry.captureException(error, { extra: info });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallbackPage onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
```

**Recomendación específica para este proyecto:** envolver el componente del editor 3D con su
propio `ErrorBoundary`, separado del resto de la aplicación. Si Three.js falla (WebGL no
soportado, modelo `.glb` corrupto o no cargado), solo esa sección debe caer — el resto de la
tienda (catálogo, carrito, checkout) debe seguir funcionando con normalidad.

**Diseño de las páginas de error** (`NotFoundPage`, `ErrorFallbackPage`): mensaje en lenguaje
humano, sin tecnicismos ni tracebacks visibles, con un botón de regreso al catálogo o de
reintentar.

---

## 2. Logs

### 2.1 Por qué no usar archivos locales en producción

Render (free tier) usa **disco efímero**: cualquier archivo escrito localmente se pierde en
cada redeploy o cuando el servicio se duerme por inactividad. La práctica correcta en cloud
es loggear a **stdout/stderr** y dejar que la plataforma los capture — Render tiene su propio
visor de logs en el dashboard, sin configuración adicional.

### 2.2 Configuración en Django

```python
# config/settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{asctime} {levelname} {name} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'INFO', 'propagate': False},
        'apps.orders': {'handlers': ['console'], 'level': 'DEBUG', 'propagate': False},
        'apps.models3d': {'handlers': ['console'], 'level': 'DEBUG', 'propagate': False},
        'apps.catalog': {'handlers': ['console'], 'level': 'DEBUG', 'propagate': False},
    },
}
```

Uso en el código de negocio — siempre `logger`, nunca `print()`:

```python
import logging
logger = logging.getLogger(__name__)

def crear_pedido(request):
    try:
        pedido = Pedido.objects.create(...)
        logger.info(f"Pedido {pedido.id} creado por usuario {request.user.id}")
        return pedido
    except Exception as e:
        logger.error(f"Fallo al crear pedido: {e}", exc_info=True)
        raise
```

### 2.3 Logs en desarrollo local

Solo cuando `DEBUG = True`, es válido agregar un `RotatingFileHandler` para tener logs
persistentes en la máquina local de cada integrante, sin que eso se active en producción:

```python
if DEBUG:
    LOGGING['handlers']['file'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': BASE_DIR / 'logs' / 'desarrollo.log',
        'maxBytes': 5 * 1024 * 1024,  # 5 MB
        'backupCount': 3,
        'formatter': 'verbose',
    }
    LOGGING['root']['handlers'].append('file')
```

Agregar `logs/` a `.gitignore` para no versionar esos archivos.

### 2.4 Request ID (trazabilidad entre capas)

Middleware simple que genera un identificador único por petición y lo agrega a cada log de
esa request — útil para seguir el rastro completo de una petición fallida entre
frontend → backend → base de datos:

```python
# apps/core/middleware.py
import uuid
import logging

logger = logging.getLogger(__name__)

class RequestIDMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = str(uuid.uuid4())[:8]
        logger.info(f"[{request.request_id}] {request.method} {request.path}")
        response = self.get_response(request)
        logger.info(f"[{request.request_id}] status={response.status_code}")
        return response
```

---

## 3. Monitoría de errores (alertas en producción)

Los logs sirven para investigar *después* de que alguien reporta un problema; el monitoreo
avisa *en el momento* en que ocurre, sin que nadie tenga que estar revisando logs.

### 3.1 Herramienta: Sentry

Plan gratuito permanente: 5.000 errores/mes, sin tarjeta de crédito. Limitación a tener en
cuenta: el plan Developer (free) es de **1 solo usuario**. Para un equipo de 4, dos opciones:

- Un integrante administra la cuenta de Sentry y comparte los reportes relevantes con el
  resto del equipo (por Discord/Slack/Taiga).
- Auto-hospedar **GlitchTip** (compatible con el SDK de Sentry, sin límite de usuarios) en
  una VM gratuita, si el equipo prefiere no depender de una sola cuenta personal.

### 3.2 Configuración en Django

```bash
pip install --upgrade sentry-sdk
```

```python
# config/settings.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

if not DEBUG:
    sentry_sdk.init(
        dsn=os.environ.get('SENTRY_DSN'),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.2,   # % de requests con tracing de performance, no el 100%
        send_default_pii=False,   # nunca enviar datos personales de usuarios
        environment=os.environ.get('ENVIRONMENT', 'production'),
    )
```

Con esto, cualquier excepción no controlada llega automáticamente a Sentry con el traceback
completo, sin necesidad de instrumentar cada vista manualmente.

### 3.3 Configuración en React

```bash
npm install @sentry/react
```

```jsx
// main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 0.2,
});
```

El `ErrorBoundary` de la sección 1.2 ya envía los errores capturados con
`Sentry.captureException`.

### 3.4 Evitar gastar la cuota gratuita rápido

Filtrar antes de que un evento cuente:

```jsx
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  beforeSend(event, hint) {
    const error = hint.originalException;
    // Ignorar errores de red del propio usuario (wifi, sin conexión)
    if (error?.message?.includes('Failed to fetch')) return null;
    return event;
  },
});
```

### 3.5 Variables de entorno necesarias

| Variable | Dónde | Valor |
|---|---|---|
| `SENTRY_DSN` | Backend (Render) | DSN del proyecto Django creado en sentry.io |
| `VITE_SENTRY_DSN` | Frontend (Vercel) | DSN del proyecto React creado en sentry.io |

---

## 4. Checklist

- [ ] `DEBUG = False` en producción y `ALLOWED_HOSTS` configurado.
- [ ] Manejador de excepciones de DRF devolviendo JSON consistente.
- [ ] Ruta 404 y Error Boundary implementados en React, incluyendo uno específico para el
      editor 3D.
- [ ] Logging configurado con `StreamHandler` a consola (no archivos en producción).
- [ ] Middleware de `request_id` activo para trazabilidad.
- [ ] Sentry recibiendo eventos de prueba desde backend y frontend.
- [ ] Filtro `beforeSend` configurado para no gastar cuota con ruido irrelevante.
