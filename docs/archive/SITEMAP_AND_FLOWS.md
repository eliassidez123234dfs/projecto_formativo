> ⚠️ **Documento Original** — Este documento refleja el sitemap y flujos diseñados en la fase inicial del proyecto. Algunas rutas y flujos pueden haber cambiado durante la implementación. Para la especificación actualizada consulta [`.specify/spec.md`](../.specify/spec.md).

# 🗺️ Sitemap Visual y Flujos de Usuario

## 📍 Estructura Completa del Sitio

```
┌─────────────────────────────────────────────────────────────────┐
│                    TShirtStudio Sitemap                         │
└─────────────────────────────────────────────────────────────────┘

                              Home (/)
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
            Catálogo        Acerca de         FAQ
             (/catalog)     (/about)         (/faq)
                  │
        ┌─────────┴──────────┐
        │                    │
    Producto            Filtros
   (/product/:id)    (Sidebar)
        │
        ├─ [Ver Detalles]
        ├─ [3D Editor]
        └─ [Agregar al Carrito]
              │
              ▼
          Carrito
         (/cart)
              │
              ├─ [Ver Carrito]
              └─ [Checkout]
                    │
                    ▼
              Checkout
            (/checkout)
                    │
              ┌─────┴─────┐
              │           │
         Login      Register
       (/login)   (/register)
              │           │
              └─────┬─────┘
                    │
                    ▼
              Dashboard
            (/dashboard)
                    │
        ┌───────────┼───────────┬────────────┐
        │           │           │            │
      Perfil    Órdenes     Carrito    Config
                             │
                    ┌────────┴────────┐
                    │                 │
                  Compra          Seguimiento
                                 (/orders/:id)

─────────────────────────────────────────────────────────────────
Públicas (sin login):  /, /catalog, /product/:id, /about, /faq
Autenticadas:          /dashboard, /cart, /checkout, /orders
─────────────────────────────────────────────────────────────────
```

---

## 👤 Flujos de Usuario Principales

### 1️⃣ FLUJO DE EXPLORACIÓN (Visitor → Browser)

```
┌─────────────────────────────────────────────────────────────┐
│                  FLUJO DE EXPLORACIÓN                       │
└─────────────────────────────────────────────────────────────┘

START
  │
  ▼
┌─────────────────────────────┐
│  Landing Page (Home)        │     ← He escuchado de TShirtStudio
│  • Hero + Propuesta         │
│  • Características          │
│  • Productos destacados     │
│  • CTA: "Comenzar" / "Ver"  │
└────────┬────────────────────┘
         │
         ├─ [Comenzar] → Catálogo
         └─ [Ver] → Catálogo
              │
              ▼
         ┌──────────────────────────┐
         │  Catálogo (Productos)    │
         │  • Filter: Talla, Color  │
         │  • Grid: Productos       │
         │  • Sort: Popular, Nuevo  │
         └─────────┬────────────────┘
                   │
                   ├─ [Ver Detalles] → Product Detail
                   └─ [Seguir navegando]
                        │
                        ▼
              ┌──────────────────────────┐
              │  Producto (Detail)       │
              │  • Galería               │
              │  • Variantes             │
              │  • Descripción           │
              │  • [3D Editor]           │
              │  • [Agregar Carrito]    │
              └─────┬────────────────────┘
                    │
                    ├─ [3D Editor] → Editor 3D (Microservice)
                    │                 │
                    │                 └─ [Guardar] → Agregar al carrito
                    │
                    └─ [Agregar] → Carrito +1
                         │
                         ▼
                    ┌──────────────┐
                    │  Carrito     │
                    │  • Items: 1  │
                    │  • Total: $$ │
                    └──┬───────┬───┘
                       │       │
                       │   [Seguir comprando]
                       │   (vuelve a catálogo)
                       │
                       ▼
                    [Checkout]
```

---

### 2️⃣ FLUJO DE COMPRA (Browser → Customer)

```
┌─────────────────────────────────────────────────────────────┐
│              FLUJO DE COMPRA Y CHECKOUT                     │
└─────────────────────────────────────────────────────────────┘

START (Carrito con items)
  │
  ▼
┌──────────────────────────┐
│  Revisar Carrito         │
│  • Items: [Producto 1]   │
│  • Qty: 2                │
│  • Total: $59.98         │
│  CTA: [Checkout]         │
└─────────┬────────────────┘
          │
          ▼
      ┌────────────────┐
      │ ¿Login?        │
      └────┬────┬──────┘
           │    │
      [Login] [Register]
           │    │
           └──┬─┘
              │
              ▼
      ┌────────────────────────────┐
      │  Checkout                  │
      │  • Datos personales        │
      │  • Dirección de envío      │
      │  • Método de pago          │
      │  • Resumen de orden        │
      │  • [Completar Compra]      │
      └──────┬─────────────────────┘
             │
             ▼ (Procesar Pago)
      ┌────────────────────────────┐
      │  ¿Pago Exitoso?            │
      └────┬─────────────┬──────────┘
           │             │
          SÍ             NO
           │             │
           ▼             ▼
      ┌──────────────────────────┐
      │  Confirmación            │
      │  • Gracias por tu compra  │
      │  • # Orden: #12345       │
      │  • Estado: Procesando... │
      │                          │
      │  [Ver Orden]             │
      │  [Seguir Comprando]      │
      └──────┬───────────────────┘
             │
             ▼
      ┌──────────────────────────┐
      │  Email de Confirmación   │
      │  • Detalles de orden     │
      │  • Rastreo de envío      │
      │  • Contacto             │
      └──────────────────────────┘
```

---

### 3️⃣ FLUJO DE USUARIO REGISTRADO (Customer)

```
┌──────────────────────────────────────────────────────────────┐
│        FLUJO DE USUARIO REGISTRADO (Dashboard)              │
└──────────────────────────────────────────────────────────────┘

LOGIN (email + password)
  │
  ▼
┌──────────────────────────────────────────┐
│  Dashboard                               │
│  ┌────────────────────────────────────┐ │
│  │ Sidebar:                           │ │
│  │ • Avatar + Nombre                  │ │
│  │ • Email: usuario@example.com       │ │
│  │ • Status: ✓ Activo                 │ │
│  │                                    │ │
│  │ Menu:                              │ │
│  │ • Perfil                           │ │
│  │ • Mis Órdenes                      │ │
│  │ • Mi Carrito                       │ │
│  │ • Configuración                    │ │
│  │ • [Logout]                         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Contenido Principal (Dinámico)     │ │
│  │                                    │ │
│  │ TAB: PERFIL                        │ │
│  │ ├─ Nombre                         │ │
│  │ ├─ Email                          │ │
│  │ ├─ Teléfono                       │ │
│  │ ├─ Dirección                      │ │
│  │ └─ [Guardar cambios]              │ │
│  │                                    │ │
│  │ TAB: ÓRDENES                       │ │
│  │ ├─ Tabla:                         │ │
│  │ │  # Orden | Fecha | Estado | $ │ │
│  │ │ #12345 | 01/05 | Enviado | $59│ │
│  │ │ #12344 | 30/04 | Completado | $29│ │
│  │ └─ [Ver detalles]                 │ │
│  │                                    │ │
│  │ TAB: CARRITO                       │ │
│  │ ├─ Items:                         │ │
│  │ │  [Imagen] Camisa Clásica x2    │ │
│  │ │  Talla: M | Color: Rojo        │ │
│  │ │  [-] 2 [+]  $59.98             │ │
│  │ │  [Eliminar]                    │ │
│  │ ├─ Resumen:                       │ │
│  │ │  Subtotal: $59.98              │ │
│  │ │  Envío: $5.00                  │ │
│  │ │  TOTAL: $64.98                 │ │
│  │ └─ [Checkout] [Seguir comprando]  │ │
│  │                                    │ │
│  │ TAB: CONFIGURACIÓN                 │ │
│  │ ├─ Notificaciones: ✓ ON           │ │
│  │ ├─ Newsletter: ✗ OFF              │ │
│  │ ├─ Idioma: Español                │ │
│  │ └─ [Guardar]                      │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

---

### 4️⃣ FLUJO DE PERSONALIZACIÓN 3D (Opcional)

```
┌──────────────────────────────────────────────┐
│     FLUJO DE PERSONALIZACIÓN 3D              │
└──────────────────────────────────────────────┘

Producto encontrado
  │
  ▼
┌─────────────────────────┐
│ [3D Editor] button      │
└──────┬──────────────────┘
       │
       ▼ (Abre microservicio en ventana/modal)
┌──────────────────────────────────────────┐
│  3D Shirt Editor (Microservicio)         │
│  • Vista 3D interactiva                  │
│  • Upload de imagen/diseño               │
│  • Ajuste de posición/escala             │
│  • Selección de color base               │
│  • Preview en tiempo real                │
│  • [Guardar] / [Cancelar]                │
└──────┬───────────────────────────────────┘
       │
       ├─ [Cancelar] → Vuelve al producto
       │
       └─ [Guardar]
           │
           ▼
       Agregar al carrito con diseño guardado
           │
           ▼
       Carrito + Resumen de personalización
```

---

## 🎯 Puntos de Conversión Clave

### 🔴 CTAs Primarias (Rojo)
1. **Landing → Catálogo:** "Comenzar" button
2. **Catálogo → Producto:** "Ver" link en cards
3. **Producto → Carrito:** "Agregar al Carrito" button
4. **Carrito → Checkout:** "Checkout" button
5. **Auth → Dashboard:** Submit button en formulario
6. **Dashboard → Compra:** "Continuar compra" button

### 🔗 CTAs Secundarias
1. **Landing:** "Ver Galería" (outline button)
2. **Producto:** "Usar 3D Editor" (outline button)
3. **Carrito:** "Seguir Comprando" (secondary button)
4. **Dashboard:** Tabs para navegar secciones

---

## 📊 Matriz de Páginas

| Página | URL | Pública | Auth | Descripción |
|--------|-----|---------|------|-------------|
| Landing | `/` | ✅ | ❌ | Home principal |
| Catálogo | `/catalog` | ✅ | ❌ | Listado de productos |
| Producto | `/product/:id` | ✅ | ❌ | Detalle + personalizar |
| Carrito | `/cart` | ✅ | ✅ | Items + checkout |
| Auth | `/login` `/register` | ✅ | ❌ | Login/Registro |
| Dashboard | `/dashboard` | ❌ | ✅ | Panel usuario |
| Órdenes | `/orders` | ❌ | ✅ | Historial |
| Orden Detalle | `/orders/:id` | ❌ | ✅ | Detalle de orden |
| 404 | `*` | ✅ | ✅ | Página no encontrada |

---

## 🎨 Componentes por Página

### Landing
- Header
- HeroSection
- FeatureCard (x3)
- ProductCard (x6)
- CTA Section
- Footer

### Catálogo
- Header
- FilterSidebar
- ProductCard (grid)
- Pagination
- Footer

### Producto Detail
- Header
- ImageGallery
- VariantSelector
- ProductInfo
- RelatedProducts
- Footer

### Carrito
- Header
- CartItem (list)
- CartSummary
- CheckoutButton
- ContinueShoppingButton
- Footer

### Auth
- Header
- AuthForm
- TabSwitcher
- BenefitsSidebar
- Footer

### Dashboard
- Header
- DashboardSidebar
- TabNavigation
- DynamicContent (varies per tab)
- Footer

---

## 📱 Responsive Behavior

### Desktop (1200px+)
```
Header ← nav, carrito, login
Hero 2 cols
Features 3 cols
Productos 4 cols
Catalog: Sidebar + Grid
```

### Tablet (768-1199px)
```
Header ← hamburger menu
Hero 1 col
Features 2 cols
Productos 2-3 cols
Catalog: Sidebar collapsible
Dashboard: Tabs en fila
```

### Mobile (<768px)
```
Header ← hamburger menu
Hero 1 col stacked
Features 1 col
Productos 1 col
Catalog: Filtros en modal
Dashboard: Tabs scrolleable
Sidebar: Accordion
```

---

## 🔐 Protección de Rutas

```
Públicas (no require auth):
├─ /
├─ /catalog
├─ /product/:id
├─ /login
├─ /register
├─ /about
└─ /faq

Protegidas (require auth):
├─ /dashboard
├─ /cart (parcial)
├─ /checkout
├─ /orders
└─ /orders/:id
```

---

## 🎬 Estados de Carga

```
Inicial:      Loading spinner
Cargado:      Contenido visible
Error:        Alert error + retry button
Vacío:        Empty state + CTA
Procesando:   Loading overlay + mensaje
```

---

## 📊 Analytics Events

```
pageview          → Cada página
button_click      → Cada CTA
add_to_cart       → Agregar carrito
checkout_start    → Iniciar compra
purchase          → Compra exitosa
form_submit       → Login/Register
search            → Búsqueda en catálogo
filter_applied    → Aplicar filtro
```

---

**Documento creado:** 12 de mayo de 2026  
**Version:** 2.0 - Arquitectura Corporativa  
**Versión final:** ✅ Completa y lista para handoff
