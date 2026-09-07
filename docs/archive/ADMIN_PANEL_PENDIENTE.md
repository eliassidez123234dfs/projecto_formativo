# Panel Admin — Estado Actual y Pendientes

> Documento independiente que detalla qué funciona, qué falta y qué mejorar en el panel de administración del proyecto RED Estampación.

---

## 1. Lo que sí funciona hoy

### Backend (API)

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/admin/stats/` | GET | Estadísticas agregadas: usuarios, productos, órdenes, ventas |
| `/api/admin/usuarios/` | GET/POST | CRUD de usuarios con paginación, filtros y búsqueda |
| `/api/admin/usuarios/{id}/` | PATCH | Editar usuario individual |
| `/api/admin/usuarios/{id}/cambiar_estado/` | POST | Cambiar estado (Activo/Inactivo/Bloqueado) |
| `/api/admin/usuarios/{id}/desbloquear/` | POST | Desbloquear cuenta |
| `/api/admin/usuarios/{id}/resetear_password/` | POST | Resetear contraseña y enviar temporal |
| `/api/admin/usuarios/{id}/eliminar_logicamente/` | POST | Soft-delete de usuario |
| `/api/admin/usuarios/suggest/` | GET | Sugerencias typeahead para búsqueda |
| `/api/admin/usuarios/auditoria/` | GET | Log de auditoría paginado y filtrable |
| `/api/admin/carts/` | GET | Listar todos los carritos |
| `/api/admin/carts/{id}/` | GET | Detalle de carrito con items |
| `/api/products/{id}/toggle-active/` | PATCH | Activar/desactivar producto |
| `/api/products/{id}/publish/` | POST | Publicar/aprobar producto |
| `/api/products/{id}/audits/` | GET | Trail de auditoría del producto |
| `/api/contacto/` | GET | Listar mensajes de contacto |
| `/api/contacto/{id}/marcar_leido/` | POST | Marcar mensaje como leído |
| `/api/contacto/{id}/eliminar/` | DELETE | Eliminar mensaje |

### Frontend (Páginas)

| Ruta | Componente | Estado |
|------|------------|--------|
| `/admin-products` | `AdminProducts.jsx` | Lista productos con stats y toggle activo |
| `/admin-products/detail/:id` | `AdminProductDetail.jsx` | Detalle completo + variantes + imágenes + auditoría |
| `/admin-users` | `AdminUsers.jsx` | CRUD de usuarios con filtros |
| `/admin-cart` | `AdminCart.jsx` | Lista carritos |
| `/admin-cart/:id` | `AdminCartDetail.jsx` | Detalle carrito con items |
| `/admin-contact` | `AdminContact.jsx` | Bandeja de mensajes de contacto |
| `/admin-audit` | `AdminAudit.jsx` | Log de auditoría del sistema |
| `/dashboard` | `Dashboard.jsx` | Dashboard mixto (stats admin + perfil usuario) |

### Permisos

- Backend: `AdminPermission` (DRF) verifica `rol == 'Administrador'` y `estado == 'Activo'`
- Frontend: guard básico leyendo `localStorage` en cada página

---

## 2. Funcionalidades faltantes

### Críticas

| # | Funcionalidad | Detalle |
|---|--------------|---------|
| 1 | **Gestión de órdenes** | No existe página frontend para listar/detalle/actualizar órdenes. El backend tiene modelos `Order`/`OrderItem` pero no hay endpoint admin de órdenes ni UI. |
| 2 | **Flujo de aprobación de productos** | No hay vista dedicada para revisar, aprobar o rechazar productos pendientes. Falta UI para el endpoint `publish`. |
| 3 | **Dashboard admin dedicado** | `/dashboard` mezcla perfil de usuario con stats admin. No hay landing page admin con acceso centralizado a todas las herramientas. |
| 4 | **Sidebar/Navegación admin** | `AdminLayout.jsx` existe pero no se usa. Todas las páginas admin usan `MainLayout` (público). No hay navegación persistente entre secciones admin. |

### Importantes

| # | Funcionalidad | Detalle |
|---|--------------|---------|
| 5 | **Protección de rutas centralizada** | Cada página duplica el chequeo de `localStorage.getItem('usuario')`. No hay `ProtectedRoute` que envuelva las rutas admin. |
| 6 | **Filtros en auditoría** | El backend soporta filtrar por admin, usuario afectado y rango de fechas. El frontend no expone estos filtros. |
| 7 | **Reportes/estadísticas** | El sidebar de `AdminLayout` tiene un enlace a `/admin-reports` que no existe. No hay vistas de reportes, gráficos, exportación CSV. |
| 8 | **Modelos 3D (admin)** | Existe `Model3D` admin en Django pero no hay página frontend para gestionar modelos 3D (subir, aprobar, listar). |

### Menores

| # | Funcionalidad | Detalle |
|---|--------------|---------|
| 9 | **Registro en Django admin** | `Usuario`, `Log_Auditoria`, `Historial_Estado_Usuario`, `Token_Verificacion`, `Contacto` no están registrados en el admin de Django. |
| 10 | **Notificaciones en tiempo real** | Los mensajes de contacto requieren recarga manual. Sin polling ni WebSockets. |
| 11 | **Roles granular** | Solo existen `Administrador` y `Usuario`. No hay roles intermedios (Moderador, Editor, Soporte). |
| 12 | **Confirmaciones en acciones destructivas** | Algunas acciones (eliminar usuario, borrar mensaje) no tienen diálogo de confirmación. |
| 13 | **Paginación consistente** | No todas las listas admin tienen paginación visible con controles estándar. |
| 14 | **Feedback visual de carga/error** | Varias páginas no muestran spinner de carga ni mensaje de error cuando la API falla. |

---

## 3. Deuda técnica

| # | Problema | Impacto |
|---|----------|---------|
| 1 | `AdminLayout.jsx` es código muerto (nunca se importa) | Mantenimiento engañoso, confunde a nuevos desarrolladores |
| 2 | Guard de permisos en frontend usa `localStorage` — datos stale o manipulables | Seguridad cosmética, aunque backend valida correctamente |
| 3 | Sin TypeScript | Propenso a errores en props y estados admin |
| 4 | Sin tests en frontend admin | No hay seguridad al refactorizar páginas admin |
| 5 | Sin tests en backend admin viewsets | Endpoints admin sin cobertura |
| 6 | CSS admin inexistente (`admin.css` solo importa `main-layout.css`) | Sin estilos propios para tablas, tarjetas, formularios admin |

---

## 4. Orden sugerido de implementación

1. Activar `AdminLayout` como layout de todas las páginas admin (navegación persistente)
2. Agregar ruta `/admin-orders` con listado + detalle de órdenes
3. Agregar ruta `/admin-products/approval` para revisar y aprobar productos
4. Crear `ProtectedRoute` componente para centralizar guard de permisos
5. Dashboard admin dedicado en `/admin` con cards de acceso rápido
6. Agregar filtros de auditoría en el frontend
7. Registrar modelos faltantes en Django admin
8. Agregar confirmaciones en acciones destructivas
9. Agregar spinners y estados vacío/error en páginas admin
10. Paginación consistente con controles estándar
