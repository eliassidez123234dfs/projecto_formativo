---
description: "Desglose de tareas para RED Estampación — organizado por user stories priorizadas"
---

# Tasks: RED Estampación

**Input**: `.specify/spec.md`, `.specify/plan.md`  
**Prerrequisitos**: GitFlow configurado, constitution activa

---

## Fase 1: Setup (Infraestructura Compartida)

**Propósito**: Inicialización del proyecto y herramientas base

- [ ] T001 [P] Configurar GitFlow en el proyecto (main + integracion-total + feature/*)
- [ ] T002 [P] Configurar GitHub Actions (CI: lint + typecheck + tests)
- [ ] T003 [P] Configurar ruff + mypy en backend/.pre-commit-config.yaml
- [ ] T004 [P] Configurar ESLint + Prettier en frontend/
- [ ] T005 [P] Crear docker-compose.yml con PostgreSQL, backend, frontend
- [ ] T006 [P] Configurar variables de entorno (.env.example) con django-environ
- [ ] T007 [P] Configurar pytest + pytest-django con base de datos de pruebas

---

## Fase 2: Fundacional (Bloqueante — todo depende de esto)

**⚠️ CRÍTICO**: Ninguna user story puede comenzar sin completar esta fase

- [ ] T008 Setup Django project + apps: users, products, catalog, carts, checkout, orders, models3d, landing
- [ ] T009 [P] Modelo Usuario + Token_Verificacion (users/models.py)
- [ ] T010 [P] Modelo Producto + Variante + ImagenProducto (products/models.py)
- [ ] T011 [P] Modelo Categoría + ProductoCategoria (catalog/models.py)
- [ ] T012 [P] Modelo Carrito + ItemCarrito (carts/models.py)
- [ ] T013 [P] Modelo Pedido + ItemPedido (orders/models.py)
- [ ] T014 [P] Modelo Modelo3D + Modelo3DImagen (models3d/models.py)
- [ ] T015 [P] Migraciones iniciales + migrate
- [ ] T016 [P] Configurar JWT (djangorestframework-simplejwt)
- [ ] T017 [P] Configurar CORS (django-cors-headers)
- [ ] T018 [P] Configurar Cloudinary (django-cloudinary-storage)
- [ ] T019 [P] Configurar URLs base + enrutamiento DRF (config/urls.py)
- [ ] T020 [P] Configurar logging estructurado
- [ ] T021 [P] Seed data: productos de ejemplo, categorías, admin user

**Checkpoint**: Fundación lista — las user stories pueden comenzar en paralelo

---

## Fase 3: User Story 1 — Autenticación y Gestión de Usuarios (P1) 🎯 MVP

**Goal**: Usuarios pueden registrarse, iniciar sesión y gestionar su perfil

**Test Independiente**: Registrar usuario → verificar email → login JWT → ver perfil

### Tests (Escribir PRIMERO, deben fallar)

- [ ] T022 [P] [US1] Test: POST /api/auth/register/ — registro exitoso
- [ ] T023 [P] [US1] Test: POST /api/auth/register/ — email duplicado → 400
- [ ] T024 [P] [US1] Test: POST /api/auth/login/ — login exitoso → JWT tokens
- [ ] T025 [P] [US1] Test: POST /api/auth/login/ — credenciales inválidas → 401
- [ ] T026 [P] [US1] Test: GET /api/auth/profile/ — perfil autenticado
- [ ] T027 [P] [US1] Test: PUT /api/auth/profile/ — actualizar perfil

### Implementación

- [ ] T028 [P] [US1] Serializer RegisterSerializer en users/api/serializers.py
- [ ] T029 [P] [US1] Serializer UserSerializer + ProfileSerializer
- [ ] T030 [US1] ViewSet AuthViewSet (register, login, profile, verify-email) en users/api/
- [ ] T031 [US1] URL routing de auth en config/urls.py
- [ ] T032 [US1] Lógica de verificación de email (token + email backend)
- [ ] T033 [US1] Validaciones: password strength, email único
- [ ] T034 [US1] Frontend: Página Auth (Login + Register) en frontend/src/pages/AuthPage.jsx
- [ ] T035 [US1] Frontend: AuthContext + ProtectedRoute
- [ ] T036 [US1] Frontend: Página de perfil (UserProfile.jsx)
- [ ] T037 [US1] Frontend: Servicio api.js con JWT interceptor

**Checkpoint**: US1 completa — usuarios pueden registrarse y autenticarse

---

## Fase 4: User Story 2 — Catálogo y Productos (P1)

**Goal**: Usuarios pueden navegar productos, filtrar por categoría y ver detalles

**Test Independiente**: Ver catálogo → filtrar por categoría → ver detalle de producto

### Tests

- [ ] T038 [P] [US2] Test: GET /api/products/ — lista paginada
- [ ] T039 [P] [US2] Test: GET /api/products/?search= — búsqueda por nombre
- [ ] T040 [P] [US2] Test: GET /api/products/{id}/ — detalle con variantes e imágenes
- [ ] T041 [P] [US2] Test: GET /api/catalog/categories/ — lista de categorías

### Implementación

- [ ] T042 [P] [US2] ViewSet ProductViewSet (CRUD + filtros) en products/api/
- [ ] T043 [P] [US2] ViewSet CategoryViewSet en catalog/api/
- [ ] T044 [US2] Serializers de Producto, Variante, Imagen, Categoría
- [ ] T045 [US2] Permisos: admin crea/edita, público solo lectura
- [ ] T046 [US2] Checklist de validación (nombre, descripción, imagen, variante con stock)
- [ ] T047 [US2] Frontend: Página Catalog (grid + filtros) en frontend/src/pages/Catalog.jsx
- [ ] T048 [US2] Frontend: Página ProductDetail con selector de variante
- [ ] T049 [US2] Frontend: Componente ProductCard
- [ ] T050 [US2] Frontend: Componente CategoryFilter (sidebar desktop, modal mobile)

**Checkpoint**: US2 completa — usuarios navegan y ven productos

---

## Fase 5: User Story 3 — Carrito de Compras (P1)

**Goal**: Usuarios pueden agregar productos al carrito, modificar cantidades y ver resumen

**Test Independiente**: Agregar producto al carrito → cambiar cantidad → eliminar → ver total

### Tests

- [ ] T051 [P] [US3] Test: POST /api/cart/ — agregar item (autenticado)
- [ ] T052 [P] [US3] Test: GET /api/cart/ — ver carrito con items y total
- [ ] T053 [P] [US3] Test: PUT /api/cart/{id}/ — cambiar cantidad
- [ ] T054 [P] [US3] Test: DELETE /api/cart/{id}/ — eliminar item
- [ ] T055 [P] [US3] Test: POST /api/cart/ — sin auth → 401

### Implementación

- [ ] T056 [P] [US3] ViewSet CartViewSet en carts/api/
- [ ] T057 [US3] Serializers de Carrito e ItemCarrito
- [ ] T058 [US3] Lógica: carrito por usuario, stock validation
- [ ] T059 [US3] Frontend: Página Cart en frontend/src/pages/Cart.jsx
- [ ] T060 [US3] Frontend: CartContext (estado global del carrito)
- [ ] T061 [US3] Frontend: Componente CartItem con controles de cantidad

**Checkpoint**: US3 completa — flujo de compra hasta carrito funcional

---

## Fase 6: User Story 4 — Checkout y Pago (P1)

**Goal**: Usuarios completan compra con Wompi y ven confirmación

**Test Independiente**: Ir a checkout → ingresar dirección → pagar con Wompi → ver confirmación

### Tests

- [ ] T062 [P] [US4] Test: POST /api/checkout/ — crear pedido desde carrito
- [ ] T063 [P] [US4] Test: GET /api/orders/ — listar pedidos del usuario
- [ ] T064 [P] [US4] Test: GET /api/orders/{id}/ — detalle del pedido

### Implementación

- [ ] T065 [P] [US4] ViewSet CheckoutViewSet en checkout/api/ (o checkout/views.py)
- [ ] T066 [P] [US4] ViewSet OrderViewSet + AdminOrderViewSet en orders/api/
- [ ] T067 [US4] Serializers de Checkout, Pedido, ItemPedido
- [ ] T068 [US4] Integración Wompi (sandbox): creación de transacción, webhook
- [ ] T069 [US4] Lógica: vaciar carrito al crear pedido, calcular total, validar stock
- [ ] T070 [US4] Frontend: Página Checkout (dirección, resumen, pago)
- [ ] T071 [US4] Frontend: Página OrderConfirmation
- [ ] T072 [US4] Frontend: Página de órdenes del usuario (dashboard)

**Checkpoint**: US4 completa — e-commerce funcional de punta a punta

---

## Fase 7: User Story 5 — Editor 3D (P1)

**Goal**: Usuarios pueden visualizar y personalizar prendas en 3D

**Test Independiente**: Abrir editor 3D → cambiar color → agregar texto → guardar diseño

### Tests

- [ ] T073 [P] [US5] Test: GET /api/models3d/ — listar modelos 3D
- [ ] T074 [P] [US5] Test: POST /api/models3d/ — crear modelo 3D (autenticado)
- [ ] T075 [P] [US5] Test: PUT /api/models3d/{id}/ — actualizar configuración

### Implementación

- [ ] T076 [P] [US5] ViewSet Model3DViewSet en models3d/api/
- [ ] T077 [US5] Serializers de Model3D + Model3DImage
- [ ] T078 [US5] Integración Cloudinary para subida de assets 3D
- [ ] T079 [US5] Frontend: Componente ThreeJSCanvas (renderizado 3D base)
- [ ] T080 [US5] Frontend: Controls 3D (rotar, zoom, colores básicos)
- [ ] T081 [US5] Frontend: Panel de personalización (color picker, text input)
- [ ] T082 [US5] Frontend: Botón "Guardar diseño" + "Agregar al carrito"
- [ ] T083 [US5] Frontend: Integrar editor 3D en página de detalle de producto

**Checkpoint**: US5 completa — editor 3D funcional con personalización básica

---

## Fase 8: User Story 6 — Panel Administrativo (P2)

**Goal**: Administradores gestionan productos, usuarios, pedidos y ven dashboard

**Test Independiente**: Login admin → crear producto → ver usuarios → gestionar pedido

### Tests

- [ ] T084 [P] [US6] Test: POST /api/products/ — admin crea producto (autenticado admin)
- [ ] T085 [P] [US6] Test: DELETE /api/users/{id}/ — admin elimina usuario
- [ ] T086 [P] [US6] Test: GET /api/orders/all/ — admin lista todos los pedidos

### Implementación

- [ ] T087 [P] [US6] AdminViewSets: AdminProductViewSet, AdminUserViewSet, AdminOrderViewSet
- [ ] T088 [P] [US6] Serializers admin con campos extendidos
- [ ] T089 [US6] Frontend: AdminLayout con sidebar y theme toggle
- [ ] T090 [US6] Frontend: AdminDashboard con métricas
- [ ] T091 [US6] Frontend: AdminProducts + AdminProductDetail
- [ ] T092 [US6] Frontend: AdminUsers (CRUD + búsqueda)
- [ ] T093 [US6] Frontend: AdminOrders + AdminOrderDetail
- [ ] T094 [US6] Frontend: AdminCarts + AdminCartDetail
- [ ] T095 [US6] Frontend: AdminContact + AdminAudit

**Checkpoint**: US6 completa — administración integral

---

## Fase 9: Calidad y Pulido (Cross-Cutting)

- [ ] T096 [P] Pruebas de seguridad OWASP Top 10 (ZAP scan)
- [ ] T097 [P] Auditoría de accesibilidad WCAG 2.1 AA
- [ ] T098 [P] Optimización de rendimiento (Lighthouse, Core Web Vitals)
- [ ] T099 [P] Estrategia de carga de imágenes (Cloudinary transformations)
- [ ] T100 [P] Lazy loading de rutas frontend (React.lazy + Suspense)
- [ ] T101 [P] Caché de consultas frecuentes (django-caching)
- [ ] T102 Documentación de API actualizada (API_DOCUMENTATION.md)
- [ ] T103 Manual de usuario (SETUP_GUIDE.md actualizado)
- [ ] T104 README.md completo con badges, instrucciones, arquitectura
- [ ] T105 CHANGELOG.md + tags semánticos
- [ ] T106 Pruebas de integración cross-module (carrito → checkout → pedido)

---

## Dependencias y Orden de Ejecución

```
Fase 1 (Setup)
  └── Fase 2 (Fundacional) — BLOQUEA TODO
        ├── US1 (Auth) — P1
        ├── US2 (Catálogo) — P1
        ├── US3 (Carrito) — P1 — depende parcialmente de US1
        ├── US4 (Checkout) — P1 — depende de US1 + US3
        ├── US5 (3D) — P1 — depende de US2
        └── US6 (Admin) — P2 — depende de US1 + US2 + US4
              └── Fase 9 (Calidad)
```

### Estrategia de Implementación

1. **Setup + Fundacional**: Todos en paralelo
2. **Sprint 1**: US1 + US2 (paralelo — José+Elias en backend, Manrique+Tomas en frontend)
3. **Sprint 2**: US3 + US5 (paralelo)
4. **Sprint 3**: US4 (integra Wompi)
5. **Sprint 4**: US6 (admin panel)
6. **Fase 9**: Calidad y pulido (todos)

### Oportunidades Paralelas [P]

- Todas las tareas marcadas [P] pueden ejecutarse en paralelo
- Los modelos de datos de Fase 2 son independientes entre sí
- US1 y US2 pueden desarrollarse simultáneamente por distintas personas
- Frontend y backend de cada US pueden hacerse en paralelo
