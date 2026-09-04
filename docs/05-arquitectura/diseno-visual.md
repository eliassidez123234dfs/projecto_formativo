# Guía de diseño del proyecto

> Migrado desde `/DESIGN_GUIDE.md` (raíz) a la estructura oficial de documentación.

Este documento describe los principios de diseño visual y los criterios de interfaz para el proyecto.

## Principios de diseño

- Claridad: la interfaz debe ser legible y fácil de entender.
- Jerarquía visual: los elementos más importantes deben destacarse con tamaño, color y espacio.
- Consistencia: los componentes deben seguir un patrón visual uniforme.
- Responsividad: la interfaz debe adaptarse a diferentes tamaños de pantalla.
- Simplicidad: priorizar la funcionalidad evitando elementos innecesarios.

## Paleta de colores

- Primario: #dc2626
- Blanco: #ffffff
- Texto principal: #111111
- Texto secundario: #4b5563
- Fondo secundario: #f8fafc
- Borde: #d1d5db

## Tipografía

- Familia principal: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif.
- Peso de títulos: 600 o 700.
- Peso de texto de cuerpo: 400.
- Espaciado de línea sugerido: 1.5.

## Componentes principales

### Botones

- Botón primario: fondo #dc2626, texto blanco.
- Botón secundario: borde #dc2626, fondo transparente.
- Botón deshabilitado: fondo #e5e7eb, texto #9ca3af.
- Esquinas con radio de 0.75rem.
- Transición de color de fondo de 150ms.

### Formularios

- Bordes de 1px sólidos en #d1d5db.
- Relleno interno de 0.75rem.
- Texto en #111827.
- Indicadores de error en #dc2626.

### Tarjetas

- Fondo blanco.
- Borde suave de 1px en #e5e7eb.
- Sombra ligera para separación visual.
- Relleno interno de 1.25rem.

## Diseño de páginas

### Landing

- Secciones claras: encabezado, propuesta de valor, características, productos destacados y pie de página.
- Enfoque en la conversión: llamadas a la acción visibles.
- Uso de espacios amplios para favorecer la lectura.

### Autenticación

- Layout sencillo con alternancia entre login y registro.
- Campos claros y botones de acción bien definidos.
- Mensajes de error visibles y comprensibles.

### Catálogo

- Filtros a la vista en escritorio y en modal en móvil.
- Grid de productos responsive.
- Tarjetas de producto con información concisa.

### Detalle de producto

- Imagen principal con miniaturas.
- Información clara de precio, variantes y stock.
- Botones de acción para agregar al carrito y acceder al editor.

### Dashboard de usuario

- Navegación lateral o superior según el tamaño de pantalla.
- Secciones para perfil, órdenes y carrito.
- Formularios y tablas ordenadas.

## Responsive

- Desktop: diseño de varias columnas y navegación completa.
- Tablet: sidebar colapsable y disposición en dos columnas.
- Móvil: navegación vertical y elementos táctiles grandes.

### Estrategia General

El frontend usa un enfoque **mobile-first** con breakpoints definidos en
`responsive.css`. El sistema de layout se basa en:

1. **CSS Grid** para el layout principal (sidebar + contenido)
2. **Clases condicionales** para estados (`.sidebar-collapsed`, `.sidebar-open`)
3. **Bootstrap 5.3** para componentes y sistema de rejilla
4. **CSS Variables** para temas claro/oscuro

### Breakpoints

| Rango | Clasificación | Breakpoint | Archivo |
|-------|---------------|------------|---------|
| < 480px | Teléfonos pequeños | `@media (max-width: 480px)` | `responsive.css:240` |
| 480-768px | Teléfonos grandes | `@media (max-width: 768px)` | `responsive.css:290` |
| 769-1024px | Tablets | `@media (max-width: 1024px)` | `responsive.css:400` |
| 1025-1280px | Desktop pequeño | `@media (max-width: 1280px)` | `responsive.css:500` |
| > 1280px | Desktop grande | Default | `main-layout.css` |

### Sistema de Layout (Sidebar + Contenido)

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

| Dispositivo | Sidebar | Contenido |
|-------------|---------|-----------|
| Desktop (>1024px) | Fija (260px o 70px colapsada) | Fluye al lado |
| Tablet (768-1024px) | Overlay (se superpone) | Ancho completo |
| Móvil (<768px) | Overlay + animación slide | Ancho completo |

### Sidebar Overlay (móvil)

```css
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

### ScrollToTop

Componente fijo en la esquina inferior derecha (44×44px) que aparece al hacer scroll >400px hacia
abajo. Animación elástica (`cubic-bezier(0.34,1.56,0.64,1)`) y `willChange: transform, opacity`
para rendimiento.

### Breadcrumbs

Navegación secundaria generada dinámicamente desde `useLocation()`. Usa `flex-wrap: wrap` para
adaptarse a pantallas estrechas, soporta 30+ rutas y acepta `pageTitle` prop para sobrescribir la
última etiqueta.

### Formularios Adaptables

**Checkout:**

```css
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

**Admin Product Detail:** `grid-template-columns: repeat(auto-fit, minmax(340px, 1fr))`.

### Temas (Claro / Oscuro)

El cambio de tema es instantáneo vía CSS Variables (sin re-renderizado de componentes):

```css
:root {
  --color-bg: #ffffff;
  --color-text: #1a1a2e;
}
[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-text: #e0e0e0;
}
```

### Pruebas de Responsividad

```bash
cd frontend && npm run build
npx serve dist
```

Probar en Chrome DevTools (320px, 480px, 768px, 1024px, 1440px), dispositivos reales (Android/iOS)
y navegadores (Chrome, Firefox, Safari, Edge).

## Ejemplos de Componentes Reutilizables

Ver el archivo dedicado [`ejemplos-componentes.md`](./ejemplos-componentes.md) con ejemplos de
código JSX de los componentes reutilizables del proyecto (Header, Button, FormInput, ProductCard,
Alert, Card, HeroSection, FeatureCard, DashboardTab, OrdersTable, CartItem, Footer).

## Recomendaciones

- Mantener el texto conciso.
- Priorizar el contraste en botones y enlaces.
- Evitar colores conflictivos.
- Garantizar legibilidad en todas las resoluciones.
