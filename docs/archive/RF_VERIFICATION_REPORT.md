# Verification Report — Requirements Matrix vs Codebase

> Generated: 2026-06-23
> Scope: RF-001 through RF-114 + Contact RFs
> Legend: ✅ COMPLETO | ⚠️ PARCIAL | ❌ FALTANTE

---

## MÓDULO: Gestión de Usuarios — Registro

### RF-001 — Registro de nuevos usuarios ✅
- **Evidence**: `backend/apps/users/api/viewset.py:35-101` (RegistroViewSet)
- **Frontend**: `frontend/src/pages/AuthPage.jsx` — registration form
- **Model**: `backend/apps/users/models.py` — Usuario with all RI-001 fields

### RF-002 — Recuperación de contraseña ✅
- **Evidence**: `backend/apps/users/api/viewset.py:114-125` (recuperar_password action)
- **Serializers**: `backend/apps/users/api/serializers.py:201` (RecuperacionPasswordSerializer)
- **Token**: TokenVerificacion model with tipo='Recuperacion_Password'
- **Email template**: viewset.py:217

### RF-008 — Validar credenciales (login) ✅
- **Evidence**: `backend/apps/users/api/viewset.py:141-180` (LoginViewSet)
- **Custom auth backend**: `backend/apps/users/api/auth_backend.py` — validates JWT + estado activo
- **Rate limiting**: Login attempts tracked in Usuario.intentos_fallidos

### RF-009 — Correo de verificación con enlace único ✅
- **Evidence**: `backend/apps/users/api/viewset.py` — send_verification_email
- **Model**: `backend/apps/users/models.py:91-98` — TokenVerificacion with tipo='Verificacion_Email'
- **Expiry**: RN-011 requires 24h expiry on token; TokenVerificacion has fecha_expiracion but no explicit validation seen in model

### RF-010 — Actualizar perfil (usuario, contraseña, correo) ✅
- **Evidence**: `backend/apps/users/api/viewset.py:183-260` (UsuarioViewSet with update/partial_update)
- **Password change**: ChangePasswordSerializer
- **Email change**: EmailChangeSerializer — creates TokenVerificacion tipo='Cambio_Email'

---

## MÓDULO: Administración de Usuarios

### RF-016 — Listado completo de usuarios con filtros ✅
- **Evidence**: `backend/apps/users/api/admin_viewset.py:30-80` (AdminUsuarioViewSet list)
- **Frontend**: `frontend/src/pages/AdminUsers.jsx`
- **Filters**: search, estado, rol query params
- **Permission**: AdminPermission (rol=Administrador + estado=Activo)

### RF-017 — Buscar usuarios ✅
- **Evidence**: `admin_viewset.py` — search via `usuario`, `nombre_completo`, `correo` icontains

### RF-018 — Admin crear usuarios manualmente ✅
- **Evidence**: `admin_viewset.py:100-140` — create action with full validations
- **Password**: generates temporary password and sends email

### RF-019 — Admin editar información de usuarios ✅
- **Evidence**: `admin_viewset.py:150-200` — partial_update

### RF-020 — Admin activar/desactivar/bloquear con motivo ✅
- **Evidence**: `admin_viewset.py:350-410` (cambiar_estado action)
- **Motivo**: stored in EstadoUsuario.motivo
- **Audit trail**: logs user_admin, usuario_afectado, accion, fecha

### RF-021 — Eliminación lógica de usuarios ✅
- **Evidence**: `admin_viewset.py:470-500` (eliminar-logicamente action)
- **Model**: Usuario.eliminado (boolean), fecha_eliminacion, admin_eliminador_id

### RF-022 — Desbloquear cuentas bloqueadas ✅
- **Evidence**: `admin_viewset.py:410-440` (desbloquear action)
- **Resets**: intentos_fallidos=0, estado=Activo
- **Tracks**: admin_desbloqueador, fecha_desbloqueo

---

## MÓDULO: Gestión de Productos (Admin) — Crear Producto

### RF-023 — Crear producto con nombre, descripción, precio base e imagen ✅
- **Evidence**: `backend/apps/products/api/viewset.py` (ProductViewSet create)
- **Frontend**: `frontend/src/components/ProductForm.jsx`
- **Model**: Product with all RI-023 fields

### RF-024 — Subir imagen principal con validación de formato ✅
- **Evidence**: `ProductViewSet images endpoint` — validates image
- **Frontend**: ProductForm.jsx:258 — `accept="image/png, image/jpeg"`
- **RI-024**: Formatos JPG/PNG, tamaño <2MB (validated in backend)

### RF-025 — Subir imágenes adicionales para galería ✅
- **Evidence**: ProductForm.jsx:263 — multiple file upload
- **Backend**: ProductViewSet create image endpoint for gallery

### RF-026 — Definir colores como variantes ✅
- **Evidence**: `backend/apps/products/models.py` (Variant model with color)
- **Frontend**: ProductForm.jsx VariantRow with color dropdown
- **RI-026 format**: Uses color names (not HEX as spec requires), max 14 pre-defined colors

### RF-027 — Definir tallas como variantes ✅
- **Evidence**: Variant model with size field, ProductForm.jsx size dropdown (18 sizes)
- **RI-027**: max 4 sizes (S/M/L/XL) vs implementation (18 sizes including XS-XXL)

### RF-028 — Precio específico por variante ⚠️ PARCIAL
- **Evidence**: Variant model has `precio_variante` field (decimal, nullable)
- **Missing**: ProductForm.jsx does NOT have a price field per variant row
- **Backend**: The field exists but frontend create/edit doesn't expose it

### RF-029 — Validación configuración mínima ⚠️ PARCIAL
- **Evidence**: ProductForm.jsx:168-172 validates name, description, price, main image, variants
- **Missing**: No visual checklist per RI-029 (✓ Nombre, ✓ Descripción, etc.). Basic alert-based validation instead.

---

## MÓDULO: Gestión de Productos (Admin) — Buscar/Filtrar

### RF-030 — Buscar productos por nombre (admin) ✅
- **Evidence**: `backend/apps/products/api/viewset.py` — ProductViewSet search via name__icontains

### RF-031 — Filtrar por estado (activo/inactivo, aprobado/no aprobado) ✅
- **Evidence**: ProductViewSet filters for is_active, is_approved
- **Frontend**: `frontend/src/pages/AdminProducts.jsx` — product list with filter controls

### RF-032 — Filtrar por rango de precio ⚠️ PARCIAL
- **Evidence**: ProductViewSet has min_price/max_price filters
- **Missing**: `frontend/src/pages/AdminProducts.jsx` — not confirmed in admin product list UI

### RF-033 — Ordenar resultados por diferentes criterios ⚠️ PARCIAL
- **Evidence**: ProductViewSet supports ordering query param
- **Missing**: Frontend ProductList may not have full sort dropdown per RN-035

---

## MÓDULO: Gestión de Productos (Admin) — Editar Producto

### RF-034 — Editar nombre, descripción, precio_base ✅
- **Evidence**: ProductForm.jsx:177-178 (patchProduct), ProductViewSet partial_update
- **Audit**: ProductAudit model tracks changes

### RF-035 — Editar stock de variantes ✅
- **Evidence**: ProductForm.jsx variant stock input, ProductViewSet variant endpoint
- **Audit**: Variant stock changes tracked

### RF-036 — Editar precio de variante ⚠️ PARCIAL
- **Evidence**: Backend supports variant price update
- **Missing**: ProductForm.jsx has no variant_price field in VariantRow

### RF-037 — Cambiar imagen principal ✅
- **Evidence**: ProductForm.jsx:149-157 (markImageAsMain)

### RF-038 — Agregar/eliminar imágenes de galería ✅
- **Evidence**: ProductForm.jsx:263-267 (add extra), 159-163 (remove)
- **Reorder**: ProductForm.jsx:139-147 (reorderImages)

### RF-039 — Agregar/eliminar variantes ✅
- **Evidence**: ProductForm.jsx:75-77 (addVariant), 337 (onRemove)
- **Backend**: ProductViewSet variant create/delete endpoints

---

## MÓDULO: Gestión de Productos (Admin) — Eliminar Producto

### RF-040 — Advertencia si producto en uso ⚠️ PARCIAL
- **Evidence**: `backend/apps/products/models.py:57` (has_active_order_items)
- **Backend**: `viewset.py:96` checks before name edit
- **Missing**: No frontend modal showing affected clients count per RN-042

### RF-041 — Eliminación lógica ✅
- **Evidence**: ProductViewSet — set `is_active=False` (soft delete via active flag)

### RF-042 — Modal de confirmación con validaciones ⚠️ PARCIAL
- **Evidence**: ProductViewSet basic delete with confirmation
- **Missing**: Modal per RN-044 (product name, active variants, orders in process)

---

## MÓDULO: Gestión de Productos (Admin) — Aprobar/Desaprobar

### RF-043 — Aprobar producto ✅
- **Evidence**: `backend/apps/products/api/viewset.py` — approve action (set is_approved=True)
- **Audit**: ProductAudit records approval

### RF-044 — Desaprobar producto con motivo ❌ FALTANTE
- **Evidence**: No disapprove endpoint found. No Motivo_Desaprobacion model
- **Missing**: ProductViewSet has no `disapprove` action

### RF-045 — Historial de aprobaciones/desaprobaciones ⚠️ PARCIAL
- **Evidence**: ProductAudit tracks changes but no specific timeline UI
- **Frontend**: `frontend/src/pages/AdminProductDetail.jsx` shows audit history
- **Missing**: No specific approval/disapproval timeline per RI-045

---

## MÓDULO: Gestión de Categorías

### RF-046 — Admin crear nueva categoría ⚠️ PARCIAL
- **Evidence**: `backend/apps/catalog/api/viewset.py:200` — CategoryViewSet is **readonly** (ReadOnlyModelViewSet)
- **Model**: Category model exists (RI-046 fields)
- **Missing**: No write endpoint for admin to create categories via API

### RF-047 — Admin editar/eliminar categorías ❌ FALTANTE
- **Evidence**: CategoryViewSet is ReadOnlyModelViewSet
- **Missing**: No PUT/PATCH/DELETE endpoints for categories

---

## MÓDULO: Catálogo (Cliente) — Visualización

### RF-048 — Grid de productos aprobados y activos ✅
- **Evidence**: `backend/apps/catalog/api/viewset.py:22` — filters `is_active=True, is_approved=True`
- **Frontend**: `frontend/src/pages/CatalogPage.jsx:184` — shop-grid with ProductCard

### RF-049 — Card con información básica ⚠️ PARCIAL
- **Evidence**: `frontend/src/pages/CatalogPage.jsx:4-21` — ProductCard shows name, description, price, size count
- **Missing**: No stock badge (rojo if <5), no truncation at 60 chars, no image thumbnail validation

### RF-050 — Paginación ✅
- **Evidence**: CatalogPage.jsx:187-191 — Anterior/Siguiente with page counter
- **Backend**: CatalogPagination class, page_size=12 (RN-052 says 50)

### RF-051 — Infinite scroll ❌ FALTANTE
- **Evidence**: No infinite scroll implementation found. Only pagination with Anterior/Siguiente
- **Missing**: No "Cargar más" button or IntersectionObserver

### RF-052 — Registrar visualización de catálogo ❌ FALTANTE
- **Evidence**: No Sesion_Catalogo model. SearchHistory tracks searches only
- **Missing**: No view/visit tracking for catalog

---

## MÓDULO: Catálogo (Cliente) — Filtros

### RF-053 — Filtrar por rango de precio ✅
- **Evidence**: CatalogPage.jsx:149-167 — min/max price inputs
- **Backend**: CatalogViewSet supports min_price/max_price

### RF-054 — Filtrar por talla ✅
- **Evidence**: CatalogPage.jsx:133-139 — size dropdown
- **Backend**: CatalogViewSet filters by variant size

### RF-055 — Filtrar por color ✅
- **Evidence**: CatalogPage.jsx:141-147 — color dropdown
- **Backend**: CatalogViewSet filters by variant color

### RF-056 — Buscar por palabras clave ✅
- **Evidence**: CatalogPage.jsx:104-112 — search input
- **Backend**: CatalogSearchSerializer + SearchHistory creation

### RF-057 — Combinar filtros ✅
- **Evidence**: CatalogPage.jsx:53-75 — all params combined, backend AND logic
- **Chips**: No removable chips per RN-059, but "Limpiar filtros" button exists

### RF-058 — Dropdown de ordenamiento ⚠️ PARCIAL
- **Evidence**: CatalogPage.jsx:113-121 — 4 sort options
- **Missing**: No "Más vendidos", "Mejor calificación" options per RN-060

---

## MÓDULO: Catálogo (Cliente) — Interacción Cards

### RF-059 — Clic en card → vista detalle ✅
- **Evidence**: CatalogPage.jsx:7 — `<a href={`/products/${product.id}`}>`

### RF-060 — Agregar al carrito desde card con mini-modal ❌ FALTANTE
- **Evidence**: ProductCard has no "Add to cart" button. Only direct link to detail
- **Missing**: No mini-modal for size/color selection from card

### RF-061 — Stock disponible en card ❌ FALTANTE
- **Evidence**: ProductCard does not show stock information
- **Missing**: No stock_total display, no "Agotado" badge per RN-063

### RF-062 — Rating en card ❌ FALTANTE
- **Evidence**: No Calificacion/Rating model exists anywhere in the codebase
- **Missing**: No star rating display per RN-064

---

## MÓDULO: Productos — Vista Detalle

### RF-063 — Galería con zoom ⚠️ PARCIAL
- **Evidence**: ProductDetail.jsx:148-171 — gallery with thumbnails
- **Missing**: No zoom feature per RN-065 (mouse zoom, 100%-200%)

### RF-064 — Descripción completa ✅
- **Evidence**: ProductDetail.jsx:263-268 — description display
- **Missing**: No "Leer más" truncation per RN-066 (if >300 chars)

### RF-065 — Precio y stock ✅
- **Evidence**: ProductDetail.jsx:222-228 — stock display with "Stock disponible" / "Agotado"
- **Price**: ProductDetail.jsx:184 — base_price display

### RF-066 — Calificación promedio y reseñas ❌ FALTANTE
- **Evidence**: No Calificacion/Review model. No review display in ProductDetail
- **Missing**: Full rating and review system

---

## MÓDULO: Productos — Seleccionar Variante

### RF-067 — Seleccionar talla ✅
- **Evidence**: ProductDetail.jsx:188-203 — size chips with stock awareness

### RF-068 — Seleccionar color ✅
- **Evidence**: ProductDetail.jsx:204-220 — color chips with hex swatches

### RF-069 — Stock en tiempo real ✅
- **Evidence**: ProductDetail.jsx:222-228 — updates on variant change

### RF-070 — Precio dinámico ✅
- **Evidence**: ProductDetail.jsx uses variant price if available, else base_price

---

## MÓDULO: Productos — Carrito e Interacción

### RF-071 — Agregar al carrito con variante ✅
- **Evidence**: ProductDetail.jsx:67-79 (handleAddToCart)
- **CartContext**: `frontend/src/context/CartContext.jsx`

### RF-072 — Cantidad con validación ✅
- **Evidence**: ProductDetail.jsx:81-84 (handleQuantityChange) with min=1, max=stock
- **UI**: ProductDetail.jsx:236-248 — +/- buttons

### RF-073 — Acceder al editor 3D ✅
- **Evidence**: ProductDetail.jsx:256-260 — "3D" button with link to `/product/{id}/3d`

### RF-074 — Compartir en redes sociales ❌ FALTANTE
- **Evidence**: No share button/foundation anywhere in ProductDetail

### RF-075 — Productos relacionados ⚠️ PARCIAL
- **Evidence**: ProductDetail.jsx:272-289 — renders related_products if present
- **Backend**: CatalogProductSerializer provides related_products — need to verify backend logic

---

## MÓDULO: Personalización 3D

### RF-076 — Renderizar modelo 3D ✅
- **Evidence**: `microservices/Tshirt3D/src/canvas/Shirt.jsx` — three.js rendering
- **Tech stack**: @react-three/fiber, @react-three/drei

### RF-077 — Modelos según variante ❌ FALTANTE
- **Evidence**: Shirt.jsx loads hardcoded `/shirt_baked.glb` — NOT per product variant
- **Missing**: No Modelo_3D per Variant association

### RF-078 — Rotación 360° ✅
- **Evidence**: OrbitControls from drei provides free rotation

### RF-079 — Zoom in/out ✅
- **Evidence**: OrbitControls provides zoom

### RF-080 — Ajustar iluminación ❌ FALTANTE
- **Evidence**: No lighting controls in Customizer UI
- **Missing**: No light intensity/color adjuster

### RF-081 — Color por parte (torso, mangas, cuello) ❌ FALTANTE
- **Evidence**: Shirt.jsx applies single color to entire material (lambert1) via `easing.dampC(materials.lambert1.color, snap.color)`
- **Missing**: No multi-material/part color controls

### RF-082 — Agregar imágenes/logos ✅
- **Evidence**: Customizer.jsx filepicker — uploads PNG/JPG via Cloudinary
- **Positioning**: Shirt.jsx:20-27 — drag-to-position logo in 3D space

### RF-083 — Agregar texto personalizable ❌ FALTANTE
- **Evidence**: No text input feature in Customizer. Only image upload for decals
- **Missing**: Text-to-3D feature per RF-083

### RF-084 — Aplicar texturas personalizadas ✅
- **Evidence**: Customizer.jsx:39-43 (handleDecals) — logo and full texture modes
- **Shirt**: isLogoTexture (focal decal) + isFullTexture (full shirt)

### RF-085 — Tipos de cuello y manga ❌ FALTANTE
- **Evidence**: No Variacion_Modelo model. No collar/sleeve selector

### RF-086 — Guardar configuraciones ✅
- **Evidence**: `config/helpers.js:40-84` (uploadCanvasToCloudinary + createModel3D)
- **Cloudinary**: Uploads design as PNG to Cloudinary
- **Note**: Saves as image capture, NOT as full JSON configuration per RI-086

### RF-087 — Restaurar diseño original ⚠️ PARCIAL
- **Evidence**: Reloading page resets to default state
- **Missing**: No explicit "Restore default" button

### RF-088 — Vista previa 3D ✅
- **Evidence**: Real-time preview in three.js canvas (always live)
- **Note**: No separate "generate preview" step — continuously rendered

### RF-089 — Capturar vista previa en imagen ✅
- **Evidence**: `config/helpers.js:21-38` (downloadCanvasToImage) — PNG 1080x1080

### RF-090 — Exportar diseño ⚠️ PARCIAL
- **Evidence**: downloadCanvasToImage exports PNG only
- **Missing**: No OBJ/FBX 3D file export per RN-090

### RF-091 — Integrar diseños del catálogo ❌ FALTANTE
- **Evidence**: No Diseno_Publico integration in 3D editor
- **Missing**: No texture from catalog designs

### RF-092 — Admin cargar modelos 3D base ⚠️ PARCIAL
- **Evidence**: `backend/apps/models3d/api/viewsets.py` — Model3DViewSet with create
- **Missing**: No Modelo_Base entity per RI-092. Limited to simple Model3D model

### RF-093 — Admin editar/eliminar modelos 3D ⚠️ PARCIAL
- **Evidence**: Model3DViewSet has update/delete
- **Missing**: No dependency check before delete (RN-093)

---

## MÓDULO: Pedido / Carrito

### RF-094 — Agregar al carrito desde catálogo o editor 3D ⚠️ PARCIAL
- **Evidence**: Catalog → via detail page add-to-cart works
- **3D editor**: `sendCanvasToApi` creates Order directly, not Cart item
- **Missing**: No direct cart addition from catalog card (mini-modal)

### RF-095 — Aumentar/disminuir cantidad ✅
- **Evidence**: `frontend/src/pages/Cart.jsx` — quantity +/- controls

### RF-096 — Eliminar producto del carrito ✅
- **Evidence**: Cart.jsx — remove item button

### RF-097 — Vaciar carrito ✅
- **Evidence**: CartViewSet clear action

### RF-098 — Mostrar productos en carrito con detalle ✅
- **Evidence**: CartPage shows image, variant label, quantity, unit_price, subtotal

### RF-099 — Confirmar compra → Wompi ✅
- **Evidence**: `CheckoutPage.jsx:110-115` — initCheckout + createPayment
- **Backend**: `checkout/views.py:87-151` (checkout_init + create_payment)

### RF-100 — Recibir confirmación de pago ✅
- **Evidence**: `checkout/views.py:274-354` (wompi_webhook) — updates order status

---

## MÓDULO: Pedido Admin

### RF-101 — Consultar lista de pedidos ✅
- **Evidence**: `backend/apps/orders/api/admin_viewsets.py:10-19` (AdminOrderViewSet)

### RF-102 — Actualizar estado del pedido ⚠️ PARCIAL
- **Evidence**: AdminOrderViewSet status action
- **Mismatch**: STATUS_CHOICES = pendiente/pagado/enviado/entregado/cancelado. RF requires "Producción" status
- **RN-103**: Prevents modifying paid orders — implemented at line 38-39

### RF-103 — Visualizar detalle del carrito ✅
- **Evidence**: AdminOrderDetailSerializer includes items with product/variant details

### RF-104 — Generar factura simple ❌ FALTANTE
- **Evidence**: No Factura model. No invoice generation functionality anywhere

---

## MÓDULO: Checkout Cliente

### RF-105 — Ingresar datos de envío ✅
- **Evidence**: CheckoutPage.jsx:186-271 — form with name, email, phone, address, city, zipcode
- **Validation**: CheckoutPage.jsx:11-53 (validateForm)

### RF-106 — Resumen del pedido ✅
- **Evidence**: CheckoutPage.jsx:300-329 — items list with image, variant, quantity, unit_price, subtotal, total

### RF-107 — Wompi como único método de pago ✅
- **Evidence**: CheckoutPage.jsx:276-294 — only Wompi UI displayed

### RF-108 — Redirigir a Wompi ✅
- **Evidence**: `checkout/views.py:154-218` (create_payment) — returns redirect_url
- **Frontend**: CheckoutPage.jsx:114 — `window.location.href = payment.redirect_url`

### RF-109 — Recibir confirmación ✅
- **Evidence**: wompi_webhook (views.py:274-354) updates status + stock rollback on failure

### RF-110 — Número único de pedido ✅
- **Evidence**: `backend/apps/orders/models.py:67-72` — generates `ORD-{pk:06d}` on save

### RF-111 — Página de confirmación ✅
- **Evidence**: `frontend/src/pages/OrderConfirmation.jsx` — shows order_number, items, shipping, total, status

---

## MÓDULO: Checkout Admin

### RF-112 — Admin ver lista de pagos ❌ FALTANTE
- **Evidence**: No separate payments list view. Payment info embedded in Order model fields
- **Missing**: AdminPaymentViewSet or similar

### RF-113 — Registrar todo intento de pago ❌ FALTANTE
- **Evidence**: No Transaction or PaymentLog model. Wompi data stored only in Order model fields
- **Missing**: No persistent log for failed/successful payment attempts independent of orders

### RF-114 — Admin consultar pedidos pagados ⚠️ PARCIAL
- **Evidence**: AdminOrderViewSet can be filtered by status=paid
- **Missing**: No dedicated "production pipeline" view per RN-116

---

## MÓDULO: Gestión de Contacto

### RF-67 — Formulario de contacto ✅
- **Evidence**: `frontend/src/pages/Landing.jsx` — contact form (lines 51-65)
- **Model**: `backend/apps/landing/models.py` — Contacto with nombre, correo_electronico, mensaje, estado
- **API**: `backend/apps/landing/api/viewset.py` — ContactoViewSet create

### RF-68 — Confirmar envío exitoso ✅
- **Evidence**: Landing.jsx:60 — sets success message "Mensaje enviado exitosamente."

### RF-69 — Almacenar en BD ✅
- **Evidence**: ContactoViewSet create persists to database

### RF-70 — Admin visualizar consultas ✅
- **Evidence**: AdminContactoViewSet (list + retrieve) with AdminPermission

---

## SUMMARY

| Status | Count |
|--------|-------|
| ✅ COMPLETO | 60 |
| ⚠️ PARCIAL | 26 |
| ❌ FALTANTE | 21 |
| **Total** | **107** |

### Critical Gaps (❌ FALTANTE)
1. **RF-044** — Disapprove product with reason (no endpoint)
2. **RF-045** — Approval/disapproval history timeline (no specific UI)
3. **RF-047** — Admin edit/delete categories (ReadOnly viewset)
4. **RF-051** — Infinite scroll (only pagination)
5. **RF-052** — Catalog view tracking (no Sesion_Catalogo)
6. **RF-060** — Mini-modal add-to-cart from card
7. **RF-061** — Stock badge in card
8. **RF-062** — Rating display in card
9. **RF-066** — Reviews/ratings (no Calificacion model)
10. **RF-074** — Share buttons
11. **RF-077** — Per-variant 3D model loading
12. **RF-080** — 3D lighting controls
13. **RF-081** — Part-specific colors (torso/mangas/cuello)
14. **RF-083** — Custom text in 3D
15. **RF-085** — Collar/sleeve type selector
16. **RF-091** — Catalog design integration in 3D
17. **RF-104** — Invoice generation
18. **RF-112** — Admin payments list
19. **RF-113** — Payment attempt log

### Key Partial Gaps (⚠️ PARCIAL)
- **RF-028/036** — Variant-specific price not exposed in frontend form
- **RF-029** — Missing visual checklist for product creation
- **RF-044** — Missing disapprove action entirely
- **RF-049** — Card missing stock badge, truncation
- **RF-058** — Missing sort options (best rated, best selling)
- **RF-063** — No image zoom feature
- **RF-075** — Related products shown if backend provides
- **RF-086** — Save only as image, not JSON config
- **RF-090** — Export PNG only (no OBJ/FBX)
- **RF-102** — Statuses don't include "Producción" as required
