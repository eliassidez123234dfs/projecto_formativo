# Guía de Pruebas y Test Cases — RED Estampación

> Guía completa para desarrolladores sobre cómo probar el proyecto,
> qué verificar en cada módulo, y cómo documentar los resultados.
> Basado en la Matriz de Requerimientos del proyecto.

---

## Índice

1. [Workflow de Pruebas](#1-workflow-de-pruebas)
2. [Estructura de Tests Existentes](#2-estructura-de-tests-existentes)
3. [Cómo Ejecutar las Pruebas](#3-cómo-ejecutar-las-pruebas)
4. [Checkpoint por Módulo](#4-checkpoint-por-módulo)
5. [Módulo Productos](#5-módulo-productos)
6. [Módulo Catálogo](#6-módulo-catálogo)
7. [Módulo Usuarios/Auth](#7-módulo-usuariosauth)
8. [Módulo Carrito](#8-módulo-carrito)
9. [Módulo Checkout/Pagos](#9-módulo-checkoutpagos)
10. [Módulo Órdenes](#10-módulo-órdenes)
11. [Módulo Landing/Contacto](#11-módulo-landingcontacto)
12. [Módulo Admin](#12-módulo-admin)
13. [Frontend General](#13-frontend-general)
14. [Lista de Verificación de Regresión](#14-lista-de-verificación-de-regresión)

---

## 1. Workflow de Pruebas

### Flujo recomendado (Git Flow + Testing)

```
Rama personal (ej: jose, elias, manrique, tomas)
  │
  ├── 1. Desarrollo en rama personal
  ├── 2. Pruebas unitarias: python manage.py test <app> --keepdb
  ├── 3. Pruebas de integración: python manage.py check
  ├── 4. Frontend build: npm run build (sin errores)
  ├── 5. Commit + Push a rama personal
  │
  ├── 6. PR/Merge → integracion-total
  │     ├── Resolver conflictos
  │     ├── python manage.py test --keepdb (TODAS las apps)
  │     ├── python manage.py check --deploy
  │     ├── npm run build (frontend completo)
  │     └── Probar flujos críticos manualmente
  │
  └── 7. Merge → main (solo después de pruebas exitosas)
        └── Tag release + Notas de versión
```

### Reglas de Oro
1. **NUNCA** push directo a `main` o `integracion-total` sin PR
2. **SIEMPRE** ejecutar `python manage.py check` antes de commit
3. **SIEMPRE** ejecutar `npm run build` antes de merge a integracion-total
4. **DOCUMENTAR** cambios en `docs/BITACORA.md` y `docs/CHANGELOG.md`
5. **TESTEAR** en rama personal primero, luego en integracion-total

---

## 2. Estructura de Tests Existentes

### Backend (Django TestCase + DRF APIClient)

| App | Archivo de tests | Tests cubiertos |
|-----|-----------------|-----------------|
| `products` | `apps/products/tests.py` | CRUD productos, imágenes, variantes, carrito, auditoría |
| `catalog` | `apps/catalog/tests.py` | Filtros, búsqueda, categorías, navegación |
| `users` | `apps/users/tests.py` | Registro, login, perfiles, verificación email, roles |
| `carts` | `apps/carts/tests.py` | Carrito anónimo, autenticado, merge, items |
| `checkout` | `apps/checkout/tests.py` | Checkout, Wompi webhook, pagos, reembolsos |
| `orders` | `apps/orders/tests.py` | Órdenes, facturas, estados, historial |
| `models3d` | `apps/models3d/tests.py` | Modelos 3D, imágenes, CRUD |
| `landing` | `apps/landing/tests.py` | Contacto, mensajes, CRUD admin |

### Frontend
- **No hay tests de frontend** configurados actualmente (ni Vitest, ni Jest)
- Se recomienda empezar con `vitest` para pruebas unitarias de componentes

---

## 3. Cómo Ejecutar las Pruebas

### Backend — Tests unitarios

```bash
# Activar entorno virtual
cd backend && source venv/bin/activate

# Verificar sintaxis del proyecto
python manage.py check

# Ejecutar tests de una app específica
python manage.py test apps.products.tests --keepdb --verbosity=2

# Ejecutar tests de múltiples apps
python manage.py test apps.products.tests apps.catalog.tests --keepdb

# Ejecutar TODOS los tests
python manage.py test --keepdb

# Ejecutar con cobertura (si pytest-cov está instalado)
coverage run --source='.' manage.py test --keepdb
coverage report
```

### Frontend — Build de producción

```bash
cd frontend
npm run build
# Verificar que no hay errores de compilación
# Verificar que los chunks se generan correctamente
```

### Frontend — Linter

```bash
cd frontend
npm run lint
```

---

## 4. Checkpoint por Módulo

Lista detallada de qué verificar en cada módulo. Cada desarrollador debe
revisar su módulo completo antes de hacer merge a integracion-total.

---

## 5. Módulo Productos

**Responsable:** Jose

### Backend — API

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Listar productos | `GET /api/products/` | Retorna lista paginada con productos activos e inactivos |
| 2 | Buscar por nombre | `GET /api/products/?search=camisa` | Filtra productos que contengan "camisa" en nombre/descripción |
| 3 | Buscar por descripción | `GET /api/products/?search=description` | Filtra productos que contengan el término en descripción |
| 4 | Filtrar activos | `GET /api/products/?is_active=true` | Solo productos con is_active=True |
| 5 | Filtrar inactivos | `GET /api/products/?is_active=false` | Solo productos con is_active=False |
| 6 | Filtrar por precio min | `GET /api/products/?min_price=10000` | Productos con base_price >= 10000 |
| 7 | Filtrar por precio max | `GET /api/products/?max_price=50000` | Productos con base_price <= 50000 |
| 8 | Filtrar por rango precio | `GET /api/products/?min_price=10000&max_price=50000` | Productos dentro del rango |
| 9 | Ordenar por precio | `GET /api/products/?ordering=base_price` | Productos ordenados ascendente |
| 10 | Ordenar por precio desc | `GET /api/products/?ordering=-base_price` | Productos ordenados descendente |
| 11 | Ordenar por nombre | `GET /api/products/?ordering=name` | Orden alfabético A-Z |
| 12 | Crear producto (admin) | `POST /api/products/` con datos válidos | Retorna 201 con producto creado |
| 13 | Crear producto sin nombre | `POST /api/products/` sin name | Retorna 400 con error de validación |
| 14 | Crear producto precio inválido | `POST /api/products/` con precio negativo | Retorna 400 |
| 15 | Obtener detalle | `GET /api/products/{id}/` | Retorna producto con imágenes y variantes |
| 16 | Producto inexistente | `GET /api/products/99999/` | Retorna 404 |
| 17 | Actualizar producto | `PATCH /api/products/{id}/` con datos parciales | Retorna 200 con producto actualizado |
| 18 | Eliminar producto | `DELETE /api/products/{id}/` | Retorna 204, producto ya no existe |
| 19 | Subir imagen | `POST /api/products/{id}/images/` con archivo | Retorna 201, imagen asociada al producto |
| 20 | Eliminar imagen | `DELETE /api/products/{id}/images/{img_id}/` | Retorna 204, imagen eliminada |
| 21 | Reordenar imágenes | `POST /api/products/{id}/images/reorder/` | Imágenes reordenadas según orden enviado |
| 22 | Marcar imagen principal | `POST /api/products/{id}/images/{img_id}/set_main/` | Solo una imagen tiene is_main=True |
| 23 | Agregar al carrito (autenticado) | `POST /api/products/{id}/add-to-cart/` con JWT | Crea/modifica CartItem, retorna carrito |
| 24 | Agregar al carrito (anónimo) | `POST /api/products/{id}/add-to-cart/` sin auth | Crea CartItem con session_key |
| 25 | Stock insuficiente | `POST /api/products/{id}/add-to-cart/` cantidad > stock | Retorna 400 con error |
| 26 | Producto inválido | `POST /api/products/99999/add-to-cart/` | Retorna 404 |
| 27 | Auditoría: listar entradas | `GET /api/products/{id}/audits/` | Retorna historial de cambios |
| 28 | Auditoría: crear entrada | POST interno | Se crea al modificar producto |
| 29 | Publicar producto | `POST /api/products/{id}/publish/` | Cambia ready_to_publish=True |
| 30 | Aprobar producto | `POST /api/products/{id}/approve/` | Cambia is_approved=True (solo admin) |

### Frontend — Productos

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Lista de productos (admin) | `/admin-products` | Muestra tabla con todos los productos paginados |
| 2 | Búsqueda en lista admin | Escribir en campo de búsqueda | Filtra productos en tiempo real |
| 3 | Crear producto | Click "Nuevo Producto" | Abre formulario, al guardar aparece en lista |
| 4 | Editar producto | Click en producto → "Editar" | Formulario pre-cargado, guarda cambios |
| 5 | Detalle de producto | Click en producto | Muestra info, variantes, imágenes, auditoría |
| 6 | Subir imágenes | Drag & drop o selector | Imagen se muestra en galería |
| 7 | Reordenar imágenes | Arrastrar imágenes | Nuevo orden se persiste |
| 8 | Eliminar variante | Click "Eliminar" en variante | Variante desaparece, stock se actualiza |
| 9 | Vista pública | `/product/{id}` | Muestra detalle público del producto |

---

## 6. Módulo Catálogo

**Responsable:** Jose

### Backend — API

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Catálogo público | `GET /api/catalog/` | Lista productos activos y aprobados, paginado |
| 2 | Filtros del catálogo | `GET /api/catalog/filters/` | Retorna categorías, rangos de precio disponibles |
| 3 | Productos destacados | `GET /api/catalog/featured/` | Lista de productos marcados como destacados |
| 4 | Por categoría | `GET /api/catalog/?category={id}` | Filtra productos de esa categoría |
| 5 | Búsqueda textual | `GET /api/catalog/?search=texto` | Busca en nombre y descripción |
| 6 | Categorías | `GET /api/catalog/categories/` | Lista todas las categorías |
| 7 | Crear categoría (admin) | `POST /api/admin/categories/` | 201 + categoría creada |
| 8 | Búsqueda con filtros combinados | `GET /api/catalog/?search=x&category=y&min_price=z` | Múltiples filtros simultáneos |

### Frontend — Catálogo

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Página de catálogo | `/catalog` | Muestra grid de productos con imágenes |
| 2 | Filtros laterales | Sidebar de filtros | Categorías, precio, búsqueda |
| 3 | Búsqueda en catálogo | Escribir en buscador | Filtra productos en tiempo real |
| 4 | Filtrar por categoría | Click en categoría | Muestra solo productos de esa categoría |
| 5 | Ver detalle producto | Click en tarjeta | Navega a `/product/{id}` |
| 6 | Productos relacionados | En detalle de producto | Muestra productos similares |
| 7 | Vista categoría | `/category/{id}` | Filtro pre-aplicado por categoría |

---

## 7. Módulo Usuarios/Auth

**Responsable:** Elias

### Backend — API

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Registro | `POST /api/auth/registro/` con datos válidos | 201, usuario creado en estado Inactivo |
| 2 | Registro duplicado | `POST /api/auth/registro/` mismo usuario | 400, error de usuario ya existe |
| 3 | Contraseña débil | `POST /api/auth/registro/` contraseña < 8 chars | 400, error de validación |
| 4 | Login exitoso | `POST /api/login/` credenciales correctas | 200, retorna tokens JWT + cookies httpOnly |
| 5 | Login fallido | `POST /api/login/` contraseña incorrecta | 401, error de autenticación |
| 6 | Rate limiting | 10+ intentos/minuto desde misma IP | 429 Too Many Requests (desde intento 11) |
| 7 | Bloqueo por intentos | 5 intentos fallidos consecutivos | Usuario cambia estado a Bloqueado |
| 8 | Logout | `POST /api/login/logout/` con refresh token | 200, token añadido a blacklist |
| 9 | Perfil (autenticado) | `GET /api/usuarios/perfil/` con JWT | Retorna datos del usuario autenticado |
| 10 | Perfil (sin auth) | `GET /api/usuarios/perfil/` sin JWT | 401 Unauthorized |
| 11 | Verificar email | GET con token válido | Usuario pasa a Activo, email_verificado=True |
| 12 | Token expirado | GET con token vencido | Redirige con error=token-expirado |
| 13 | Recuperar password | `POST /api/auth/recuperar-password/` con email | Envía email con token |
| 14 | Nueva password | `POST /api/auth/nueva-password/` con token + nueva pass | Contraseña actualizada |
| 15 | Cambiar password | `POST /api/usuarios/cambiar-password/` autenticado | Contraseña cambiada con verificación actual |
| 16 | Token refresh válido | `POST /api/token/refresh/` con refresh válido | Nuevo access token |
| 17 | Token refresh inválido | `POST /api/token/refresh/` con refresh expirado | 401 |

### Frontend — Auth

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Formulario login | `/login` | Campos: usuario/correo + contraseña, botón Ingresar |
| 2 | Validación login | Enviar vacío | Mensajes de error: "El usuario es obligatorio", "La contraseña es obligatoria" |
| 3 | Login exitoso | Credenciales válidas | Redirige a Dashboard o Landing según rol |
| 4 | Login fallido | Credenciales inválidas | Mensaje de error sin recargar página |
| 5 | Formulario registro | `/register` | Campos: usuario, correo, contraseña, confirmar |
| 6 | Validación registro | Contraseña sin mayúscula | Error: "Debe incluir una mayúscula" |
| 7 | Confirmación registro | Enviar formulario válido | Mensaje: "Revisa tu correo para verificar tu cuenta" |
| 8 | Logout | Click en botón salir | Cierra sesión, redirige a login |
| 9 | Persistencia sesión | Login → recargar página | Sigue autenticado (restoreSession) |
| 10 | Protección rutas | Ir a `/dashboard` sin auth | Redirige a `/login` |

---

## 8. Módulo Carrito

**Responsable:** José/Elias

### Backend — API

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Ver carrito (autenticado) | `GET /api/cart/` con JWT | Retorna items del carrito del usuario autenticado |
| 2 | Ver carrito (anónimo) | `GET /api/cart/` con session | Retorna items del carrito anónimo |
| 3 | Agregar item | `POST /api/cart/add/` con product_id + variant_id | Crea item o incrementa cantidad |
| 4 | Actualizar cantidad | `PATCH /api/cart/items/{id}/quantity/` | Cambia cantidad, retorna carrito actualizado |
| 5 | Eliminar item | `DELETE /api/cart/items/{id}/remove/` | Retorna 204, item eliminado |
| 6 | Vaciar carrito | `DELETE /api/cart/clear/` | Todos los items eliminados |
| 7 | Migración anónimo → auth | Login con items en carrito anónimo | Items migrados al carrito autenticado |

---

## 9. Módulo Checkout/Pagos

**Responsable:** José

### Backend — API

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Resumen checkout | `GET /api/checkout/summary/` | Retorna items + total + impuestos |
| 2 | Iniciar checkout | `POST /api/checkout/init/` con datos envío | Crea orden, descuenta stock, limpia carrito |
| 3 | Crear pago | `POST /api/checkout/create-payment/` con order_id | Retorna URL de Wompi para pago |
| 4 | Estado pago | `GET /api/checkout/payment-status/?reference=xxx` | Retorna estado actual del pago |
| 5 | Webhook Wompi | `POST /api/checkout/wompi-webhook/` | Procesa notificación de pago |
| 6 | Webhook firma inválida | POST sin firma correcta | 400, loguea warning |
| 7 | Pago aprobado | Webhook con evento APPROVED | Orden → PAID, payment_confirmed_at actualizado |
| 8 | Pago rechazado | Webhook con evento DECLINED | Orden → FAILED, stock restaurado |

---

## 10. Módulo Órdenes

**Responsable:** José

### Backend — API

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Listar órdenes (autenticado) | `GET /api/orders/` con JWT | Solo órdenes del usuario autenticado |
| 2 | Listar órdenes (admin) | `GET /api/admin/orders/` con JWT admin | Todas las órdenes del sistema |
| 3 | Detalle orden | `GET /api/orders/{id}/` | Items, total, estado, fechas |
| 4 | Actualizar estado (admin) | `PATCH /api/admin/orders/{id}/status/` | Cambia estado, registra auditoría |
| 5 | Generar factura | `POST /api/orders/invoices/generate/` | Crea Invoice para la orden |
| 6 | Ver factura | `GET /api/orders/invoices/{id}/` | Datos fiscales de la factura |

---

## 11. Módulo Landing/Contacto

**Responsable:** Tomas

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Página de inicio | `/` | Landing con hero, características, contacto |
| 2 | Formulario contacto | Enviar formulario | Mensaje guardado en BD |
| 3 | Admin: ver mensajes | `/admin-contact` | Lista de mensajes de contacto |
| 4 | Admin: marcar leído | Click "Marcar leído" | Mensaje marcado como leído |
| 5 | Admin: eliminar mensaje | Click "Eliminar" | Mensaje eliminado |

---

## 12. Módulo Admin

**Responsable:** Jose/Elias

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Dashboard admin | `/admin` | Muestra estadísticas: usuarios, productos, órdenes |
| 2 | Gestión usuarios | `/admin-users` | CRUD completo de usuarios |
| 3 | Gestión productos | `/admin-products` | CRUD completo de productos |
| 4 | Gestión categorías | `/admin-categories` | CRUD de categorías |
| 5 | Gestión imágenes | `/admin-images` | CRUD de imágenes de productos |
| 6 | Gestión diseños 3D | `/admin-designs` | CRUD de modelos 3D |
| 7 | Gestión pedidos | `/admin-orders` | Lista + detalle + cambio de estado |
| 8 | Gestión carritos | `/admin-cart` | Lista + detalle de carritos |
| 9 | Gestión contacto | `/admin-contact` | Mensajes recibidos |
| 10 | Auditoría | `/admin-audit` | Log de eventos del sistema |

---

## 13. Frontend General

### Responsividad

| # | Resolución | Qué verificar |
|---|-----------|---------------|
| 1 | 360px (móvil pequeño) | Sidebar colapsa, header se adapta, grid 1 columna |
| 2 | 480px (móvil grande) | ScrollToTop visible, botones full-width |
| 3 | 768px (tablet) | Sidebar overlay, grid 2 columnas |
| 4 | 1024px (tablet horizontal) | Sidebar colapsada 70px, grid 3 columnas |
| 5 | 1440px+ (desktop) | Layout completo, sidebar fija 260px |

### Temas

| # | Check | Cómo probar |
|---|-------|-------------|
| 1 | Tema claro | Por defecto, colores claros en toda la app |
| 2 | Tema oscuro | Toggle header cambia a fondo oscuro |
| 3 | Persistencia | Recargar página, tema se mantiene (Zustand) |
| 4 | Consistencia | Todos los componentes respetan el tema |

### Navegación

| # | Check | Cómo probar |
|---|-------|-------------|
| 1 | Breadcrumbs | Cada página muestra ruta de navegación |
| 2 | 404 | Navegar a ruta inexistente → página 404 con "Volver al inicio" |
| 3 | ScrollToTop | Scroll > 400px → botón flotante visible |
| 4 | ErrorBoundary | Error en componente lazy → muestra fallback sin romper app |

---

## 14. Lista de Verificación de Regresión

Ejecutar ANTES de cada merge a `integracion-total`:

### Backend
```bash
# 1. Verificar sintaxis Django
python manage.py check

# 2. Ejecutar tests de apps modificadas
python manage.py test apps.products.tests apps.catalog.tests --keepdb

# 3. Ejecutar tests de apps NO modificadas (regresión)
python manage.py test apps.users.tests apps.carts.tests --keepdb

# 4. Verificar migraciones pendientes
python manage.py showmigrations --list | grep "\[ \]"

# 5. Verificar imports de todos los módulos
python -c "
import django; django.setup()
import importlib
for app in ['products','catalog','users','carts','checkout','orders','models3d','landing']:
    for mod in ['api.viewset','api.serializers','models','tests']:
        try:
            importlib.import_module(f'apps.{app}.{mod}')
            print(f'OK apps.{app}.{mod}')
        except Exception as e:
            print(f'FAIL apps.{app}.{mod}: {e}')
"
```

### Frontend
```bash
# 1. Build de producción
npm run build

# 2. Verificar lint
npm run lint

# 3. Verificar que no hay imports rotos
node -e "
const fs = require('fs');
const path = require('path');
const pages = fs.readdirSync('src/pages').filter(f => f.endsWith('.jsx'));
const components = fs.readdirSync('src/components').filter(f => f.endsWith('.jsx'));
console.log('Pages:', pages.length);
console.log('Components:', components.length);
"
```

### Git
```bash
# 1. Verificar estado
git status

# 2. Verificar que la rama está actualizada
git fetch origin
git log --oneline HEAD..origin/integracion-total

# 3. No hay conflictos sin resolver
grep -r "<<<<<<<" . --include="*.py" --include="*.jsx" --include="*.js" --include="*.css"
```

---

## Formato para Reportar Bugs

Cuando encuentres un bug, documéntalo así:

```
## Bug: [Título descriptivo]

**Módulo:** Productos / Catálogo / Usuarios / Carrito / Checkout / Admin
**Rama:** jose / elias / manrique / tomas
**Severidad:** Crítico / Alto / Medio / Bajo

**Pasos para reproducir:**
1. Ir a ...
2. Click en ...
3. Enviar formulario con ...

**Comportamiento esperado:**
...

**Comportamiento actual:**
...

**Evidencia:**
- Captura de pantalla / log / mensaje de error

**Ambiente:**
- Navegador: Chrome/Firefox/Safari
- Resolución: 360px/768px/1440px
- Auth: Autenticado/Anónimo
```

---

## Checklist Pre-Merge

- [ ] `python manage.py check` sin errores
- [ ] `npm run build` exitoso
- [ ] Tests de mi módulo pasan
- [ ] Tests de módulos relacionados pasan
- [ ] No hay migraciones sin aplicar
- [ ] No hay conflictos de merge
- [ ] Documentación actualizada (`docs/`)
- [ ] Bitácora actualizada (`docs/BITACORA.md`)
- [ ] CHANGELOG actualizado (`docs/CHANGELOG.md`)
- [ ] Código comentado en español
- [ ] No hay secretos/credenciales en el código
