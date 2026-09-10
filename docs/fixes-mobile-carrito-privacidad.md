# Diagnóstico: Fixes Mobile, Carrito y Privacidad de Diseños 3D

**Fecha:** 10 de septiembre de 2026
**Commits:** `3fc6f3b`, `a4c15a1`, `2e038d7`, `e997810`, `9e4c3b0`, `7b91829`

---

## Punto 4: BUG — Botón "Agregar al carrito" no responde

### Causa raíz
El endpoint `editor_session_link_design` marcaba `session.used = True` después de crear la ProductImage. Luego, cuando `editor_session_commit` intentaba buscar la sesión con `used=False`, fallaba con 404 porque ya estaba marcada como usada.

**Flujo roto:**
```
1. Save → link-design → crea ProductImage → session.used = True ✅
2. Cart button → commit → busca used=False → 404 ❌ (sesión ya "usada")
```

### Solución
- `link-design`: Eliminada línea `session.used = True` (solo `commit` marca la sesión)
- `link-design`: Para usuarios normales, NO crea ProductImage (diseño privado)
- `CartItem`: Nuevo campo `design_url` para URL privada del diseño del usuario
- `commit`: Para admin usa `product_image` FK, para usuario usa `design_url`
- Frontend: Envía `cloudinary_url` en vez de `image_id` para usuarios
- Migración `0008_add_design_url_to_cartitem`

---

## Punto 1: Admin no puede llegar al panel desde mobile

### Causa
El menú hamburguesa del Header en mobile solo mostraba: Catálogo, Modo claro/oscuro, Carrito, Mi Perfil, Cerrar Sesión. No había link al panel de administración para admin users.

### Solución
Agregado link "Panel de Administración" en el menú mobile del Header, visible solo cuando `user?.rol === 'Administrador'`. Enlace directo a `/admin`.

---

## Punto 3: Privacidad del diseño 3D

### Arquitectura implementada

| Concepto | Admin | Usuario |
|----------|-------|---------|
| `link-design` crea ProductImage | ✅ Sí (pública) | ❌ No |
| `commit` guarda en CartItem | `product_image` FK | `design_url` (URL directa) |
| Diseño visible en catálogo | ✅ Sí | ❌ No |
| Diseño viaja al carrito | ✅ | ✅ |

### Modelo de datos
```
CartItem
├── product_image → FK(ProductImage, null=True)  ← admin
├── design_url → URLField(null=True)             ← usuario (privado)
├── product, variant, quantity, unit_price
```

---

## Punto 2: Tablas admin sin scroll en mobile

### Problema
- `ProductList.jsx`: Tabla de 9 columnas sin `.table-responsive` → overflow en mobile
- `UserList.jsx`: Tabla de 7 columnas sin `.table-responsive` → overflow en mobile
- `Category.jsx`: CSS inválido `margin: '20 0'` (faltan unidades)

### Solución
- Ambas tablas envueltas en `<div className="table-responsive">` (overflow-x: auto)
- Category: `margin: '20px 0'`

---

## Commits realizados

| Commit | Descripción |
|--------|-------------|
| `3fc6f3b` | fix: is_admin_session column faltante en fix_db |
| `a4c15a1` | fix: admin layout mobile - sidebar tapaba contenido |
| `2e038d7` | docs: diagnostico admin layout mobile |
| `e997810` | fix: boton carrito editor 3D no respondia |
| `9e4c3b0` | fix: admin sin acceso al panel desde mobile |
| `7b91829` | fix: tablas admin sin scroll horizontal en mobile |
