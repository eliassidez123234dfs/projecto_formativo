# Diagnóstico: Admin Layout Mobile — Sidebar tapa contenido + Hamburguesa invisible

**Fecha:** 10 de septiembre de 2026
**Commits:** `3fc6f3b` (fix migration), `a4c15a1` (fix mobile)

---

## Problema 1: Error 500 — column "is_admin_session" does not exist

### Síntoma
`POST /api/editor-session/save/` retornaba 500 con:
```
column "is_admin_session" of relation "models3d_editorsession" does not exist
```

### Causa raíz
El comando `fix_db` (`apps/users/management/commands/fix_db.py`) ejecuta un `CREATE TABLE IF NOT EXISTS models3d_editorsession` hardcodeado **sin** la columna `is_admin_session`. Cada vez que el server arranca (via `startCommand` en render.yaml), `fix_db` recrea la tabla con la estructura vieja.

La migración `0005_add_is_admin_session.py` nunca se aplicaba porque:
1. `fix_db` creaba la tabla SIN la columna
2. `migrate` veía que la tabla existía y no la recreaba
3. La migración intentaba agregar una columna que la tabla ya "tenía" (por la estructura hardcodeada)

### Solución
- `fix_db.py`: Actualizar `CREATE TABLE` para incluir `is_admin_session BOOLEAN NOT NULL DEFAULT FALSE`
- Agregada verificación `ALTER TABLE ... ADD COLUMN` para tablas ya existentes creadas sin la columna

---

## Problema 2: Admin sidebar tapa contenido en mobile

### Síntoma
En viewport mobile (real o simulado), el sidebar se ve parcialmente cortado del lado derecho, y el área de contenido principal aparece en blanco/oscuro.

### Causa raíz
**Conflicto de especificidad CSS inline vs media queries:**

El componente `AdminLayout.jsx` aplica un inline style en el div `.main-layout`:
```jsx
<div className="main-layout" style={{ gridTemplateColumns: sidebarOpen ? '220px 1fr' : '54px 1fr' }}>
```

Los inline styles tienen **especificidad máxima** (1,0,0,0) y ganan sobre cualquier regla CSS, incluyendo `!important` en media queries.

En mobile:
1. El CSS de `main-layout.css` dice: `@media (max-width: 768px) { .main-layout { grid-template-columns: 1fr; } }`
2. Pero el inline style dice: `gridTemplateColumns: '54px 1fr'`
3. El inline style **siempre gana** → el grid nunca cambia a `1fr`
4. El sidebar es `position: fixed; transform: translateX(-100%)` (off-screen), pero el grid le reserva 54px de espacio
5. Resultado: un área de 54px.oscura a la izquierda + contenido principal desplazado

### Solución
```jsx
const gridStyle = isMobile
  ? {}  // Sin inline style en mobile → el CSS media query controla el grid
  : { gridTemplateColumns: sidebarOpen ? '220px 1fr' : '54px 1fr' }

return (
  <div className="main-layout" style={gridStyle}>
```

---

## Problema 3: Botón hamburguesa no aparece en mobile real

### Síntoma
El botón hamburguesa no se ve en mobile real, pero sí funciona cuando se simula mobile desde el navegador de escritorio (DevTools).

### Causa raíz
El CSS base de `main-layout.css` define:
```css
.mobile-sidebar-toggle {
  display: none;  /* oculto por defecto */
}
```

La media query lo muestra:
```css
@media (max-width: 768px) {
  .mobile-sidebar-toggle {
    display: flex;  /* sin !important */
  }
}
```

Tailwind CSS (importado en `index.css` via `@import "tailwindcss"`) puede estar aplicando su preflight o utilidades que sobreescriben `display: flex` en mobile. Sin `!important`, la regla de Tailwind tiene igual o mayor especificidad.

En el navegador de escritorio con DevTools, la simulated viewport funciona porque Tailwind no se activa de la misma manera.

### Solución
```css
@media (max-width: 768px) {
  .mobile-sidebar-toggle {
    display: flex !important;  // Ahora sobreescribe Tailwind
  }
}
```

---

## Flujo corregido del layout mobile

```
┌─────────────────────────────────────────┐
│  Mobile (≤768px)                        │
│                                         │
│  ┌─ content-header ───────────────────┐ │
│  │ [☰] Título de la página           │ │
│  └────────────────────────────────────┘ │
│  ┌─ content-area ────────────────────┐  │
│  │                                   │  │
│  │   Contenido principal             │  │
│  │   (grid: 1fr, todo el ancho)      │  │
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Sidebar: position:fixed, off-screen    │
│  Overlay: solo cuando sidebar está abierto│
└─────────────────────────────────────────┘

Click en ☰ → sidebarOpen=true → sidebar slides in + overlay
Click en overlay → sidebarOpen=false → sidebar slides out
```

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `backend/apps/users/management/commands/fix_db.py` | CREATE TABLE incluye `is_admin_session`; verificación ALTER TABLE |
| `frontend/src/components/AdminLayout.jsx` | Inline style vacío en mobile |
| `frontend/src/styles/main-layout.css` | `!important` en `.mobile-sidebar-toggle` |

---

## Nota sobre responsive.css

El archivo `frontend/src/styles/responsive.css` existe pero **no está importado** en ningún componente. Es código muerto. Todo el sistema responsive está en `main-layout.css` con media queries.
