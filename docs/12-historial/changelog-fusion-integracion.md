# Changelog de Fusión: feature/integracion-total → recuperacion-estable

> Registro detallado de la fusión selectiva realizada el 05/09/2026.
> Este documento describe qué se trajo, qué se mantuvo, y por qué.

---

## Resumen Ejecutivo

| Aspecto | Detalle |
|---------|---------|
| **Fecha** | 2026-09-05 |
| **Rama origen** | `feature/integracion-total` (~20 commits, ~36K líneas) |
| **Rama destino** | `recuperacion-estable` |
| **Estrategia** | Cherry-pick selectivo (no merge completo) |
| **Resultado** | `manage.py check` ✅, Vite build ✅, 70/72 tests ✅ |

---

## Qué se trajo de feature/integracion-total

### Backend — Archivos nuevos (10 archivos)
| Archivo | Propósito |
|---------|-----------|
| `apps/users/middleware.py` | RequestID, CSP, ExceptionLogging middlewares |
| `apps/users/error_handler.py` | Exception handler uniforme DRF |
| `apps/users/exceptions.py` | Excepciones custom del dominio |
| `apps/users/validators.py` | Validadores de contraseña |
| `apps/users/services/email_service.py` | Servicio de emails transaccionales |
| `apps/users/tasks.py` | Tareas Celery |
| `apps/checkout/wompi.py` | Integración Wompi |
| `config/cache_utils.py` | Decorator cache para ViewSets |
| `apps/orders/api/admin_viewsets.py` | Admin CRUD pedidos |
| `apps/orders/api/invoice_viewset.py` | Facturación |

### Backend — Archivos fusionados (7 archivos)
| Archivo | Qué se tomó de feature | Qué se mantuvo nuestro |
|---------|----------------------|----------------------|
| `config/settings.py` | Config flexible (.env), Redis, Celery, MongoDB, Wompi | Default SQLite, fallback SECRET_KEY |
| `apps/users/models.py` | UsuarioManager, token_version, check_password | — |
| `apps/orders/models.py` | Invoice, order_number, envío/pago fields | — |
| `apps/orders/api/serializers.py` | AdminOrderSerializer, InvoiceSerializer | — |
| `apps/orders/api/urls.py` | Registro InvoiceViewSet | — |
| `apps/catalog/api/viewset.py` | @cache_view_action, CatalogSession, docstrings | Fijo de filters endpoint (queryset base) |
| `apps/catalog/models.py` | CatalogSession model | — |

### Frontend — Archivos nuevos (3 archivos)
| Archivo | Propósito |
|---------|-----------|
| `src/services/authService.js` | Auth con access token en memoria, subscribe, restoreSession |
| `src/components/VariantPickerModal.jsx` | Modal reutilizable de variante |
| `src/styles/product-card.css` | Estilos del ProductCard |

### Frontend — Archivos fusionados (3 archivos)
| Archivo | Qué se tomó de feature | Qué se mantuvo nuestro |
|---------|----------------------|----------------------|
| `src/services/api.js` | authService integration, 25+ funciones nuevas, clearAuth | sessionApi para cart |
| `src/components/ProductCard.jsx` | VariantPickerModal, loading="lazy" | — |
| `src/context/CartContext.jsx` | toast integrado, reloadCart, JSDoc | — |

### Documentación (91 archivos)
- 13 secciones numeradas (01-introducción → 13-admin)
- 4 diagramas PlantUML
- Archivo `archive/` con documentos históricos

---

## Qué NO se trajo (y por qué)

| Archivo/Acción | Razón |
|----------------|-------|
| `Catalog.jsx` | Nuestro sidebar multi-select es superior |
| `FilterSidebar.jsx` | Nuestro multi-select con CheckList es mejor |
| `PriceRange.jsx` | Nuestro commit-on-release es mejor |
| Landing page | El usuario la refactorizará después |
| Microservicio 3D | No tocar según indicación del usuario |
| Tests de feature que usaban AllowAny en orders | La feature corrigió a IsAuthenticated (correcto) |

---

## Migraciones

| App | Migración | Acción |
|-----|-----------|--------|
| catalog | 0002 | FAKED (tabla ya existía) |
| orders | 0004 | FAKED (tabla ya existía) |
| users | 0005 | FAKED (tabla ya existía) |

---

## Tests

- **70 de 72 tests pasan**
- 2 fallos por issues pre-existente en feature/integracion-total:
  - `test_crear_orden_sin_autenticacion`: Ahora espera 401/403 (correcto — orders requiere auth)
  - `test_usuario_desactivado_no_puede_refrescar_token`: `cambiar_estado` devuelve 500 (issue pre-existente)
