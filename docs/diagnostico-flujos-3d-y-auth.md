# Diagnóstico de Flujos — Editor 3D, Auth, Upload de Imágenes

**Fecha:** 2026-09-10
**Alcance:** Flujo del editor 3D (Tshirt3D), login, upload de imágenes, bug de diseño en carrito
**Tipo:** Análisis y documentación — con bugfix del endpoint link-design

---

## 1. Resumen Ejecutivo

| Hallazgo | Severidad | Estado |
|---|---|---|
| `link-design` lanza ValidationError sin catch (500 server error) | **Crítico** | **ARREGLADO** (commit d579cff) |
| Editor 3D no tiene botón "Agregar al Carrito" — el flujo termina guardando imagen, no en carrito | **Crítico** | Pendiente |
| Preview.jsx es código muerto — nunca se muestra | **Alto** | Pendiente |
| Product3D.jsx (iframe) pasa `productId` en vez de `session_token` — siempre falla | **Alto** | Pendiente |
| Diseño en carrito muestra primera imagen, no la que el usuario eligió | **Alto** | Pendiente |
| Login hace merge de carrito de sesión de forma síncrona (N+1 queries) | **Medio** | Pendiente |
| Upload de imágenes: doble validación PIL, subida síncrona a Cloudinary, sin compresión | **Medio** | Pendiente |
| `sendCanvasToApi()` apunta a `/api/` (router root) — siempre devuelve 405 | **Medio** | Pendiente |
| `addDesignToCart()` existe pero nunca se llama desde la UI | **Medio** | Pendiente |
| Auth query en cada request autenticado (`Usuario.objects.get`) | **Bajo** | Pendiente |
| Sin limpieza de EditorSessions expirados | **Bajo** | Pendiente |

---

## 2. Flujo del Editor 3D — Diagrama Paso a Paso

### Arquitectura

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Frontend React  │    │  Backend Django  │    │  Tshirt3D React  │
│  (localhost:5173)│    │  (localhost:8000)│    │  (localhost:5174)│
│                  │    │                  │    │                  │
│  ProductCard     │    │  EditorSession   │    │  Canvas Three.js │
│  ProductDetail   │◄──►│  CRUD + Auth     │◄──►│  Customizer      │
│  AddToCartModal  │    │  ProductImage    │    │  Store (Valtio)  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

### Flujo actual (usuario normal)

```
1. Usuario hace clic en "3D" en ProductCard o ProductDetail
   │  Archivo: frontend/src/components/ProductCard.jsx:40-47
   │  Archivo: frontend/src/pages/ProductDetail.jsx:164-171
   │
   ├─ Requiere autenticación (isAuthenticated())
   │  Si no está logueado → redirige a /login
   │
   v
2. Se abre AddToCartModal (selección de variante)
   │  Archivo: frontend/src/components/catalog/AddToCartModal.jsx
   │  El usuario selecciona: talla, color, cantidad
   │  Botón dice "Continuar al editor 3D" (línea 225-226)
   │
   v
3. Se llama openEditor() desde editor3d.js
   │  Archivo: frontend/src/utils/editor3d.js:76-79
   │
   ├─ POST /api/editor-session/save/
   │  Body: { productId, variantId, quantity }
   │  Header: Authorization: Bearer <JWT>
   │  Backend: config/urls.py:80-147
   │  → Valida producto, variante, stock
   │  → Crea EditorSession (UUID token, data JSON)
   │  → Retorna { ok: true, token: "uuid" }
   │
   v
4. Se abre nueva pestaña con el editor
   │  window.open(EDITOR_BASE_URL?session_token=uuid&color=...)
   │  Editor: microservices/Tshirt3D/
   │
   v
5. Tshirt3D carga la sesión
   │  Archivo: microservices/Tshirt3D/src/store/index.js:31-67
   │  GET /api/editor-session/?token=uuid (público)
   │  → Retorna { productId, variantId, quantity, color, size }
   │  → Si token inválido: pantalla de error
   │
   v
6. Editor渲染 (Canvas + Customizer)
   │  Archivo: microservices/Tshirt3D/src/canvas/Shirt.jsx
   │  → Carga modelo GLB (/shirt_baked.glb)
   │  → Renderiza camiseta 3D con color seleccionado
   │
   v
7. Usuario personaliza: color, logo, textura, escala, posición
   │  Archivo: microservices/Tshirt3D/src/pages/Customizer.jsx
   │  Herramientas: ColorPicker, FilePicker, FilterTabs, drag & drop
   │
   v
8. Usuario hace clic en "Guardar diseño" (icono paper-plane)
   │  Customizer.jsx:130-166
   │
   ├─ uploadCanvasToCloudinary()
   │  helpers.js:55-99
   │  → Captura canvas como PNG blob
   │  → Sube a Cloudinary vía upload preset
   │  → Retorna { secure_url }
   │
   ├─ linkDesignToProduct(url)  ← si state.productId existe
   │  helpers.js:199-231
   │  → POST /api/editor-session/link-design/
   │  Body: { token, cloudinary_url }
   │  Backend: config/urls.py:273-342
   │  → Valida token (no usado, no expirado)
   │  → Descarga imagen de Cloudinary
   │  → Crea ProductImage en el producto
   │  → Marca sesión como used=True
   │  → Retorna { ok, image_id, image_url }
   │
   v
9. Modal de éxito: "Ver producto" | "Catálogo"
   │  Customizer.jsx:218-241
   │  "Ver producto" → /product/<id> (frontend principal)
   │  "Catálogo" → /catalog
   │
   v
10. FIN DEL FLUJO — El diseño se guardó como ProductImage,
    pero NO se agregó al carrito.
```

### Flujo del admin

El admin tiene las mismas entradas que el usuario normal (ProductCard, ProductDetail), más:

- **AdminProductDetail** (`frontend/src/pages/AdminProductDetail.jsx:168`): Botón "Abrir editor" que llama `openEditor()` directamente sin necesidad de pasar por AddToCartModal.
- La sesión del admin funciona igual — se crea un EditorSession con el productId.

**Diferencia clave:** El admin puede abrir el editor múltiples veces para el mismo producto, creando múltiples ProductImage. Después de 5, el endpoint `link-design` lanzaba el bug que arreglamos (HTTP 500 → ahora HTTP 409).

---

## 3. Bug: Imagen/Diseño en el Carrito

### Problema

Cuando el usuario diseña en el editor 3D y luego va al carrito, la imagen que se muestra no corresponde al diseño que hizo.

### Causa Raíz

**El diseño NUNCA llega al carrito.** El flujo actual solo guarda el diseño como `ProductImage` en el producto, pero no lo agrega al `CartItem` del usuario.

 Flujo real:
```
Editor → linkDesignToProduct() → Crea ProductImage → "Ver producto"
                                                         │
                                                         v
                                                  /product/:id
                                                         │
                                                         v
                                              Usuario hace clic en
                                              "Agregar al Carrito"
                                                         │
                                                         v
                                              CartItem SIN referencia
                                              al diseño específico
```

**¿Por qué se muestra la "primera imagen"?** Porque cuando el usuario agrega el producto al carrito desde la página de detalle, el `CartItem` solo almacena `product_id` y `variant_id`, sin ninguna referencia a qué `ProductImage` específica eligió. Al renderizar el carrito, se muestra la imagen principal (`is_main=True`) del producto, que es la primera que se subió.

### Ubicación del problema

| Componente | Archivo | Línea | Problema |
|---|---|---|---|
| CartItem model | `backend/apps/carts/models.py` | 1-30 | No tiene campo `design_image` o `product_image` |
| Cart add endpoint | `backend/apps/carts/api/viewset.py` | 60-92 | Solo acepta `product_id` + `variant_id`, no `image_id` |
| Frontend cart | `frontend/src/context/CartContext.jsx` | — | `addToCart()` no envía imagen del diseño |
| Editor (commit) | `microservices/Tshirt3D/src/config/helpers.js` | 162-196 | `addDesignToCart()` existe pero **nunca se llama** |

### Flujo Muerto: addDesignToCart()

```
helpers.js:162-196
  addDesignToCart(token)
    → POST /api/editor-session/commit/?token=uuid
    → Backend crea CartItem con datos de la sesión

PERO: Esta función nunca se invoca desde ningún componente UI.
El Customizer solo llama uploadCanvasToCloudinary + linkDesignToProduct.
```

### Recomendación

1. Agregar un campo `product_image = ForeignKey(ProductImage, null=True)` al modelo `CartItem`
2. Modificar el endpoint `commit` para que también acepte el `image_id` del diseño guardado
3. Agregar un botón "Agregar al Carrito" en el Customizer que llame `addDesignToCart()` después de `linkDesignToProduct()`
4. En el frontend, renderizar `cart_item.product_image.image.url` cuando exista, fallback a `product.images.first()`

---

## 4. Flujo de Login

### Diagrama

```
1. Usuario ingresa email + contraseña en /login
   │  Archivo: frontend/src/pages/AuthPage.jsx
   │  Loading state: "Iniciando..." (línea 217) ✓
   │
   v
2. POST /api/login/  {correo, contrasena}
   │  Backend: apps/users/api/viewset.py:212-267
   │
   ├─ LoginSerializer.validate()
   │  → Usuario.objects.get(correo=...)           [1 query]
   │  → check_password()                           [bcrypt CPU]
   │  → usuario.save() (reset intentos)            [1 write]
   │
   ├─ Cart migration (si hay carrito de sesión)
   │  → Cart.objects.filter(session_key=...).first()  [1 query]
   │  → Cart.objects.filter(user=...).first()          [1 query]
   │  → Para cada item: filter duplicados              [N queries]
   │  → session_cart.delete()                          [1 write]
   │
   ├─ RefreshToken.for_user(usuario)               [JWT sign]
   │
   v
3. Response: { access, refresh, usuario }
   │
   v
4. Frontend almacena tokens
   │  access → memoria (OWASP A03 compliant) ✓
   │  refresh → localStorage ✓
   │  usuario → localStorage ✓
   │
   v
5. Redirect: admin → /dashboard, usuario → /
```

### Hallazgos de Rendimiento

| Aspecto | Estado | Detalle |
|---|---|---|
| Loading state | ✓ | Spinner "Iniciando..." en botón |
| Llamadas innecesarias | ✓ | Solo 1 llamada POST /api/login/ |
| Cart migration | ⚠️ | Síncrona, N+1 queries si hay items duplicados |
| Token refresh | ✓ | Interceptor con deduplicación de requests |
| DB query por request autenticado | ⚠️ | `Usuario.objects.get()` en cada request (auth_backend.py:22) |

### Recomendaciones

1. **Cart migration async:** Mover la migración de carrito a un Celery task para que no bloquee el login
2. **Cache de auth:** Cachear la verificación de usuario activo/bloqueado con TTL corto (30s) en Redis
3. **Throttle más estricto en login:** Reducir `anon` rate para `/api/login/` de 1000/h a 100/h

---

## 5. Flujo de Upload de Imágenes

### Diagrama

```
1. Admin selecciona imagen en ProductForm
   │  Archivo: frontend/src/components/ProductForm.jsx:358-365
   │  Acepta: .jpg, .jpeg, .png (no webp en serializer)
   │
   v
2. Upload secuencial (una por una)
   │  ProductForm.jsx:178-184
   │  for (const file of extraImages) {
   │    await createProductImage(productId, form)  ← BLOQUEANTE
   │  }
   │
   v
3. POST /api/products/{id}/images/  (FormData)
   │  Backend: apps/products/api/viewset.py:268
   │
   ├─ ProductImageCreateSerializer.validate_image()
   │  → Verifica extensión                                  [sync]
   │  → Verifica tamaño ≤ 2MB                               [sync]
   │  → PIL Image.open() para verificar resolución ≥ 400x400 [sync]
   │
   v
4. ProductImage.save()
   │  Backend: apps/products/models.py:172-191
   │
   ├─ clean() ← SEGUNDA validación PIL
   │  → PIL Image.open() otra vez                           [sync, DUPLICADO]
   │  → Verifica límite 5 imágenes por producto
   │
   ├─ self.image.seek(0) ← Workaround para PIL
   │
   ├─ super().save() → MediaCloudinaryStorage
   │  → Sube archivo a Cloudinary SIN compresión            [sync, BLOQUEANTE]
   │
   v
5. Response 201 Created
```

### Problemas Identificados

| Problema | Severidad | Archivo:Línea | Impacto |
|---|---|---|---|
| Upload secuencial (no paralelo) | **Alto** | ProductForm.jsx:178-184 | 4 imágenes = 4 round-trips HTTP secuenciales |
| Doble validación PIL | **Medio** | serializers.py:199 + models.py:160 | PIL abre la imagen 2 veces por upload |
| Subida síncrona a Cloudinary | **Alto** | models.py:188 + settings.py:699 | Bloquea el worker de Django durante la subida HTTP |
| Sin compresión/resize | **Alto** | — | Imágenes de cámara (3-5MB) se suben raw (limitadas a 2MB por validación) |
| No permite .webp en serializer | **Bajo** | serializers.py:188-190 | Model permite .webp pero serializer no |
| link-design: download + reupload redundante | **Medio** | viewset.py:471-483 | Descarga de Cloudinary, luego re-sube a Cloudinary |
| Eliminación síncrona de Cloudinary | **Bajo** | signals.py:23-30 | `uploader.destroy()` bloqueante en pre_delete |

### Recomendaciones

1. **Upload paralelo:** Usar `Promise.all()` en el frontend para subir imágenes en paralelo
2. **Eliminar doble PIL:** Quitar la validación del serializer y dejar solo la del modelo (o viceversa)
3. **Compresión server-side:** Redimensionar a 800x800 y convertir a WebP antes de subir a Cloudinary
4. **Upload asíncrono:** Mover la subida a Cloudinary a un Celery task
5. **Permitir .webp:** Actualizar el serializer para aceptar .webp
6. **Cloudinary directo:** Subir directamente desde el frontend a Cloudinary (ya tiene el upload preset configurado pero no se usa)

---

## 6. Bugs y Código Muerto Encontrados

### BUG 1 (ARREGLADO): ValidationError sin catch en link-design
- **Archivo:** `backend/config/urls.py:332`
- **Problema:** `image.save()` lanzaba ValidationError que no se manejaba → HTTP 500
- **Fix:** Verificación del límite antes de descargar la imagen (commit d579cff)

### BUG 2: Product3D.jsx pasa productId en vez de session_token
- **Archivo:** `frontend/src/pages/Product3D.jsx:34-35`
- **Problema:** El iframe construye URL con `?productId=<id>` pero el editor espera `?session_token=<uuid>`
- **Resultado:** El editor siempre muestra error de sesión
- **Estado:** Pendiente

### BUG 3: fetchProductImages no existe
- **Archivo:** `frontend/src/pages/AdminImages.jsx:2`
- **Problema:** Importa `fetchProductImages` de `../services/api` pero esa función no existe
- **Resultado:** AdminImages crashea al cargar
- **Estado:** Pendiente

### CÓDIGO MUERTO 1: Preview.jsx
- **Archivo:** `microservices/Tshirt3D/src/pages/Preview.jsx`
- **Problema:** Customizer no acepta props `onOrderCreated`, así que Preview nunca se muestra
- **Estado:** Pendiente

### CÓDIGO MUERTO 2: sendCanvasToApi()
- **Archivo:** `microservices/Tshirt3D/src/config/helpers.js:101-141`
- **Problema:** Hace POST a `API_URL` que es `http://127.0.0.1:8000/api/` (router root) → siempre 405
- **Estado:** Pendiente

### CÓDIGO MUERTO 3: addDesignToCart()
- **Archivo:** `microservices/Tshirt3D/src/config/helpers.js:162-196`
- **Problema:** Función exportada pero nunca importada ni llamada desde ningún componente UI
- **Estado:** Pendiente

---

## 7. Plan de Acción Priorizado

### Quick Wins (1-2 días)

| # | Acción | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | ~~Arreglar ValidationError en link-design~~ | ~~Crítico~~ **HECHO** | — |
| 2 | Eliminar `Product3D.jsx` (iframe roto) o arreglar para pasar session_token | Alto | 1 hora |
| 3 | Eliminar `Preview.jsx` y `sendCanvasToApi()` (código muerto) | Medio | 30 min |
| 4 | Agregar botón "Agregar al Carrito" en Customizer que llame `addDesignToCart()` | Alto | 2-3 horas |
| 5 | Corregir import roto en `AdminImages.jsx` | Medio | 15 min |

### Cambios Medianos (1 semana)

| # | Acción | Impacto | Esfuerzo |
|---|---|---|---|
| 6 | Agregar campo `product_image` a CartItem y propagar en todo el flujo | Alto | 4-6 horas |
| 7 | Upload paralelo de imágenes en ProductForm | Medio | 1-2 horas |
| 8 | Eliminar doble validación PIL (serializer o model) | Bajo | 1 hora |
| 9 | Migrar cart migration del login a Celery task | Medio | 2-3 horas |
| 10 | Cachear verificación de usuario activo en auth_backend | Bajo | 1 hora |

### Cambios Grandes (2+ semanas)

| # | Acción | Impacto | Esfuerzo |
|---|---|---|---|
| 11 | Upload directo a Cloudinary desde frontend (bypass backend) | Alto | 1 día |
| 12 | Compresión server-side de imágenes (resize + WebP) | Alto | 1 día |
| 13 | Upload asíncrono a Cloudinary via Celery | Medio | 2-3 días |
| 14 | Limpieza periódica de EditorSessions expirados | Bajo | 2 horas |

---

## 8. Referencias

| Archivo | Línea(s) | Descripción |
|---|---|---|
| `backend/config/urls.py` | 273-342 | `editor_session_link_design` (arreglado) |
| `backend/config/urls.py` | 80-147 | `editor_session_save` |
| `backend/config/urls.py` | 150-187 | `editor_session_get` |
| `backend/config/urls.py` | 193-270 | `editor_session_commit` |
| `backend/apps/products/models.py` | 121-191 | ProductImage model + validation |
| `backend/apps/products/api/viewset.py` | 445-490 | `link_design_to_product` (arreglado) |
| `backend/apps/users/api/viewset.py` | 212-267 | LoginViewSet |
| `backend/apps/users/api/auth_backend.py` | 7-33 | JWT auth + user status check |
| `backend/apps/carts/models.py` | 1-30 | CartItem (sin campo de diseño) |
| `frontend/src/utils/editor3d.js` | 1-80 | Orchestrator del editor |
| `frontend/src/pages/Product3D.jsx` | 7-9, 34-35 | iframe roto |
| `frontend/src/pages/AdminImages.jsx` | 2 | Import roto |
| `microservices/Tshirt3D/src/App.jsx` | 1-90 | Editor root |
| `microservices/Tshirt3D/src/pages/Preview.jsx` | 1-178 | Código muerto |
| `microservices/Tshirt3D/src/pages/Customizer.jsx` | 130-166 | Save button (sin add-to-cart) |
| `microservices/Tshirt3D/src/config/helpers.js` | 55-99 | uploadCanvasToCloudinary |
| `microservices/Tshirt3D/src/config/helpers.js` | 101-141 | sendCanvasToApi (muerto) |
| `microservices/Tshirt3D/src/config/helpers.js` | 162-196 | addDesignToCart (nunca llamado) |
| `microservices/Tshirt3D/src/config/helpers.js` | 199-231 | linkDesignToProduct |
