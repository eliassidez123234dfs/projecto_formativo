# 🎨 Arquitectura Visual del Proyecto - Guía de Diseño Corporativo

## 📋 Estructura de Diseño

El proyecto está rediseñado con una arquitectura visual **corporativa, limpia y profesional** que refleja la naturaleza de un e-commerce de ropa personalizada 3D.

### **Paleta de Colores**

```
Blanco:       #FFFFFF  (Fondo principal)
Rojo:         #DC2626  (Color de marca - CTAs, acentos)
Negro:        #000000  (Solo tipografía, bordes mínimos)
Grises:       Escala completa (fondos secundarios, bordes, texto)
```

**Uso:**
- ✅ **Blanco:** Fondos principales, espacios respirable
- ✅ **Rojo:** Botones primarios, links, estado activo, badges destacados
- ✅ **Negro:** Solo títulos y body text
- ✅ **Grises:** Bordes, fondos secundarios, textos muted

---

## 🏗️ Estructura de Páginas

### 1. **Landing Page** (`/`)
**Propósito:** Presentar la tienda y atraer nuevos clientes

**Secciones:**
```
├── Header (Logo + Nav + Carrito + Login)
├── Hero Section (Propuesta de valor)
├── Características (Grid de 3 características)
├── Catálogo Destacado (Grid de 4-6 productos)
├── CTA Section (Llamada a acción)
└── Footer
```

**Componentes:**
- Header reutilizable
- Hero con imagen/video placeholder
- Feature Cards (con iconos)
- Product Cards (imagen + precio + CTA)
- Footer simple

---

### 2. **Auth Page** (`/login` y `/register`)
**Propósito:** Autenticar usuarios con una experiencia clara

**Layout:**
```
┌─────────────────────────────┬──────────────────────┐
│                             │                      │
│  FORMULARIO (Lado Izquierdo)│ BENEFICIOS (Derecha) │
│                             │                      │
│  ┌──────────────────┐       │  ┌─────────────────┐ │
│  │ Login/Register   │       │  │ • Personaliza   │ │
│  │ Tabs arriba      │       │  │ • 3D Editor     │ │
│  │                  │       │  │ • Envío rápido  │ │
│  │ Formulario limpio│       │  │ • Garantía      │ │
│  │                  │       │  │                 │ │
│  │ [Botón CTA]      │       │  │ + Testimonio    │ │
│  └──────────────────┘       │  └─────────────────┘ │
│                             │                      │
└─────────────────────────────┴──────────────────────┘

Responsive: En mobile, beneficios van abajo
```

**Componentes:**
- Tab switcher (Login/Register)
- Form inputs con validación
- Forgotten password link
- Benefits sidebar (con iconos + texto)

---

### 3. **Catálogo** (`/catalog`)
**Propósito:** Explorar y comprar productos

**Layout:**
```
┌────────────────────────────────────────────┐
│              Header                        │
├──────────────┬───────────────────────────┤
│              │                           │
│  Filtros     │   Grid de Productos      │
│  • Talla     │                           │
│  • Color     │   ┌─────┬─────┬─────┐    │
│  • Precio    │   │ │ │ │ │ │    │
│  • Ordenar   │   ├─────┼─────┼─────┤    │
│              │   │ │ │ │ │ │    │
│              │   └─────┴─────┴─────┘    │
│              │                           │
│              │   Paginación              │
│              │                           │
└──────────────┴───────────────────────────┘
```

**Componentes:**
- Filter sidebar (collapsible en mobile)
- Product grid (responsive)
- Product cards con hover effects
- Pagination/Infinite scroll

---

### 4. **Detalle de Producto** (`/product/:id`)
**Propósito:** Mostrar detalles y opciones de personalización

**Layout:**
```
┌─────────────────────────────────────────────┐
│            Header                           │
├──────────────┬────────────────────────────┤
│              │                            │
│ Galería      │  Información               │
│ Imágenes     │  • Nombre                  │
│ Carrusel     │  • Precio                  │
│ Zoom         │  • Descripción             │
│              │  • Variantes (tabs)        │
│              │  • Stock                   │
│              │  • [Agregar al carrito]    │
│              │  • [Usar 3D Editor]        │
│              │                            │
│              │  Detalles                  │
│              │  • Fabricación             │
│              │  • Envío                   │
│              │  • Garantía                │
│              │                            │
└──────────────┴────────────────────────────┘
```

**Componentes:**
- Image gallery con zoom
- Variant selector (talla, color)
- Quantity selector
- Add to cart button
- 3D editor button (para productos personalizables)

---

### 5. **Dashboard** (`/dashboard`)
**Propósito:** Gestionar perfil, órdenes, carrito

**Layout:**
```
┌──────────────┬────────────────────────────────┐
│              │                                │
│  Sidebar     │  Contenido Principal           │
│              │                                │
│  • Usuario   │  ┌──────────────────────────┐ │
│    • Avatar  │  │ Tabs: Perfil│Órdenes│... │ │
│    • Email   │  ├──────────────────────────┤ │
│    • Status  │  │                          │ │
│              │  │  Contenido dinámico      │ │
│  Menú        │  │  según tab activo        │ │
│  • Perfil    │  │                          │ │
│  • Órdenes   │  │                          │ │
│  • Carrito   │  │                          │ │
│  • Config    │  │                          │ │
│  • Logout    │  └──────────────────────────┘ │
│              │                                │
└──────────────┴────────────────────────────────┘

Responsive: Sidebar se convierte en hamburger menu o se acomoda arriba
```

**Componentes:**
- User card con avatar
- Sidebar navigation
- Tab navigation
- Profile form
- Orders table
- Cart items list con resumen

---

## 🎯 Principios de Diseño

### 1. **Jerarquía Visual**
- Títulos: Negro, bold, 24-36px
- Subtítulos: Negro, semibold, 16-20px
- Body: Gris-600, normal, 14-16px
- Muted: Gris-500, normal, 12-14px

### 2. **Espaciado Generoso**
```
Espacios amplios entre secciones (32-64px)
Padding interno en tarjetas (16-24px)
Gap entre elementos (8-16px)
Breathing room en formularios
```

### 3. **Interacciones Sutiles**
- Transiciones de 150-300ms
- Hover effects que indican interactividad
- Colores de error/success claros
- Loading states bien definidos

### 4. **Tipografía**
- Font: System fonts (-apple-system, Segoe UI, etc.)
- Weights: Light (300), Normal (400), Medium (500), Semibold (600), Bold (700)
- Sizes escaladas con clamp()

### 5. **Componentes Reutilizables**
```
Botones:     Primary, Secondary, Outline, Ghost
Inputs:      Text, Select, Textarea
Cards:       Product, Feature, Order, Profile
Alerts:      Success, Error, Warning, Info
Badges:      Status, Category, Tag
```

---

## 📁 Estructura de Carpetas (Recomendada)

```
frontend/src/
├── components/
│   ├── Header.jsx
│   ├── Footer.jsx
│   ├── Button.jsx
│   ├── FormInput.jsx
│   ├── ProductCard.jsx
│   ├── Alert.jsx
│   └── ...
├── pages/
│   ├── Landing.jsx (nuevo diseño)
│   ├── Auth.jsx (nuevo diseño)
│   ├── Catalog.jsx (nuevo diseño)
│   ├── ProductDetail.jsx (nuevo)
│   ├── Dashboard.jsx (nuevo diseño)
│   └── ...
├── styles/
│   ├── globals.css (variables + reset)
│   ├── components.css (componentes base)
│   ├── landing-new.css
│   ├── auth-new.css
│   ├── dashboard-new.css
│   ├── catalog.css (por crear)
│   └── ...
└── main.jsx
```

---

## 🔧 Variables CSS Globales

```css
/* Colores */
--color-white: #FFFFFF;
--color-black: #000000;
--color-red: #DC2626;
--color-gray-{50,100,200,...,900}: escala de grises

/* Tipografía */
--font-size-{xs,sm,base,lg,xl,2xl,3xl,4xl}
--font-weight-{light,normal,medium,semibold,bold}

/* Espaciado */
--spacing-{xs,sm,md,lg,xl,2xl,3xl,4xl}

/* Transiciones */
--transition-{fast,base,slow}

/* Sombras */
--shadow-{xs,sm,md,lg,xl}

/* Radios de borde */
--radius-{sm,md,lg,xl,full}
```

---

## 📱 Breakpoints Responsive

```css
Desktop:  1200px+
Tablet:   768px - 1199px
Mobile:   < 768px
```

**Regla:** Mobile-first, expandir hacia arriba

---

## 🎪 Composición de Páginas

### Landing Page
```
Header (sticky)
  └─ Logo + Nav + Cart + Auth buttons
Hero Section
  └─ Contenido + CTA buttons
Features Grid
  └─ 3 características principales
Featured Products
  └─ Grid responsive de productos
CTA Section
  └─ Llamada a acción para registro
Footer
  └─ Links + Info
```

### Auth Page
```
Form Section (50% ancho en desktop)
  └─ Tabs (Login/Register)
  └─ Form inputs
  └─ CTA button
Benefits Section (50% ancho en desktop)
  └─ Título
  └─ List de beneficios
  └─ Highlight quote
```

### Dashboard
```
Sidebar (280px en desktop)
  └─ User card
  └─ Nav items
Main Content
  └─ Tab navigation
  └─ Panel content (dinámico)
```

---

## 🎨 Estados de UI

### Botones
- Normal: Fondo rojo
- Hover: Rojo oscuro + shadow
- Active: Presionado
- Disabled: Opacity 50%

### Inputs
- Default: Borde gris claro
- Focus: Borde rojo + shadow rojo suave
- Error: Borde rojo + fondo rojo suave
- Disabled: Fondo gris + texto desactivado

### Cards
- Normal: Borde gris claro
- Hover: Borde gris + shadow suave
- Active: Borde rojo

### Status Badges
- Activo: Verde
- Pendiente: Amarillo
- Completado: Verde
- Cancelado: Rojo

---

## 📐 Figuras Recomendadas

- **Radius mínimo:** 4px (inputs, botones)
- **Radius medio:** 8px (cards)
- **Radius grande:** 12px (containers principales)
- **Radius full:** Badges, avatares

---

## ✨ Características Corporativas

✅ Sin animaciones excesivas
✅ Transiciones suaves y propositivas
✅ Espacios amplios y respirable
✅ Tipografía legible
✅ Contraste suficiente
✅ Accesibilidad WCAG AA
✅ Sin efectos futuristas (neón, glassmorphism)
✅ Paleta limpia y profesional

---

## 📚 Ficheros de Estilos Creados

```
✅ globals.css        - Variables y reset global
✅ components.css     - Header, botones, forms, cards, alerts
✅ landing-new.css    - Página de inicio
✅ auth-new.css       - Página de autenticación
✅ dashboard-new.css  - Dashboard con sidebar
```

---

## 🚀 Próximos Pasos

1. Crear componentes React reutilizables
2. Actualizar páginas con nuevos estilos
3. Implementar responsive design
4. Agregar animaciones sutiles
5. Implementar dark mode (opcional)
6. A/B testing con usuarios

---

**Último actualizado:** 12 de mayo de 2026
**Versión:** 2.0 - Diseño Corporativo Limpio
