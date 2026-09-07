# Estructura de Carpetas

## 1. Estructura General del Repositorio

```
proyecto_formativo/
├── backend/                          # API Django REST
│   ├── apps/                         # Aplicaciones del negocio
│   │   ├── users/                    # Gestion de usuarios y autenticacion
│   │   ├── products/                 # CRUD de productos, variantes, imagenes, reseñas
│   │   ├── catalog/                  # Catalogo publico y busqueda
│   │   ├── carts/                    # Carrito de compras
│   │   ├── checkout/                 # Proceso de compra (Wompi)
│   │   ├── orders/                   # Ordenes y pedidos
│   │   ├── landing/                  # Landing page y contacto
│   │   ├── models3d/                 # Modelos 3D
│   │   ├── monitoring/               # Logging y monitoreo de errores
│   │   └── management/               # Comandos personalizados de Django
│   ├── config/                       # Configuracion de Django
│   │   ├── settings.py               # Configuracion general
│   │   ├── urls.py                   # Rutas principales
│   │   ├── wsgi.py                   # Entrypoint WSGI
│   │   └── asgi.py                   # Entrypoint ASGI
│   ├── media/                        # Archivos multimedia subidos
│   ├── logs/                         # Archivos de log
│   ├── manage.py                     # CLI de Django
│   ├── requirements.txt              # Dependencias Python
│   ├── Dockerfile                    # Imagen Docker del backend
│   ├── entrypoint.sh                 # Script de inicio del contenedor
│   └── db.sqlite3                    # Base de datos SQLite (desarrollo)
│
├── frontend/                         # Aplicacion React (SPA)
│   ├── public/                       # Archivos publicos estaticos
│   ├── src/                          # Codigo fuente
│   │   ├── assets/                   # Imagenes y recursos estaticos
│   │   ├── components/               # Componentes reutilizables
│   │   │   └── ui/                   # Componentes UI base (Button, Card, Input, Modal)
│   │   ├── pages/                    # Paginas / vistas (30)
│   │   ├── context/                  # Contextos de React (Theme, Cart)
│   │   ├── hooks/                    # Hooks personalizados (useConnection)
│   │   ├── services/                 # Servicios API (api.js, authService.js)
│   │   ├── store/                    # Estado global (appStore.js)
│   │   ├── styles/                   # Hojas de estilo (CSS + SCSS)
│   │   ├── utils/                    # Utilidades
│   │   ├── constants.js              # Constantes globales
│   │   ├── App.jsx                   # Componente raiz con rutas
│   │   └── main.jsx                  # Punto de entrada
│   ├── index.html                    # HTML base
│   ├── vite.config.js                # Configuracion de Vite
│   ├── eslint.config.js              # Configuracion de ESLint
│   ├── package.json                  # Dependencias Node
│   └── Dockerfile                    # Imagen Docker del frontend
│
├── microservices/                    # Microservicios independientes
│   └── Tshirt3D/                     # Editor 3D (React + Three.js)
│       ├── src/                      # Codigo del editor 3D
│       ├── vite.config.js            # Configuracion de Vite
│       ├── tailwind.config.js        # Configuracion de Tailwind CSS
│       ├── package.json              # Dependencias
│       └── README.md                 # README del microservicio 3D
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
├── docker-compose.yml                # Orquestacion de contenedores
├── docker-compose.prod.yml           # Orquestacion de contenedores (produccion)
├── .env                              # Variables de entorno (root)
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore                        # Exclusiones de Git
└── README.md                         # README principal del proyecto
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
├── components/            # Componentes reutilizables
│   ├── Header.jsx        # Encabezado con navegacion y carrito
│   ├── AdminLayout.jsx   # Layout del panel admin con sidebar
│   ├── PublicLayout.jsx  # Layout para paginas publicas
│   ├── ProductCard.jsx   # Card de producto en catalogo
│   ├── ProductList.jsx   # Tabla de productos (admin)
│   ├── ProductForm.jsx   # Formulario de producto (admin)
│   ├── Product3DViewer.jsx # Visor 3D con React Three Fiber
│   ├── Breadcrumbs.jsx   # Migas de pan
│   ├── Button.jsx        # Boton reutilizable
│   ├── FormModal.jsx     # Modal generico para formularios
│   ├── InfoModal.jsx     # Modal informativo
│   ├── Pagination.jsx    # Paginacion
│   ├── Spinner.jsx       # Indicador de carga
│   ├── ErrorBoundary.jsx # Captura de errores de React
│   ├── ErrorState.jsx    # Estado de error
│   ├── ScrollToTop.jsx   # Scroll al inicio de pagina
│   ├── ProtectedRoute.jsx# Guard de rutas protegidas
│   ├── UserFilters.jsx   # Filtros de usuarios (admin)
│   ├── UserList.jsx      # Tabla de usuarios (admin)
│   ├── UserEditModal.jsx # Modal de edicion de usuario
│   ├── admin.css         # Estilos del panel admin
│   └── ui/               # Componentes UI base
│       ├── Button.jsx    # Boton UI base
│       ├── Card.jsx      # Tarjeta UI base
│       ├── Input.jsx     # Input UI base
│       ├── Modal.jsx     # Modal UI base
│       └── index.js      # Exportaciones
│
├── pages/                # Paginas de la aplicacion
│   ├── Landing.jsx       # Pagina de inicio
│   ├── AuthPage.jsx      # Login / Registro
│   ├── Catalog.jsx       # Catalogo de productos
│   ├── Category.jsx      # Productos por categoria
│   ├── ProductDetail.jsx # Detalle de producto
│   ├── Product3D.jsx     # Punto de entrada al editor 3D
│   ├── Cart.jsx          # Carrito de compras
│   ├── CheckoutPage.jsx  # Proceso de checkout
│   ├── OrderConfirmation.jsx # Confirmacion de orden
│   ├── Dashboard.jsx     # Panel de administracion
│   ├── UserProfile.jsx   # Perfil de usuario
│   ├── UserDesigns.jsx   # Disenos guardados del usuario
│   ├── Email.jsx         # Verificacion de email
│   ├── Password.jsx      # Recuperacion de contrasena
│   ├── NotFound.jsx      # Pagina 404
│   ├── UIShowcase.jsx    # Muestra de componentes UI
│   ├── AdminDashboard.jsx# Admin: dashboard
│   ├── AdminProducts.jsx # Admin: gestion de productos
│   ├── AdminProductDetail.jsx # Admin: detalle de producto
│   ├── AdminProductApproval.jsx # Admin: aprobacion de productos
│   ├── AdminUsers.jsx    # Admin: gestion de usuarios
│   ├── AdminCart.jsx     # Admin: carritos
│   ├── AdminCartDetail.jsx # Admin: detalle carrito
│   ├── AdminContact.jsx  # Admin: mensajes de contacto
│   ├── AdminAudit.jsx    # Admin: auditoria
│   ├── AdminCategories.jsx # Admin: categorias
│   ├── AdminDesigns.jsx  # Admin: disenos
│   ├── AdminImages.jsx   # Admin: imagenes
│   ├── AdminOrders.jsx   # Admin: ordenes
│   └── AdminOrderDetail.jsx # Admin: detalle de orden
│
├── context/              # Contextos de React
│   ├── ThemeContext.jsx  # Tema claro/oscuro
│   └── CartContext.jsx   # Estado global del carrito
│
├── hooks/                # Hooks personalizados
│   └── useConnection.js  # Estado de conexion
│
├── services/             # Servicios API
│   ├── api.js            # Cliente Axios con interceptors y refresh queue
│   └── authService.js    # Gestion de JWT y sesion
│
├── store/                # Estado global
│   └── appStore.js       # Estado global (sidebar, tema, toasts)
│
└── styles/               # Hojas de estilo
    ├── theme.css         # Variables CSS del sistema de diseno
    ├── globals.css       # Clases utilitarias
    ├── main-layout.css   # Layout del panel admin
    └── ...               # Estilos especificos por pagina
```
