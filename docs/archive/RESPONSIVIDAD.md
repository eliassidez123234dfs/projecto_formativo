# Responsividad y Adaptabilidad — RED Estampación

> Estrategia de diseño responsive para la aplicación, cubriendo breakpoints,
> sistema de layout y comportamiento en diferentes dispositivos.

---

## Estrategia General

El frontend usa un enfoque **mobile-first** con breakpoints definidos en
`responsive.css`. El sistema de layout se basa en:

1. **CSS Grid** para el layout principal (sidebar + contenido)
2. **Clases condicionales** para estados (`.sidebar-collapsed`, `.sidebar-open`)
3. **Bootstrap 5.3** para componentes y sistema de rejilla
4. **CSS Variables** para temas claro/oscuro

---

## Breakpoints

| Rango | Clasificación | Breakpoint | Archivo |
|-------|---------------|------------|---------|
| < 480px | Teléfonos pequeños | `@media (max-width: 480px)` | `responsive.css:240` |
| 480-768px | Teléfonos grandes | `@media (max-width: 768px)` | `responsive.css:290` |
| 769-1024px | Tablets | `@media (max-width: 1024px)` | `responsive.css:400` |
| 1025-1280px | Desktop pequeño | `@media (max-width: 1280px)` | `responsive.css:500` |
| > 1280px | Desktop grande | Default | `main-layout.css` |

---

## Sistema de Layout (Sidebar + Contenido)

### Estructura base (`MainLayout.jsx`)

```jsx
<div className={`main-layout ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
  <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
    {/* Navegación */}
  </aside>
  <div className="dashboard-content">
    {/* Contenido */}
  </div>
</div>
```

### Grid CSS (`main-layout.css`)

```css
.main-layout {
  display: grid;
  grid-template-columns: 260px 1fr; /* Sidebar + Contenido */
  transition: grid-template-columns 0.3s ease;
}
.main-layout.sidebar-collapsed {
  grid-template-columns: 70px 1fr; /* Sidebar reducida */
}
```

### Comportamiento responsive

| Dispositivo | Sidebar | Contenido |
|-------------|---------|-----------|
| Desktop (>1024px) | Fija (260px o 70px colapsada) | Fluye al lado |
| Tablet (768-1024px) | Overlay (se superpone) | Ancho completo |
| Móvil (<768px) | Overlay + animación slide | Ancho completo |

---

## Sidebar Overlay (móvil)

```css
/* responsive.css:290 */
@media (max-width: 768px) {
  .sidebar.open {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    z-index: 1050;
    transform: translateX(0);
    box-shadow: 4px 0 20px rgba(0,0,0,0.3);
  }
  .sidebar.collapsed {
    transform: translateX(-100%);
  }
  .main-layout {
    grid-template-columns: 1fr; /* Sin espacio para sidebar */
  }
}
```

---

## ScrollToTop

Componente fijo en la esquina inferior derecha (44×44px) que:
- Aparece al hacer scroll >400px hacia abajo (`opacity`, `transform`)
- Se excluye del `width: 100% !important` general de botones en móvil
  (`responsive.css:256`: `button:not(.scroll-to-top)`)
- Animación elástica (`cubic-bezier(0.34,1.56,0.64,1)`)
- `willChange: transform, opacity` para rendimiento

---

## Breadcrumbs

Navegación secundaria que:
- Se genera dinámicamente desde `useLocation()`
- Muestra la ruta actual con enlaces clickeables
- Usa `flex-wrap: wrap` para adaptarse a pantallas estrechas
- Soporta 30+ rutas con etiquetas descriptivas
- Acepta `pageTitle` prop para sobrescribir la última etiqueta

---

## Formularios Adaptables

### Checkout

```css
/* checkout.css */
.checkout-container {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;
}
@media (max-width: 768px) {
  .checkout-container {
    grid-template-columns: 1fr; /* Apila formulario + resumen */
  }
}
```

### Admin Product Detail

```css
/* Grid de información responsivo */
display: grid;
grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
gap: 20px;
```

---

## Temas (Claro / Oscuro)

El cambio de tema es instantáneo via CSS Variables:

```css
/* theme.css */
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a2e;
}
[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-text: #e0e0e0;
}
```

No hay re-renderizado de componentes — solo cambio de variables CSS,
lo que hace la transición extremadamente eficiente.

---

## Pruebas de Responsividad

Para verificar la responsividad:

```bash
# Build de producción
cd frontend && npm run build

# Servir localmente y probar
npx serve dist
```

Probar en:
- Chrome DevTools: 320px, 480px, 768px, 1024px, 1440px
- Dispositivos reales: Android (Chrome), iOS (Safari)
- Navegadores: Chrome, Firefox, Safari, Edge
