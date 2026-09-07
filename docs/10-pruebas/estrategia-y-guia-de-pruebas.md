# Estrategia y Guía de Pruebas — RED Estampación

> Test-Driven Development: pirámide de pruebas, frameworks, ejemplos, checkpoints por módulo,
> guía de test cases y verificación de regresión.

---

## Índice

- [1. Pirámide de Pruebas](#1-pirámide-de-pruebas)
- [2. Frameworks](#2-frameworks)
- [3. Workflow de Pruebas](#3-workflow-de-pruebas)
- [4. Estructura de Tests](#4-estructura-de-tests)
- [5. Ejemplos TDD](#5-ejemplos-tdd)
- [6. Ciclo TDD (Red-Green-Refactor)](#6-ciclo-tdd-red-green-refactor)
- [7. Cobertura Mínima](#7-cobertura-mínima)
- [8. Cómo Ejecutar las Pruebas](#8-cómo-ejecutar-las-pruebas)
- [9. Checkpoint por Módulo](#9-checkpoint-por-módulo)
- [10. Lista de Verificación de Regresión](#10-lista-de-verificación-de-regresión)
- [11. Formato para Reportar Bugs](#11-formato-para-reportar-bugs)
- [12. Checklist Pre-Merge](#12-checklist-pre-merge)
- [13. CI/CD con Tests](#13-cicd-con-tests)

---

## 1. Pirámide de Pruebas

```
        ╱╲
       ╱ E2E ╲       ← 5%  — Playwright / Cypress
      ╱────────╲
     ╱Integración╲    ← 15% — pytest-django / Vitest + MSW
    ╱──────────────╲
   ╱   Unitarias     ╲  ← 80% — pytest / Vitest
  ╱────────────────────╲
```

---

## 2. Frameworks

| Capa | Framework | Configuración |
|------|-----------|---------------|
| Backend Unit | pytest + pytest-django | `pytest.ini` con `DJANGO_SETTINGS_MODULE` |
| Backend API | DRF's APITestCase + pytest | `APIClient` para requests |
| Frontend Unit | Vitest + React Testing Library | `vitest.config.js` en frontend/ |
| Frontend E2E | Playwright (futuro) | `playwright.config.js` |
| Contratos | DRF's APITestCase + schema | Validar request/response contra OpenAPI |
| Cobertura | pytest-cov / c8 | Mínimo 80% |

---

## 3. Workflow de Pruebas

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
4. **DOCUMENTAR** cambios en `docs/12-historial/bitacora.md` y `docs/12-historial/changelog.md`
5. **TESTEAR** en rama personal primero, luego en integracion-total

---

## 4. Estructura de Tests

```
backend/
  tests/
    unit/
      test_models.py
      test_serializers.py
      test_permissions.py
    integration/
      test_api_products.py
      test_api_cart.py
      test_api_checkout.py
      test_api_auth.py
    contract/
      test_product_contract.py
      test_cart_contract.py

frontend/
  src/
    __tests__/
      components/
        ProductCard.test.jsx
        CartItem.test.jsx
      pages/
        Catalog.test.jsx
        Cart.test.jsx
      context/
        CartContext.test.jsx
      services/
        api.test.js
```

### Estructura de Tests Existentes (Backend)

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

**Frontend:** No hay tests de frontend configurados actualmente. Se recomienda empezar con `vitest` para pruebas unitarias de componentes.

---

## 5. Ejemplos TDD

### Backend: Test de Modelo Producto

```python
# backend/tests/unit/test_models.py
import pytest
from django.core.exceptions import ValidationError
from apps.products.models import Producto, Variante

pytestmark = pytest.mark.django_db

class TestProductoModel:
    def test_create_producto_minimal(self):
        """RED: debe fallar porque no implementamos create aún"""
        producto = Producto.objects.create(
            name="Camiseta Test",
            base_price=19.99
        )
        assert producto.name == "Camiseta Test"
        assert producto.base_price == 19.99
        assert producto.is_active is False  # default

    def test_producto_ready_to_publish(self):
        """GREEN: checklist completo = ready_to_publish True"""
        producto = Producto.objects.create(
            name="Test",
            base_price=10.00,
            is_active=True,
            is_approved=True
        )
        assert producto.ready_to_publish is True

    def test_producto_base_price_must_be_positive(self):
        """RED: precio negativo debe fallar"""
        with pytest.raises(ValidationError):
            producto = Producto(name="Test", base_price=-5)
            producto.full_clean()
```

### Backend: Test de API

```python
# backend/tests/integration/test_api_products.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()

class TestProductsAPI(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@test.com", password="admin123"
        )
        self.client.force_authenticate(user=self.admin)

    def test_create_product(self):
        """RED → GREEN: crear producto como admin"""
        data = {
            "name": "Camiseta Premium",
            "description": "Algodón 100%",
            "base_price": "29.99",
            "is_active": False
        }
        response = self.client.post("/api/products/", data, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Camiseta Premium"

    def test_unauthenticated_cannot_create(self):
        """RED: usuario no autenticado no puede crear"""
        self.client.force_authenticate(user=None)
        data = {"name": "Test", "base_price": "10.00"}
        response = self.client.post("/api/products/", data, format="json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### Frontend: Test de Componente

```jsx
// frontend/src/__tests__/components/ProductCard.test.jsx
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductCard from '../../components/ProductCard';

const mockProduct = {
  id: 1,
  name: 'Camiseta Test',
  base_price: '19.99',
  main_image: 'http://example.com/img.jpg',
  variants_count: 4,
};

describe('ProductCard', () => {
  it('renders product name and price', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );
    expect(screen.getByText('Camiseta Test')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });

  it('links to product detail page', () => {
    render(
      <BrowserRouter>
        <ProductCard product={mockProduct} />
      </BrowserRouter>
    );
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/product/1');
  });
});
```

---

## 6. Ciclo TDD (Red-Green-Refactor)

```
1. RED:   Escribir test que falla
2. GREEN: Implementar mínimo para que pase
3. REFACTOR: Mejorar código manteniendo tests verdes

Ejemplo con producto:
  RED:   test_producto_base_price_must_be_positive() → FAIL
  GREEN: Agregar validación `base_price >= 0` en modelo → PASS
  REFACTOR: Mover validación a serializer, usar MinValueValidator
```

---

## 7. Cobertura Mínima

| Módulo | Cobertura Mínima | Prioridad |
|--------|-----------------|-----------|
| Modelos | 90% | Alta |
| APIs (Views/ViewSets) | 85% | Alta |
| Serializers | 80% | Alta |
| Lógica de negocio (services) | 90% | Alta |
| Componentes frontend | 70% | Media |
| Contextos frontend | 75% | Media |

---

## 8. Cómo Ejecutar las Pruebas

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

## 9. Checkpoint por Módulo

Lista detallada de qué verificar en cada módulo. Cada desarrollador debe revisar su módulo completo antes de hacer merge a integracion-total.

### 9.1 Módulo Productos

**Responsable:** Jose

**Backend — API**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Listar productos | `GET /api/products/` | Retorna lista paginada con productos activos e inactivos |
| 2 | Buscar por nombre | `GET /api/products/?search=camisa` | Filtra productos que contengan "camisa" en nombre/descripción |
| 3 | Filtrar activos | `GET /api/products/?is_active=true` | Solo productos con is_active=True |
| 4 | Filtrar por precio | `GET /api/products/?min_price=10000&max_price=50000` | Productos dentro del rango |
| 5 | Ordenar por precio | `GET /api/products/?ordering=-base_price` | Productos ordenados descendente |
| 6 | Crear producto (admin) | `POST /api/products/` con datos válidos | Retorna 201 con producto creado |
| 7 | Crear producto precio inválido | `POST /api/products/` con precio negativo | Retorna 400 |
| 8 | Obtener detalle | `GET /api/products/{id}/` | Retorna producto con imágenes y variantes |
| 9 | Actualizar producto | `PATCH /api/products/{id}/` | Retorna 200 con producto actualizado |
| 10 | Eliminar producto | `DELETE /api/products/{id}/` | Retorna 204 |
| 11 | Subir imagen | `POST /api/products/{id}/images/` | Retorna 201, imagen asociada |
| 12 | Eliminar imagen | `DELETE /api/products/{id}/images/{img_id}/` | Retorna 204 |
| 13 | Reordenar imágenes | `POST /api/products/{id}/images/reorder/` | Imágenes reordenadas |
| 14 | Marcar imagen principal | `POST /api/products/{id}/images/{img_id}/set_main/` | Solo una imagen tiene is_main=True |
| 15 | Agregar al carrito (autenticado) | `POST /api/products/{id}/add-to-cart/` con JWT | Crea/modifica CartItem |
| 16 | Stock insuficiente | `POST /api/products/{id}/add-to-cart/` cantidad > stock | Retorna 400 |
| 17 | Auditoría: listar entradas | `GET /api/products/{id}/audits/` | Retorna historial de cambios |
| 18 | Publicar producto | `POST /api/products/{id}/publish/` | Cambia ready_to_publish=True |
| 19 | Aprobar producto | `POST /api/products/{id}/approve/` | Cambia is_approved=True (solo admin) |

**Frontend — Productos**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Lista de productos (admin) | `/admin-products` | Tabla con todos los productos paginados |
| 2 | Crear producto | Click "Nuevo Producto" | Formulario, al guardar aparece en lista |
| 3 | Editar producto | Click en producto → "Editar" | Formulario pre-cargado |
| 4 | Detalle de producto | Click en producto | Info, variantes, imágenes, auditoría |
| 5 | Subir imágenes | Drag & drop | Imagen se muestra en galería |
| 6 | Vista pública | `/product/{id}` | Detalle público del producto |

### 9.2 Módulo Catálogo

**Responsable:** Jose

**Backend — API**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Catálogo público | `GET /api/catalog/` | Lista productos activos y aprobados, paginado |
| 2 | Filtros del catálogo | `GET /api/catalog/filters/` | Retorna categorías, rangos de precio |
| 3 | Productos destacados | `GET /api/catalog/featured/` | Lista de productos destacados |
| 4 | Por categoría | `GET /api/catalog/?category={id}` | Filtra productos de esa categoría |
| 5 | Búsqueda textual | `GET /api/catalog/?search=texto` | Busca en nombre y descripción |
| 6 | Categorías | `GET /api/catalog/categories/` | Lista todas las categorías |

**Frontend — Catálogo**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Página de catálogo | `/catalog` | Grid de productos con imágenes |
| 2 | Filtros laterales | Sidebar de filtros | Categorías, precio, búsqueda |
| 3 | Filtrar por categoría | Click en categoría | Solo productos de esa categoría |
| 4 | Ver detalle producto | Click en tarjeta | Navega a `/product/{id}` |
| 5 | Vista categoría | `/category/{id}` | Filtro pre-aplicado |

### 9.3 Módulo Usuarios/Auth

**Responsable:** Elias

**Backend — API**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Registro | `POST /api/auth/registro/` | 201, usuario creado en estado Inactivo |
| 2 | Registro duplicado | `POST /api/auth/registro/` mismo usuario | 400 |
| 3 | Contraseña débil | `POST /api/auth/registro/` contraseña < 8 chars | 400 |
| 4 | Login exitoso | `POST /api/login/` | 200, tokens JWT + cookies httpOnly |
| 5 | Login fallido | `POST /api/login/` contraseña incorrecta | 401 |
| 6 | Rate limiting | 10+ intentos/minuto desde misma IP | 429 Too Many Requests |
| 7 | Bloqueo por intentos | 5 intentos fallidos consecutivos | Usuario cambia a Bloqueado |
| 8 | Logout | `POST /api/login/logout/` con refresh | 200, token en blacklist |
| 9 | Perfil (autenticado) | `GET /api/usuarios/perfil/` | Retorna datos del usuario |
| 10 | Verificar email | GET con token válido | Usuario pasa a Activo |
| 11 | Recuperar password | `POST /api/auth/recuperar-password/` | Envía email con token |
| 12 | Cambiar password | `POST /api/usuarios/cambiar-password/` | Contraseña cambiada |
| 13 | Token refresh válido | `POST /api/token/refresh/` | Nuevo access token |

**Frontend — Auth**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Formulario login | `/login` | Campos + botón Ingresar |
| 2 | Login exitoso | Credenciales válidas | Redirige según rol |
| 3 | Formulario registro | `/register` | Campos requeridos |
| 4 | Confirmación registro | Enviar formulario válido | "Revisa tu correo..." |
| 5 | Logout | Click en botón salir | Cierra sesión |
| 6 | Protección rutas | Ir a `/dashboard` sin auth | Redirige a `/login` |

### 9.4 Módulo Carrito

**Responsable:** José/Elias

**Backend — API**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Ver carrito (autenticado) | `GET /api/cart/` con JWT | Items del usuario autenticado |
| 2 | Ver carrito (anónimo) | `GET /api/cart/` con session | Items del carrito anónimo |
| 3 | Agregar item | `POST /api/cart/add/` | Crea item o incrementa cantidad |
| 4 | Actualizar cantidad | `PATCH /api/cart/items/{id}/quantity/` | Cantidad actualizada |
| 5 | Eliminar item | `DELETE /api/cart/items/{id}/remove/` | Retorna 204 |
| 6 | Vaciar carrito | `DELETE /api/cart/clear/` | Items eliminados |
| 7 | Migración anónimo → auth | Login con items anónimos | Items migrados al carrito autenticado |

### 9.5 Módulo Checkout/Pagos

**Responsable:** José

**Backend — API**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Resumen checkout | `GET /api/checkout/summary/` | Items + total + impuestos |
| 2 | Iniciar checkout | `POST /api/checkout/init/` | Crea orden, descuenta stock, limpia carrito |
| 3 | Crear pago | `POST /api/checkout/create-payment/` | Retorna URL de Wompi |
| 4 | Estado pago | `GET /api/checkout/payment-status/?reference=xxx` | Estado actual |
| 5 | Webhook Wompi | `POST /api/checkout/wompi-webhook/` | Procesa notificación |
| 6 | Webhook firma inválida | POST sin firma correcta | 400 |
| 7 | Pago aprobado | Webhook evento APPROVED | Orden → PAID |
| 8 | Pago rechazado | Webhook evento DECLINED | Orden → FAILED, stock restaurado |

### 9.6 Módulo Órdenes

**Responsable:** José

**Backend — API**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Listar órdenes (autenticado) | `GET /api/orders/` | Solo órdenes del usuario |
| 2 | Listar órdenes (admin) | `GET /api/admin/orders/` | Todas las órdenes |
| 3 | Detalle orden | `GET /api/orders/{id}/` | Items, total, estado, fechas |
| 4 | Actualizar estado (admin) | `PATCH /api/admin/orders/{id}/status/` | Cambia estado, auditoría |
| 5 | Generar factura | `POST /api/orders/invoices/generate/` | Crea Invoice |
| 6 | Ver factura | `GET /api/orders/invoices/{id}/` | Datos fiscales |

### 9.7 Módulo Landing/Contacto

**Responsable:** Tomas

**Backend — API**

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Página de inicio | `/` | Landing con hero, características, contacto |
| 2 | Formulario contacto | Enviar formulario | Mensaje guardado en BD |
| 3 | Admin: ver mensajes | `/admin-contact` | Lista de mensajes |
| 4 | Admin: marcar leído | Click "Marcar leído" | Mensaje marcado |
| 5 | Admin: eliminar mensaje | Click "Eliminar" | Mensaje eliminado |

### 9.8 Módulo Admin

**Responsable:** Jose/Elias

| # | Check | Cómo probar | Criterio de éxito |
|---|-------|------------|-------------------|
| 1 | Dashboard admin | `/admin` | Estadísticas: usuarios, productos, órdenes |
| 2 | Gestión usuarios | `/admin-users` | CRUD completo |
| 3 | Gestión productos | `/admin-products` | CRUD completo |
| 4 | Gestión categorías | `/admin-categories` | CRUD de categorías |
| 5 | Gestión imágenes | `/admin-images` | CRUD de imágenes |
| 6 | Gestión diseños 3D | `/admin-designs` | CRUD de modelos 3D |
| 7 | Gestión pedidos | `/admin-orders` | Lista + detalle + cambio de estado |
| 8 | Gestión carritos | `/admin-cart` | Lista + detalle |
| 9 | Gestión contacto | `/admin-contact` | Mensajes recibidos |
| 10 | Auditoría | `/admin-audit` | Log de eventos |

### 9.9 Frontend General

**Responsividad**

| # | Resolución | Qué verificar |
|---|-----------|---------------|
| 1 | 360px (móvil pequeño) | Sidebar colapsa, grid 1 columna |
| 2 | 480px (móvil grande) | ScrollToTop visible, botones full-width |
| 3 | 768px (tablet) | Sidebar overlay, grid 2 columnas |
| 4 | 1024px (tablet horizontal) | Sidebar colapsada 70px |
| 5 | 1440px+ (desktop) | Layout completo, sidebar fija 260px |

**Temas / Navegación**

| # | Check | Cómo probar |
|---|-------|-------------|
| 1 | Tema claro/oscuro | Toggle header, persiste al recargar |
| 2 | Breadcrumbs | Cada página muestra ruta |
| 3 | 404 | Ruta inexistente → página 404 |
| 4 | ScrollToTop | Scroll > 400px → botón visible |
| 5 | ErrorBoundary | Error en componente lazy → fallback |

---

## 10. Lista de Verificación de Regresión

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

## 11. Formato para Reportar Bugs

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

**Comportamiento esperado:** ...

**Comportamiento actual:** ...

**Evidencia:**
- Captura de pantalla / log / mensaje de error

**Ambiente:**
- Navegador: Chrome/Firefox/Safari
- Resolución: 360px/768px/1440px
- Auth: Autenticado/Anónimo
```

---

## 12. Checklist Pre-Merge

- [ ] `python manage.py check` sin errores
- [ ] `npm run build` exitoso
- [ ] Tests de mi módulo pasan
- [ ] Tests de módulos relacionados pasan
- [ ] No hay migraciones sin aplicar
- [ ] No hay conflictos de merge
- [ ] Documentación actualizada (`docs/`)
- [ ] Bitácora actualizada (`docs/12-historial/bitacora.md`)
- [ ] CHANGELOG actualizado (`docs/12-historial/changelog.md`)
- [ ] Código comentado en español
- [ ] No hay secretos/credenciales en el código

---

## 13. CI/CD con Tests

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: user
          POSTGRES_PASSWORD: pass
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest --cov=apps --cov-fail-under=80

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm test -- --coverage --coverageThreshold='{"global":{"lines":70}}'
```

> Para los escenarios BDD (Gherkin) de funcionalidades críticas, ver [`escenarios-bdd.md`](./escenarios-bdd.md).
