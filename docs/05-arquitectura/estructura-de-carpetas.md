# Estructura de Carpetas

> **Última actualización:** 2026-09-11 — Sincronizado con código fuente real

## 1. Estructura General del Repositorio

```
proyecto_formativo/
├── backend/                          # API Django REST
│   ├── apps/                         # 9 Aplicaciones del negocio
│   │   ├── users/                    # Autenticacion JWT, usuarios, auditoria
│   │   ├── products/                 # CRUD de productos, variantes, imagenes, reseñas
│   │   ├── catalog/                  # Catalogo publico, busqueda, filtros, categorias
│   │   ├── carts/                    # Carrito de compras (sesion + usuario)
│   │   ├── checkout/                 # Proceso de compra (Wompi)
│   │   ├── orders/                   # Ordenes, pedidos y facturacion
│   │   ├── landing/                  # Formulario de contacto
│   │   ├── models3d/                 # Modelos 3D y gestion Cloudinary
│   │   └── monitoring/               # Logs de errores del frontend
│   ├── config/                       # Configuracion de Django
│   │   ├── settings.py               # Configuracion general
│   │   ├── urls.py                   # Rutas principales
│   │   ├── wsgi.py                   # Entrypoint WSGI
│   │   └── asgi.py                   # Entrypoint ASGI
│   ├── media/                        # Archivos multimedia subidos
│   ├── logs/                         # Archivos de log
│   ├── manage.py                     # CLI de Django
│   ├── requirements.txt              # Dependencias Python (53 paquetes)
│   ├── Dockerfile                    # Imagen Docker desarrollo
│   ├── Dockerfile.prod               # Imagen Docker produccion (multi-stage)
│   ├── entrypoint.sh                 # Script de inicio del contenedor
│   └── db.sqlite3                    # Base de datos SQLite (desarrollo)
│
├── frontend/                         # Aplicacion React 19 (SPA)
│   ├── public/                       # Archivos publicos estaticos
│   ├── src/                          # Codigo fuente
│   │   ├── assets/                   # Imagenes y recursos estaticos
│   │   ├── components/               # 22 Componentes reutilizables
│   │   │   ├── catalog/              # Componentes del catalogo
│   │   │   │   ├── FilterSidebar.jsx
│   │   │   │   ├── TShirtSVG.jsx
│   │   │   │   ├── PriceRange.jsx
│   │   │   │   └── AddToCartModal.jsx
│   │   │   ├── contact/              # Componentes de contacto
│   │   │   │   └── ConfirmModal.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── ProductList.jsx
│   │   │   ├── ProductForm.jsx
│   │   │   ├── UserList.jsx
│   │   │   ├── UserFilters.jsx
│   │   │   ├── UserEditModal.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── FormModal.jsx
│   │   │   ├── InfoModal.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── ScrollTopButton.jsx
│   │   │   ├── VariantPickerModal.jsx
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── ErrorState.jsx
│   │   │   └── Spinner.jsx
│   │   ├── pages/                    # 25 Paginas / vistas
│   │   │   ├── Landing.jsx
│   │   │   ├── AuthPage.jsx
│   │   │   ├── Catalog.jsx
│   │   │   ├── Category.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── CheckoutPage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── UserProfile.jsx
│   │   │   ├── Email.jsx
│   │   │   ├── Password.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminProducts.jsx
│   │   │   ├── AdminProductDetail.jsx
│   │   │   ├── AdminProductApproval.jsx
│   │   │   ├── AdminUsers.jsx
│   │   │   ├── AdminCart.jsx
│   │   │   ├── AdminCartDetail.jsx
│   │   │   ├── AdminContact.jsx
│   │   │   ├── AdminOrders.jsx
│   │   │   ├── AdminOrderDetail.jsx
│   │   │   ├── AdminAudit.jsx
│   │   │   └── AdminCloudinary.jsx
│   │   ├── context/                  # Contextos de React
│   │   │   ├── ThemeContext.jsx       # Tema claro/oscuro
│   │   │   └── CartContext.jsx        # Estado global del carrito
│   │   ├── hooks/                    # Hooks personalizados
│   │   │   └── useMediaQuery.js      # Deteccion de breakpoints responsive
│   │   ├── services/                 # Servicios API
│   │   │   ├── api.js                # Cliente Axios con interceptors y refresh queue
│   │   │   └── authService.js        # Gestion de JWT y sesion
│   │   ├── utils/                    # Utilidades (6 modulos)
│   │   ├── styles/                   # 18 Hojas de estilo (CSS + SCSS)
│   │   ├── data/                     # Datos estaticos
│   │   ├── App.jsx                   # Componente raiz con 30+ rutas
│   │   └── main.jsx                  # Punto de entrada
│   ├── index.html                    # HTML base
│   ├── vite.config.js                # Configuracion de Vite
│   ├── eslint.config.js              # Configuracion de ESLint
│   ├── package.json                  # Dependencias Node
│   ├── Dockerfile                    # Imagen Docker desarrollo
│   └── Dockerfile.prod               # Imagen Docker produccion (multi-stage)
│
├── microservices/                    # Microservicios independientes
│   └── Tshirt3D/                     # Editor 3D (React 18 + Three.js)
│       ├── src/                      # Codigo del editor 3D
│       ├── vite.config.js            # Configuracion de Vite
│       ├── tailwind.config.js        # Configuracion de Tailwind CSS
│       ├── package.json              # Dependencias
│       └── Dockerfile                # Imagen Docker
│
├── docs/                             # Documentacion del proyecto
│   ├── 01-introduccion/              # Introduccion, justificacion, objetivos
│   ├── 02-alcance-y-metodologia/     # Alcance, limitaciones, metodologia
│   ├── 03-requisitos/                # Requisitos funcionales y no funcionales
│   ├── 04-diseno-uml/                # Diagramas UML y modelo entidad-relacion
│   ├── 05-arquitectura/              # Arquitectura, patrones, estructura, stack
│   ├── 06-base-de-datos/             # Modelo de datos y diccionario
│   ├── 07-api/                       # Documentacion de la API REST
│   │   └── endpoints/                # Detalle por recurso
│   ├── 08-instalacion-entorno-desarrollo/  # Setup y configuracion de entorno
│   ├── 09-despliegue/                # Despliegue en produccion
│   ├── 10-pruebas/                   # Estrategias de pruebas y BDD
│   ├── 11-gestion-proyecto/          # Contribucion, workflow git, herramientas
│   ├── 12-historial/                 # Bitacora, changelog, roadmap
│   ├── 13-admin/                     # Documentacion del panel admin
│   ├── archive/                      # Documentacion historica
│   ├── diagrams/                     # Diagramas PlantUML
│   └── README.md                     # Indice general de documentacion
│
├── docker-compose.yml                # Orquestacion de contenedores (desarrollo)
├── docker-compose.prod.yml           # Orquestacion de contenedores (produccion)
├── render.yaml                       # Blueprint para Render (CI/CD)
├── .env                              # Variables de entorno (root)
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore                        # Exclusiones de Git
├── CONTRIBUTING.md                   # Guia de contribucion
├── README.md                         # README principal del proyecto
├── start.sh                          # Script de inicio para Render
└── requirements.txt                  # Dependencias Python (raiz, duplicado)
```

## 2. Estructura Interna de una App Django

```
apps/<nombre_app>/
├── __init__.py
├── admin.py              # Configuracion del admin de Django
├── apps.py               # Metadatos de la aplicacion
├── models.py             # Modelos (entidades de base de datos)
├── views.py              # Vistas tradicionales (placeholders)
├── tests.py              # Pruebas unitarias
├── urls.py               # Rutas especificas (opcional)
│
├── migrations/           # Migraciones de base de datos
│   ├── __init__.py
│   ├── 0001_initial.py
│   └── ...
│
└── api/                  # Capa de API REST (modular)
    ├── __init__.py
    ├── serializers.py    # Serializers (transformacion datos)
    ├── viewset.py        # Viewsets (controladores REST)
    └── urls.py           # Rutas registradas en el router
```

## 3. Estructura de Componentes Frontend

```
src/
├── components/            # 22 Componentes reutilizables
│   ├── catalog/           # Componentes del catalogo
│   │   ├── FilterSidebar.jsx    # Barra lateral de filtros
│   │   ├── TShirtSVG.jsx        # SVG de playera para preview
│   │   ├── PriceRange.jsx       # Selector de rango de precios
│   │   └── AddToCartModal.jsx   # Modal para agregar al carrito
│   ├── contact/           # Componentes de contacto
│   │   └── ConfirmModal.jsx     # Modal de confirmacion
│   ├── Header.jsx         # Encabezado con navegacion y carrito
│   ├── AdminLayout.jsx    # Layout del panel admin con sidebar
│   ├── ProtectedRoute.jsx # Guard de rutas protegidas (rol admin)
│   ├── ProductCard.jsx    # Card de producto en catalogo
│   ├── ProductList.jsx    # Lista de productos (admin)
│   ├── ProductForm.jsx    # Formulario de producto (admin)
│   ├── UserList.jsx       # Tabla de usuarios (admin)
│   ├── UserFilters.jsx    # Filtros de usuarios (admin)
│   ├── UserEditModal.jsx  # Modal de edicion de usuario
│   ├── Button.jsx         # Boton reutilizable
│   ├── Pagination.jsx     # Paginacion
│   ├── FormModal.jsx      # Modal generico para formularios
│   ├── InfoModal.jsx      # Modal informativo
│   ├── ThemeToggle.jsx    # Toggle de tema (claro/oscuro)
│   ├── ScrollTopButton.jsx # Boton para subir al inicio
│   ├── VariantPickerModal.jsx # Modal de seleccion de variante
│   ├── ErrorBoundary.jsx  # Captura de errores de React
│   ├── ErrorState.jsx     # Estado de error
│   └── Spinner.jsx        # Indicador de carga
│
├── pages/                # 25 Paginas de la aplicacion
│   ├── Landing.jsx            # Pagina de inicio (/)
│   ├── AuthPage.jsx           # Login / Registro (/login, /register)
│   ├── Catalog.jsx            # Catalogo de productos (/catalog, /catalogo)
│   ├── Category.jsx           # Productos por categoria (/category/:id)
│   ├── ProductDetail.jsx      # Detalle de producto (/product/:id)
│   ├── Cart.jsx               # Carrito de compras (/cart)
│   ├── CheckoutPage.jsx       # Proceso de checkout (/checkout)
│   ├── Dashboard.jsx          # Panel del usuario (/dashboard)
│   ├── UserProfile.jsx        # Perfil de usuario (/perfil)
│   ├── Email.jsx              # Verificacion de email (/email, /verificar-email)
│   ├── Password.jsx           # Recuperacion de password (/password, /nueva-password)
│   ├── AdminDashboard.jsx     # Admin: dashboard principal (/admin)
│   ├── AdminProducts.jsx      # Admin: gestion de productos (/admin-products)
│   ├── AdminProductDetail.jsx # Admin: detalle de producto (/admin-products/detail/:id)
│   ├── AdminProductApproval.jsx # Admin: aprobacion (/admin-products/approval)
│   ├── AdminUsers.jsx         # Admin: gestion de usuarios (/admin-users)
│   ├── AdminCart.jsx          # Admin: carritos (/admin-cart)
│   ├── AdminCartDetail.jsx    # Admin: detalle carrito (/admin-cart/:id)
│   ├── AdminContact.jsx       # Admin: mensajes de contacto (/admin-contact)
│   ├── AdminOrders.jsx        # Admin: ordenes (/admin-orders)
│   ├── AdminOrderDetail.jsx   # Admin: detalle de orden (/admin-orders/:id)
│   ├── AdminAudit.jsx         # Admin: auditoria (/admin-audit)
│   └── AdminCloudinary.jsx    # Admin: gestor Cloudinary (/admin-cloudinary)
│
├── context/              # Contextos de React
│   ├── ThemeContext.jsx   # Tema claro/oscuro
│   └── CartContext.jsx    # Estado global del carrito
│
├── hooks/                # Hooks personalizados
│   └── useMediaQuery.js   # Deteccion de breakpoints responsive
│
├── services/             # Servicios API (3 clientes)
│   ├── api.js             # Cliente Axios con interceptors JWT y refresh queue
│   └── authService.js     # Gestion de JWT y sesion
│
├── utils/                # Utilidades (6 modulos)
│
├── styles/               # 18 Hojas de estilo (CSS + SCSS)
│
├── data/                 # Datos estaticos
│
└── assets/               # Assets estaticos
```

## 4. Rutas Frontend (App.jsx)

```
/                                          -> Landing
/catalog                                   -> Catalog
/catalogo                                  -> Catalog (alias)
/category/:id                              -> Category
/product/:id                               -> ProductDetail
/cart                                      -> Cart
/checkout                                  -> CheckoutPage
/login                                     -> AuthPage (login)
/register                                  -> AuthPage (register)
/dashboard                                 -> Dashboard
/perfil                                    -> UserProfile
/email                                     -> Email
/verificar-email                           -> Email
/verificar-email-pendiente                 -> Email
/password                                  -> Password
/nueva-password                            -> Password

── PROTEGIDAS (requieren rol Admin) ──
/admin                                     -> AdminDashboard
/admin-products                            -> AdminProducts
/admin-products/detail/:id                 -> AdminProductDetail
/admin-products/approval                   -> AdminProductApproval
/admin-users                               -> AdminUsers
/admin-cart                                -> AdminCart
/admin-cart/:id                            -> AdminCartDetail
/admin-contact                             -> AdminContact
/admin-orders                              -> AdminOrders
/admin-orders/:id                          -> AdminOrderDetail
/admin-audit                               -> AdminAudit
/admin-cloudinary                          -> AdminCloudinary
```

## 5. Resumen de Estadisticas

| Aspecto | Cantidad |
|---------|----------|
| Apps Django (backend) | 9 |
| Modelos / Tablas DB | 21 tablas en 8 modulos |
| Endpoints API REST | 40+ endpoints |
| Paginas Frontend | 25 paginas |
| Componentes Frontend | 22 componentes reutilizables |
| Rutas Frontend | 30+ rutas (incluye aliases y protegidas) |
| Contextos React | 2 (Theme, Cart) |
| Hooks personalizados | 1 (useMediaQuery) |
| Servicios API | 3 clientes (api, publicApi, sessionApi) |
| Estilos CSS/SCSS | 18 archivos |
