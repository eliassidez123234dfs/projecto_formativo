# Mapa del aplicativo RED

> Guía rápida para ubicar cada responsabilidad del sistema y seguir una petición desde la interfaz hasta la base de datos.

## 1. Vista general

RED es una plataforma de comercio electrónico para prendas personalizables. Está organizada en tres aplicaciones ejecutables:

```text
Frontend React/Vite :5173
        |
        | REST + JWT + cookie de sesión
        v
Backend Django/DRF :8000 ---- PostgreSQL/SQLite
        |                     MongoDB Atlas
        |                     Cloudinary
        |                     Wompi Sandbox
        v
Editor 3D React/Three.js :5174
```

- `frontend/`: catálogo, autenticación, carrito, checkout y panel administrativo.
- `backend/`: reglas de negocio, API, autenticación, stock, órdenes y facturas.
- `microservices/Tshirt3D/`: editor 3D independiente que recibe un handoff firmado del backend.
- `docs/`: documentación funcional, técnica, pruebas y despliegue.

## 2. Dónde está cada cosa

### Backend Django

| Responsabilidad | Ubicación real |
|---|---|
| Configuración, base de datos, CORS y JWT | `backend/config/settings.py` |
| Rutas raíz y endpoints manuales | `backend/config/urls.py` |
| Arranque WSGI/ASGI | `backend/config/wsgi.py`, `backend/config/asgi.py` |
| Usuarios, login, registro y recuperación | `backend/apps/users/` |
| Productos, imágenes y variantes | `backend/apps/products/` |
| Catálogo, filtros y paginación | `backend/apps/catalog/` |
| Carrito por sesión/usuario | `backend/apps/carts/` |
| Checkout, stock y factura PDF | `backend/apps/checkout/` |
| Órdenes y estados de pedido | `backend/apps/orders/` |
| Modelos 3D y recursos Cloudinary | `backend/apps/models3d/` |
| Contacto | `backend/apps/landing/` |
| Logs de errores del frontend | `backend/apps/monitoring/` |
| Migraciones | `backend/apps/*/migrations/` |
| Comandos de carga y semillas | `backend/apps/*/management/commands/` |

Cada app de negocio suele separar:

```text
models.py       Entidades y reglas de dominio
api/serializers.py  Validación y transformación JSON
api/viewset.py      Operaciones REST y permisos
api/urls.py         Rutas del módulo
admin.py            Panel Django
tests.py            Pruebas del módulo
migrations/         Evolución del esquema
```

### Frontend principal

| Responsabilidad | Ubicación real |
|---|---|
| Enrutamiento de páginas | `frontend/src/App.jsx` |
| Punto de entrada y restauración de sesión | `frontend/src/main.jsx` |
| Login, registro y recuperación | `frontend/src/pages/AuthPage.jsx`, `Email.jsx`, `Password.jsx` |
| Catálogo y paginación | `frontend/src/pages/Catalog.jsx` |
| Ficha de producto y variantes | `frontend/src/pages/ProductDetail.jsx` |
| Carrito visual | `frontend/src/pages/Cart.jsx` |
| Estado global del carrito | `frontend/src/context/CartContext.jsx` |
| Checkout y factura | `frontend/src/pages/CheckoutPage.jsx` |
| Cliente HTTP y refresh JWT | `frontend/src/services/api.js` |
| Estado de autenticación | `frontend/src/services/authService.js` |
| Rutas administrativas | `frontend/src/pages/Admin*.jsx` |
| Protección de rutas de interfaz | `frontend/src/components/ProtectedRoute.jsx` |
| Captura y apertura del editor | `frontend/src/utils/editor3d.js` |
| Estilos globales y por pantalla | `frontend/src/styles/` |

El frontend usa tres clientes Axios:

- `api`: endpoints que requieren JWT.
- `publicApi`: catálogo y recursos públicos.
- `sessionApi`: carrito y checkout; también adjunta JWT cuando existe y conserva `withCredentials`.

### Editor 3D

| Responsabilidad | Ubicación real |
|---|---|
| Aplicación raíz | `microservices/Tshirt3D/src/App.jsx` |
| Estado del editor | `microservices/Tshirt3D/src/store/index.js` |
| Canvas Three.js | `microservices/Tshirt3D/src/canvas/` |
| Guardado y captura | `microservices/Tshirt3D/src/pages/Customizer.jsx` |
| API, Cloudinary y commit al carrito | `microservices/Tshirt3D/src/config/helpers.js` |
| Variables del editor | `microservices/Tshirt3D/.env` |

El flujo usa un token firmado temporal de handoff para no depender de compartir la cookie entre los puertos `5173` y `5174`.

## 3. Flujo de catálogo a carrito

```text
Catalog.jsx
  -> GET /api/catalog/?page=1
  -> ProductCard.jsx
  -> ProductDetail.jsx
  -> variante + cantidad
  -> POST /api/cart/add/
  -> CartContext actualiza el carrito
```

El backend valida en `apps/carts/api/viewset.py`:

- producto activo y aprobado;
- variante perteneciente al producto;
- cantidad mínima y máxima;
- stock disponible;
- identidad del carrito por JWT y/o sesión.

## 4. Flujo del editor 3D

```text
ProductDetail.jsx
  -> openEditor()
  -> POST /api/editor-session/save/
  -> backend valida producto, variante, cantidad y stock
  -> devuelve sessionToken firmado
  -> abre http://127.0.0.1:5174/?sessionToken=...
  -> editor GET /api/editor-session/?sessionToken=...
  -> captura canvas y sube preview a Cloudinary
  -> POST /api/editor-session/commit/
  -> CartItem conserva design_preview_url y design_data
```

El commit vuelve a validar la selección contra la base de datos. El navegador nunca debe enviar precio ni stock como fuente autoritativa.

## 5. Flujo de checkout

```text
CheckoutPage.jsx
  -> GET /api/checkout/summary/
  -> usuario completa datos de envío
  -> POST /api/checkout/confirm/
  -> transacción atómica:
       crea Order
       crea OrderItem
       valida y descuenta stock
       crea Invoice
       vacía el carrito
  -> descarga PDF con token temporal
  -> pago Wompi Sandbox:
       tarjeta -> tokenización directa en Wompi
       token -> POST /api/checkout/orders/<id>/pay/
```

El número de tarjeta, CVC y fecha nunca deben enviarse a Django ni almacenarse en la base de datos.

## 6. Estado actual y pendientes

### Implementado

- Catálogo filtrable y paginado.
- Login JWT con refresh.
- Carrito por usuario/sesión.
- Checkout con stock transaccional.
- Factura PDF con token temporal.
- Tokenización de tarjeta en Wompi Sandbox.
- Editor 3D con handoff firmado y preview en el carrito.
- Cloudinary para imágenes y recursos.
- MongoDB para diseños guardados, auditoría, carritos y plantillas.

### Pendiente o en evolución

- Entidad `CustomDesign` con estados `PENDING_APPROVAL`, `APPROVED` y `REJECTED`.
- Bandeja administrativa específica para aprobar diseños 3D.
- Agregar automáticamente al carrito solo después de aprobación administrativa.
- Snapshot completo del diseño en `OrderItem`.
- Redis/Celery operativos; actualmente están configurados parcialmente y Redis no siempre está levantado.
- Despliegue final en Neon, Render y Vercel.

## 7. Comandos principales

Desde `backend/`:

```bash
python manage.py check
python manage.py migrate
python manage.py test
python manage.py seed_all
python manage.py runserver
```

Desde `frontend/`:

```bash
npm run dev -- --host
npm run build
npm run lint
```

Desde `microservices/Tshirt3D/`:

```bash
npm run dev -- --host
npm run build
```

## 8. Regla para mantener la documentación

Cuando se agregue una función nueva, actualizar siempre:

1. requisito funcional;
2. contrato API;
3. modelo o diccionario de datos;
4. escenario de prueba;
5. flujo o diagrama afectado;
6. changelog.
