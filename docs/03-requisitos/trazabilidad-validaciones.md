# Trazabilidad de requisitos, validaciones y código

Este documento relaciona los requisitos funcionales con la pantalla, endpoint, validación y prueba que los implementan.

## 1. Autenticación y usuarios

| Requisito | Interfaz | Backend | Validaciones principales |
|---|---|---|---|
| RF-001 Registro | `frontend/src/pages/AuthPage.jsx` | `apps/users/api/viewset.py`, `serializers.py` | usuario/correo únicos, contraseña fuerte, token de verificación |
| RF-002 Recuperación | `frontend/src/pages/Password.jsx` | `apps/users/api/serializers.py` | correo existente, token temporal, nueva contraseña fuerte |
| RF-008 Login | `AuthPage.jsx` | `apps/users/api/viewset.py` | credenciales, usuario activo, bloqueo por intentos, JWT |
| RF-009 Verificación | `Email.jsx` | `config/urls.py`, `Token_Verificacion` | token válido, no usado y no expirado |
| RF-011 Roles | `ProtectedRoute.jsx`, `AdminLayout.jsx` | `AdminPermission` | autenticado, rol Administrador y estado activo |
| RF-012 Logout | `MainLayout.jsx` | endpoint de logout/token blacklist | revocación del refresh y limpieza local |

## 2. Productos y catálogo

| Requisito | Interfaz | Backend | Validaciones |
|---|---|---|---|
| RF-021 CRUD productos | `AdminProducts.jsx`, `AdminProductDetail.jsx` | `apps/products/api/viewset.py` | nombre, descripción, precio COP, permisos admin |
| RF-022 Imágenes | formularios de producto | `ProductImageSerializer`, `ProductImage.clean()` | máximo 5, JPG/PNG, 2 MB, mínimo 400x400 |
| RF-023 Variantes | detalle de producto | serializers de `products` | talla, color, hexadecimal, stock y pertenencia al producto |
| RF-024 Publicación | `AdminProductApproval.jsx` | `Product.checklist`, viewset | nombre, descripción, imagen principal y variante con stock |
| RF-027 Catálogo | `Catalog.jsx` | `CatalogViewSet` | solo `is_active=True` e `is_approved=True` |
| RF-028 Búsqueda | filtros del catálogo | `CatalogSearchSerializer` | consulta textual acotada y parametrizada por ORM |
| RF-029 Filtros | `FilterSidebar.jsx` | `CatalogViewSet.get_queryset()` | categoría, talla, color y rango de precio combinables |
| RF-031 Paginación | `Catalog.jsx` | `CatalogPagination` | página numérica, 20 por defecto, máximo 100 |

## 3. Carrito, checkout y pago

| Requisito | Interfaz | Backend | Validaciones |
|---|---|---|---|
| RF-034 Agregar | `ProductCard.jsx`, `ProductDetail.jsx` | `CartViewSet.add` | variante válida, stock y cantidad |
| RF-035 Visualizar | `Cart.jsx` | `CartSerializer` | subtotal, precio congelado, preview de diseño |
| RF-036 Actualizar | controles de `Cart.jsx` | `CartViewSet.update_quantity` | item pertenece al carrito, rango y stock |
| RF-039 Fusion login | `CartContext`, `authService` | resolución JWT/sesión en `CartViewSet` | merge sin perder líneas personalizadas |
| RF-040 Resumen | `CheckoutPage.jsx` | `checkout_summary` | mismo carrito del usuario o sesión |
| RF-041 Confirmar | formulario checkout | `checkout_confirm` | datos de cliente, stock y transacción atómica |
| RF-043 Stock | pantalla de checkout | `OrderItem`, `Variant` | `select_for_update`, no vender stock insuficiente |
| Pago Sandbox | formulario Wompi | `wompi.py`, `create_wompi_payment` | token de tarjeta, firma, llave privada y estado Wompi |
| Factura | confirmación checkout | `download_order_invoice_pdf` | token firmado de una hora o propietario autenticado |

## 4. Editor 3D

| Paso | Código | Validación |
|---|---|---|
| Abrir editor | `frontend/src/utils/editor3d.js` | producto aprobado, variante y stock |
| Handoff | `config/urls.py:editor_session_save` | token firmado y caducidad de una hora |
| Cargar sesión | `Tshirt3D/src/store/index.js` | token válido y datos autoritativos del servidor |
| Capturar imagen | `Tshirt3D/src/config/helpers.js` | canvas disponible y respuesta Cloudinary |
| Commit carrito | `editor_session_commit` | revalidación de producto, variante y stock |
| Mostrar diseño | `CartItemSerializer` | `design_preview_url` y `design_data` de solo lectura |

## 5. Validación por capas

### Capa de interfaz

HTML y React entregan feedback inmediato: `required`, `type=email`, límites de longitud, campos obligatorios, mensajes de error y bloqueo de botones mientras hay una petición.

### Capa de API

Los serializers DRF validan tipos, campos permitidos, relaciones, stock, formatos y permisos. Las vistas no deben confiar en precios, roles o stock recibidos del navegador.

### Capa de dominio

`clean()`, propiedades de modelos, transacciones atómicas y bloqueos de fila protegen invariantes como precios COP, variantes pertenecientes al producto y stock no negativo.

### Capa de persistencia

Django aplica claves foráneas, unicidad, campos JSON, índices y migraciones. La base de datos es la última barrera, no el único lugar de validación.

## 6. Pruebas relacionadas

```bash
cd backend
python manage.py test apps.users
python manage.py test apps.products
python manage.py test apps.carts
python manage.py test apps.checkout
python manage.py check
python manage.py makemigrations --check --dry-run
```

Frontend:

```bash
cd frontend
npm run build
npm run lint
```

## 7. Reglas para nuevas funcionalidades

Una funcionalidad no se considera completa hasta que tiene:

- validación de interfaz;
- validación de serializer o endpoint;
- regla de dominio si afecta stock, dinero o permisos;
- prueba de éxito;
- prueba de error y autorización;
- contrato documentado;
- actualización del requisito funcional correspondiente.
