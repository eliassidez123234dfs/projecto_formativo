# Changelog

Todas las versiones notables de RED Estampación se documentarán aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-09-05

### Added
- **Fusión selectiva de `feature/integracion-total`** en `recuperacion-estable`
- `authService.js`: módulo de autenticación con access token en memoria (OWASP A03:2021), patrón Observer, `restoreSession()`
- `middleware.py`: `RequestIDMiddleware` (trazabilidad), `ContentSecurityPolicyMiddleware` (XSS), `ExceptionLoggingMiddleware`
- `error_handler.py`: exception handler uniforme para DRF con clasificación por severidad
- `exceptions.py`: excepciones custom del dominio (`BaseAppException` y subclases)
- `validators.py`: validadores de contraseña (longitud, mayúscula, número, especial)
- `email_service.py`: servicio de emails transaccionales (verificación, recuperación, notificaciones)
- `tasks.py`: tareas Celery para emails asíncronos
- `wompi.py`: integración con pasarela de pagos Wompi
- `cache_utils.py`: decorator `cache_view_action` para cachear respuestas de ViewSets
- `admin_viewsets.py` (orders): admin CRUD de pedidos con acciones status/reprocess
- `invoice_viewset.py`: generación y consulta de facturas
- `VariantPickerModal.jsx`: modal reutilizable para selección de variante
- 25+ funciones API nuevas: checkout, reviews, invoices, categories CRUD, designs, product images
- `CartContext.jsx`: toast integrado, `reloadCart()`, documentación JSDoc
- Config flexible de settings.py: DB_TYPE, Redis, Celery, MongoDB, Wompi, Cloudinary (vía `.env`)

### Changed
- `api.js`: access token ahora se almacena en memoria (no localStorage), `clearAuth()`, `redirectLogin()`, `refreshSubscribers`
- `ProductCard.jsx`: usa `VariantPickerModal` en lugar de picker inline, `loading="lazy"` en imágenes
- `orders/models.py`: ciclo de vida ampliado (pendiente→pagado→producción→enviado→entregado→cancelado), `Invoice` model, `order_number` auto, campos envío/pago
- `users/models.py`: `UsuarioManager` con `create_user`/`create_superuser`, `token_version`, `check_password()`, auto-hash en `save()`
- `catalog/viewset.py`: `@cache_view_action` en endpoints, `CatalogSession` para registro de navegación, `filters` endpoint usa queryset base estático
- `settings.py`: configuración flexible con variables de entorno, HSTS, CSP, logging configurable

### Fixed
- Error 500 en "Ordenar por Más vendidos": `Count('cart_items')` → `Count('cartitem_set')`
- Slider de precio: commit-on-release con bounds estáticos desde `/catalog/filters/`
- Facets estáticos: `/catalog/filters/` ahora usa queryset base sin filtros activos
- Tests actualizados: status values en español ('pendiente' en vez de 'pending')
- Migración `users.0005` faked: columna `token_version` no existía en DB real → `createsuperuser` fallaba. Solución: fake-unapply + re-apply
- `rest_framework_simplejwt.token_blacklist` no estaba en `INSTALLED_APPS` → `OutstandingToken` sin manager, `cambiar_estado` devolvía 500
- Tests carts: `CartItem.subtotal` ahora multiplica Decimal correctamente (ya funcionaba, reporte desactualizado)

### Documentation
- 91 archivos de documentación organizados en 13 secciones
- Diagramas PlantUML: casos de uso, despliegue, clases, secuencia checkout
- Changelog, bitácora, workflow git, estrategia de pruebas

---

## [1.0.0-beta] - 2026-06-23

### Added
- Estructura inicial del proyecto (Django 5.2 + React 19 + Vite 8)
- Modelos de datos: Usuario, Producto, Variante, Categoría, Carrito, Pedido, Modelo3D
- Autenticación JWT con registro, login, verificación de email, recuperación de password
- API REST completa con 30+ endpoints
- Catálogo de productos con búsqueda, filtros por categoría y búsquedas populares
- Carrito de compras por sesión/usuario con merge al iniciar sesión
- Integración con Wompi (pasarela de pagos colombiana)
- Integración con Cloudinary (almacenamiento de imágenes)
- Panel administrativo completo (CRUD de productos, usuarios, pedidos, carritos)
- Editor 3D básico con Three.js para visualización de productos
- Envío de emails transaccionales (verificación, recuperación password)
- Docker Compose para desarrollo
- Documentación: README, SETUP_GUIDE, CONTRIBUTING, API_DOCUMENTATION
- Diagramas PlantUML de clases, casos de uso, secuencia y despliegue
- GitFlow configurado con ramas main, integracion-total, y ramas por desarrollador
- Sistema de 4 capas de seguridad (Auth JWT, Roles, Validación, Auditoría)
- Notificaciones toast con react-hot-toast
- Diseño responsivo con Bootstrap y tema claro/oscuro

## [0.9.0-alpha] - 2026-06-10

### Added
- Configuración inicial del monorepo con Docker Compose
- Esqueleto del backend Django con estructura de apps
- Esqueleto del frontend React con Vite y TypeScript
- Modelo Usuario con autenticación básica
- Configuración de PostgreSQL y variables de entorno

### Changed
- Refactorización de la estructura de carpetas backend a apps modulares

### Security
- Implementación inicial de hashing de contraseñas con Argon2
- Validación de entrada en modelos con `full_clean()`

## [0.8.0-prealpha] - 2026-05-20

### Added
- Configuración inicial del proyecto Django y React
- Dependencias base y archivos de configuración
- Integración continua básica con GitHub Actions
- Plantillas de issues y PRs en `.github/`

### Fixed
- Corrección en configuración de CORS para desarrollo local
- Ajuste de zona horaria a America/Bogota
