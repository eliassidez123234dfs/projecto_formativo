# Bitácora de Trabajo - RED Estampación

> Registro cronológico del desarrollo del proyecto. Cada entrada documenta avances,
> decisiones técnicas, problemas encontrados y soluciones implementadas.

---

## Semana 1 — Febrero 2026

### Días 1-2: Configuración inicial del proyecto

- Inicialización del repositorio Git con estructura de ramas GitFlow progresivo (`main` → `integracion-total` → ramas personales).
- Creación del proyecto Django con Python 3.12 y configuración del entorno virtual.
- Inicialización del proyecto frontend con React 19 + Vite 8 + Tailwind CSS.
- Configuración de `docker-compose.yml` para PostgreSQL, Redis y servicios auxiliares.
- Instalación y configuración de `django-environ` para manejo de variables de entorno.

### Día 3-4: Definición de arquitectura

- Definición del stack tecnológico definitivo (Django 5.2, DRF 3.16, React 19, Three.js, Cloudinary, Wompi).
- Creación de la estructura modular del backend: `apps/` con `users`, `products`, `catalog`, `carts`, `orders`, `checkout`, `landing`, `models3d`, `management`.
- Configuración del sistema de autenticación JWT con `djangorestframework-simplejwt`.
- Documentación inicial de la arquitectura en `docs/`.

### Día 5: Configuración de herramientas

- Instalación y configuración de herramientas de calidad: `black`, `ruff`, `mypy`.
- Configuración de pre-commit hooks para linting y detección de secretos con `ggshield`.
- Instalación de extensiones de VS Code/Cursor para el equipo.

---

## Semana 2-3 — Marzo 2026

### Día 6-8: Modelo de datos — Usuarios

- Implementación del modelo `Usuario` con campos de estado, rol, verificación de email, bloqueo por intentos fallidos y soft delete.
- Implementación de `Token_Verificacion` para flujos de verificación de email, recuperación de contraseña y cambio de email.
- Implementación de `Cambio_Email` para gestionar solicitudes de cambio de correo electrónico.
- Implementación de `Historial_Estado_Usuario` para auditar cambios de estado.
- Migraciones de base de datos e índices optimizados para búsquedas frecuentes.

### Día 8-10: Modelo de datos — Productos

- Implementación del modelo `Product` con campo `base_price`, validación de precio, y propiedades calculadas (`can_be_published`, `checklist`, `has_active_order_items`).
- Implementación de `ProductImage` con soporte para Cloudinary, validación de formato (solo JPG/PNG), tamaño máximo (2MB), resolución mínima (400x400px) y máximo 5 imágenes por producto.
- Implementación de `Variant` con combinación única talla+color, límite de 4 tallas y 10 colores por producto, y control de stock.
- Implementación de `ProductAudit` para seguimiento de cambios (creado, actualizado, publicado).
- Validaciones exhaustivas con `clean()` y `full_clean()` en `save()`.

### Día 11-12: Catálogo y landing

- Implementación de `Category` con relación M2M a `Product` via `ProductCategory`.
- Implementación de `SearchHistory`, `CatalogFilter` y `PopularSearch` para el sistema de búsqueda y filtrado del catálogo.
- Implementación de `Contacto` para el formulario de contacto de la landing page.
- Índices y optimizaciones de consultas.

---

## Semana 4-5 — Abril 2026

### Día 13-16: CRUD de productos y catálogo

- Implementación de `ProductViewSet` con permisos `IsAuthenticatedOrReadOnly`.
- Implementación de `CategoryViewSet` (solo lectura para visitantes).
- Serializadores especializados: `ProductListSerializer`, `ProductDetailSerializer`, `ProductCreateSerializer`.
- Endpoints REST completos para el catálogo con filtrado, búsqueda y paginación.
- Endpoint público de landing con productos destacados y formulario de contacto.

### Día 17-18: Integración con Cloudinary

- Implementación de `CloudinaryService` como adapter para la API de Cloudinary.
- Configuración de subida de imágenes de productos con transformaciones (formato automático, calidad optimizada).
- Integración de `Model3D` y `Model3DImage` para almacenamiento de modelos 3D (GLB/GLTF/OBJ/FBX/DAE).
- Subida de assets a Cloudinary con `cloudinary_public_id` para gestión posterior.

### Día 19-20: Autenticación y registro

- Endpoints REST para registro de usuario, inicio de sesión (JWT), refresco de token y cierre de sesión.
- Implementación de verificación de email mediante tokens.
- Flujo completo de recuperación de contraseña (solicitud → token → restablecimiento).
- Flujo de cambio de email con verificación en dos pasos.
- Rate limiting en endpoints de autenticación.

---

## Semana 6-7 — Mayo 2026

### Día 21-23: Carrito de compras

- Implementación de `Cart` con soporte para usuarios autenticados y sesiones anónimas (via `session_key`).
- Implementación de `CartItem` con validación de stock, producto activo, y combinación única producto+variante+carrito.
- Endpoints REST: agregar item, actualizar cantidad, eliminar item, listar carrito actual.
- Cálculo de subtotales y total del carrito en backend.
- Sincronización de carrito anónimo → usuario autenticado al iniciar sesión.

### Día 23-25: Integración con Wompi (pasarela de pago)

- Implementación de `WompiService` como adapter para la API REST de Wompi.
- Endpoint `POST /api/checkout/init/` que crea la orden y genera transacción en Wompi.
- Implementación de webhook `POST /api/webhook/wompi/` para recibir notificaciones de pago.
- Manejo de estados: pendiente → pagado / rechazado / cancelado.
- Descuento de stock al confirmar el pago.
- Validación de firma HMAC en webhooks.

### Día 26-28: Panel administrativo

- Personalización del admin de Django para todos los modelos.
- Dashboard administrativo con métricas clave (productos más vendidos, órdenes por estado, usuarios registrados).
- Gráficos de ventas mensuales y rendimiento de productos.
- Implementación de `Log_Auditoria` para registrar todas las acciones administrativas (crear, actualizar, eliminar usuarios/productos/pedidos).
- Filtros avanzados y búsqueda en el panel.

---

## Semana 8-9 — Junio 2026

### Día 29-30: Editor 3D

- Integración de Three.js + `@react-three/fiber` + `@react-three/drei` para visualización y edición 3D.
- Carga de modelos GLB/GLTF desde Cloudinary.
- Personalización de texturas, colores y logos sobre modelos 3D.
- Captura de imagen del diseño personalizado (Base64) para guardar en la orden.
- Ajustes de rendimiento: lazy loading, memoización, reducción de polígonos.

### Día 31-32: Corrección de errores y pruebas

- Corrección de errores en validación de productos (imagen principal, variantes con stock).
- Corrección en flujo de checkout: manejo de errores de Wompi, reintentos.
- Corrección en sincronización de carrito anónimo → usuario.
- Pruebas de integración para flujo completo: registro → login → agregar carrito → checkout → pago → confirmación.

### Día 33-34: Documentación del proyecto

- Documentación de la API REST completa en `API_DOCUMENTATION.md`.
- Guía de configuración (`SETUP_GUIDE.md`) y despliegue (`PRODUCTION_CHECKLIST.md`).
- Estrategia de testing (`TEST_STRATEGY.md`) y características BDD (`BDD_FEATURES.md`).
- Diagramas de arquitectura y modelos en `docs/diagrams/`.
- Documentación de patrones de diseño en `docs/PATRONES_DISENO.md`.

### Día 35: Configuración de GitFlow

- Configuración de ramas: `main` (producción), `integracion-total` (integración), ramas personales (`jose`, `elias`, `tomas`, `manrique`) y `fix/*`.
- Políticas de merge: PR obligatorios a `integracion-total`, revisión por al menos un miembro.
- Configuración de GitHub Actions para CI: linting, tests, type checking.
- Protección de rama `main` con estado de checks obligatorio.

---

## Resumen de hitos

| Hito | Fecha | Estado |
|------|-------|--------|
| Configuración del proyecto | Febrero 2026 | ✅ Completo |
| Modelos de datos | Marzo 2026 | ✅ Completo |
| CRUD de productos y catálogo | Abril 2026 | ✅ Completo |
| Integración Cloudinary | Abril 2026 | ✅ Completo |
| Autenticación JWT | Abril 2026 | ✅ Completo |
| Carrito de compras | Mayo 2026 | ✅ Completo |
| Integración Wompi | Mayo 2026 | ✅ Completo |
| Panel administrativo | Mayo 2026 | ✅ Completo |
| Editor 3D | Junio 2026 | ✅ Completo |
| Corrección de errores | Junio 2026 | ✅ Completo |
| Documentación | Junio 2026 | ✅ Completo |
| GitFlow / CI | Junio 2026 | ✅ Completo |

---

> **Última actualización:** Junio 2026
> **Responsable:** Equipo RED Estampación
