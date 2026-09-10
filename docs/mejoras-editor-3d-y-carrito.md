# Mejoras: Editor 3D, Carrito y Manejo de Errores

Resumen de los cambios implementados entre el 8 y 9 de septiembre de 2026.

---

## Commits realizados (orden cronológico)

| Commit | Descripción | Archivos clave |
|--------|-------------|----------------|
| `e96be25` | Gzip en nginx | `frontend/nginx.conf` |
| `2a024f8` | Gunicorn workers 4→2 | `backend/gunicorn.conf.py` |
| `792befd` | React.lazy + code splitting | `frontend/src/App.jsx` |
| `ff39d0c` | imagen.png → imagen.webp | `frontend/src/assets/` |
| `d579cff` | Validar límite 5 imágenes antes de crear | `backend/config/urls.py`, `backend/apps/products/api/viewset.py` |
| `c2123dd` | Fix bugs: iframe, import, preview muerto | `frontend/src/pages/Product3D.jsx`, `AdminImages.jsx`, `helpers.js` |
| `0faaa08` | Separar admin/usuario en editor 3D | `backend/apps/models3d/editor_session.py`, `Customizer.jsx`, `AdminProductDetail.jsx` |
| `739a9a3` | Flujo completo diseño→carrito | `backend/apps/carts/models.py`, `backend/config/urls.py`, `Customizer.jsx`, `helpers.js`, `Cart.jsx` |
| `b5f492b` | Manejo de errores mejorado | `backend/config/urls.py`, `viewset.py`, `Customizer.jsx` |

---

## 1. Fix de bugs críticos (`c2123dd`)

**Problema:** Product3D.jsx fallaba al abrir el editor; AdminImages.jsx tenía un import incorrecto; el código muerto de Preview confundía.

**Cambios:**
- `Product3D.jsx`: iframe ahora usa `session_token` (no `productId`) y se renderiza condicionalmente
- `AdminImages.jsx`: import de `fetchProductImages` agregado, fix de JSX roto (faltaba `<React.Fragment>`), delete usa `img.product` (no `item.id`)
- `App.jsx` (Tshirt3D): eliminado estado `previewOrder` y renderizado condicional de Preview
- `helpers.js`: eliminada función `sendCanvasToApi()` (apuntaba a `/api/` root, siempre 405)
- Eliminado archivo `Preview.jsx` (código muerto)

---

## 2. Separación admin/usuario (`0faaa08`)

**Problema:** No había forma de distinguir si una sesión del editor fue abierta por un admin o un usuario normal. El botón "Add to Cart" aparecía siempre.

**Cambios:**
- `EditorSession` modelo: nuevo campo `is_admin_session` (BooleanField, default=False)
- Migración `0005_add_is_admin_session.py`
- `editor_session_save`: acepta parámetro `isAdmin` en el body
- `editor_session_get`: retorna `isAdminSession` en la respuesta
- `editor3d.js`: `openEditor()` acepta parámetro `isAdmin` y lo propaga al backend
- `AdminProductDetail.jsx`: pasa `isAdmin: true` al abrir el editor
- `store/index.js`: lee `isAdminSession` de la respuesta del API
- `Customizer.jsx`: botón "Add to Cart" solo se muestra si `!isAdminSession` (admin solo ve "Save design")

---

## 3. Flujo completo diseño 3D → carrito (`739a9a3`)

**Problema:** No había conexión entre el editor 3D y el carrito. El diseño se guardaba como imagen en el producto pero no se vinculaba alCartItem.

**Cambios:**
- `CartItem` modelo: nuevo campo `product_image` (FK a ProductImage, null=True)
- Migración `0007_add_product_image_to_cartitem.py`
- `editor_session_commit`: acepta `image_id` opcional en el body, busca ProductImage y lo guarda en CartItem
- `CartItemSerializer`: nuevo campo `design_image` (retorna URL del diseño si existe, fallback a product_image)
- `addDesignToCart()` en helpers.js: acepta `imageId` y lo envía al endpoint
- `Customizer.jsx`: trackea `savedImageId` del `linkDesignToProduct`, lo pasa al agregar al carrito
- `Cart.jsx`: muestra `item.design_image` cuando existe, fallback a `item.product_image`

### Flujo completo:
```
1. Usuario abre editor desde ficha de producto
   → frontend llama POST /api/editor-session/save/ con productId, variantId
   → backend crea EditorSession con token UUID

2. Editor 3D carga datos con GET /api/editor-session/get/?token=...
   → retorna producto, variante, isAdminSession

3. Usuario diseña y guarda
   → frontend sube canvas a Cloudinary
   → frontend llama POST /api/editor-session/link-design/
     con { token, cloudinary_url }
   → backend descarga imagen, crea ProductImage, retorna image_id

4. Usuario hace click en "Add to Cart"
   → frontend llama POST /api/editor-session/commit/?token=...
     con { image_id }
   → backend crea CartItem con product_image=image_id
   → sesión se marca como usada (one-time)
```

---

## 4. Manejo de errores (`b5f492b`)

**Problema:** Los errores eran genéricos ("Error al guardar") y no decían al usuario qué hacer.

**Cambios en cada endpoint:**

### `editor_session_save`
| Error | Mensaje |
|-------|---------|
| Body inválido | "El cuerpo de la petición debe ser un JSON válido." |
| Faltan campos | "Se requieren los campos productId y variantId." |
| Producto inactivo | "El producto no está disponible para personalización." |
| Producto/variante no existe | "El producto o la variante seleccionada no existen." |
| Sin stock | "El stock de la variante M Rojo es 3. La cantidad solicitada (5) lo supera." |

### `editor_session_get`
| Error | Mensaje |
|-------|---------|
| Sin token | "Token de sesión requerido." |
| Token inválido | "Sesión del editor no válida." |
| Sesión ya usada | "Esta sesión del editor ya fue utilizada. Si ya guardaste un diseño, revisá el producto en el catálogo." (409) |
| Sesión expirada | "La sesión del editor ha expirado (60 minutos). Volvé a abrir el editor desde el producto." (410) |

### `editor_session_commit`
| Error | Mensaje |
|-------|---------|
| Token inválido | "La sesión del editor no existe o ya fue utilizada." (404) |
| Sesión expirada | "La sesión del editor ha expirado (60 minutos)." (410) |
| Selección inválida | "El producto o la variante del editor ya no están disponibles." |
| Sin stock | "El stock de la variante M Rojo ya no está disponible (3 unidades)." |
| Imagen no encontrada | "La imagen del diseño no fue encontrada." |

### `editor_session_link_design`
| Error | Mensaje |
|-------|---------|
| Campos faltantes | "Se requieren los campos token y cloudinary_url." |
| Sesión no válida | "La sesión del editor no es válida o ya fue utilizada." (404) |
| Sesión expirada | "La sesión del editor ha expirado (60 minutos)." (410) |
| Sin producto | "La sesión no tiene un producto asociado." |
| Cloudinary timeout | "La descarga de la imagen desde Cloudinary tardó demasiado." (502) |
| Cloudinary error | "No se pudo descargar la imagen desde Cloudinary." (502) |
| Límite imágenes | "Este producto ya tiene el máximo de imágenes permitidas (4/5)." (409) |

### Frontend (Customizer.jsx)
- Mapea códigos de error del API a mensajes amigables
- `SESSION_EXPIRED` → "La sesión del editor expiró. Volvé a abrir el editor desde el producto."
- `SESSION_ALREADY_USED` → "Esta sesión ya fue utilizada. El diseño ya se guardó."
- `IMAGE_LIMIT_REACHED` → "Este producto ya tiene el máximo de imágenes."
- `OUT_OF_STOCK` → "La variante seleccionada no tiene stock disponible."

---

## Modelo de datos

### EditorSession
```
- token: UUIDField (index, unique) — token de una sola vez
- data: JSONField — { productId, productName, variantId, quantity, userId, size, color, colorHex, createdAt }
- is_admin_session: BooleanField (default=False) — distingue admin vs usuario
- created_at: DateTimeField
- used: BooleanField (default=False) — one-time use
```

### CartItem (campos nuevos)
```
+ product_image: ForeignKey(ProductImage, null=True, blank=True) — diseño del editor 3D
```

### ProductImage (validación existente)
- Límite de 5 imágenes por producto
- Validación en `save()` y en endpoints `link_design` / `link_design_to_product`
- Errores 409 con conteo actual (ej: "4/5")

---

## Endpoints afectados

| Endpoint | Método | Cambios |
|----------|--------|---------|
| `/api/editor-session/save/` | POST | Acepta `isAdmin`, errores mejorados |
| `/api/editor-session/get/` | GET | Retorna `isAdminSession`, errores mejorados |
| `/api/editor-session/commit/` | POST | Acepta `image_id`, guarda diseño en CartItem |
| `/api/editor-session/link-design/` | POST | Errores mejorados (timeout, límite, sesión) |
| `/api/product-image/link-design/` | POST | Errores mejorados (timeout, límite) |

---

## Notas de seguridad

- Las sesiones expiradas se eliminan de la BD automáticamente
- El token de sesión es UUID v4 (no predecible)
- Las sesiones son de un solo uso (campo `used`)
- El commit revalida contra la BD (no confía en los datos de la sesión)
- CORS restringido a orígenes conocidos
