# Estructura de Carpetas

## 18.1 Estructura General del Repositorio

```
proyecto_formativo/
├── backend/                          # API Django REST
│   ├── apps/                         # Aplicaciones del negocio
│   │   ├── users/                    # Gestion de usuarios y autenticacion
│   │   ├── products/                 # CRUD de productos e imagenes
│   │   ├── catalog/                  # Catalogo publico y busqueda
│   │   ├── carts/                    # Carrito de compras
│   │   ├── checkout/                 # Proceso de compra
│   │   ├── orders/                   # Ordenes y pedidos
│   │   ├── landing/                  # Landing page y contacto
│   │   └── models3d/                 # Modelos 3D
│   ├── config/                       # Configuracion de Django
│   │   ├── settings.py               # Configuracion general
│   │   ├── urls.py                   # Rutas principales
│   │   ├── wsgi.py                   # Entrypoint WSGI
│   │   └── asgi.py                   # Entrypoint ASGI
│   ├── media/                        # Archivos multimedia subidos
│   ├── static/                       # Archivos estaticos recolectados
│   ├── manage.py                     # CLI de Django
│   ├── requirements.txt              # Dependencias Python
│   ├── Dockerfile                    # Imagen Docker del backend
│   ├── entrypoint.sh                 # Script de inicio del contenedor
│   └── db.sqlite3                    # Base de datos SQLite (desarrollo)
│
├── frontend/                         # Aplicacion React (SPA)
│   ├── public/                       # Archivos publicos estaticos
│   ├── src/                          # Codigo fuente
│   │   ├── components/               # Componentes reutilizables (15)
│   │   ├── pages/                    # Paginas / vistas (22)
│   │   ├── context/                  # Contextos de React (Theme, Cart)
│   │   ├── services/                 # Servicios API (Axios)
│   │   ├── styles/                   # Hojas de estilo (CSS + SCSS)
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
│       └── package.json              # Dependencias
│
├── docs/                             # Documentacion del proyecto
│   ├── 01-introduccion/
│   ├── 02-alcance-y-metodologia/
│   ├── 03-requisitos/
│   ├── 04-diseno-uml/
│   ├── 05-arquitectura/
│   ├── 06-base-de-datos/
│   ├── 07-api/
│   ├── 08-instalacion-entorno-desarrollo/
│   └── README.md                     # Indice general
│
├── docker-compose.yml                # Orquestacion de contenedores
├── .env                              # Variables de entorno (root)
├── .env.example                      # Plantilla de variables de entorno
├── .gitignore                        # Exclusiones de Git
└── README.md                         # README principal del proyecto
```

## 18.2 Estructura Interna de una App Django

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

## 18.3 Estructura de Componentes Frontend

```
src/
├── components/            # Componentes reutilizables
│   ├── Header.jsx        # Encabezado con navegacion y carrito
│   ├── MainLayout.jsx    # Layout del panel admin con sidebar
│   ├── ProductCard.jsx   # Card de producto en catalogo
│   ├── ProductList.jsx   # Tabla de productos (admin)
│   ├── ProductForm.jsx   # Formulario de producto (admin)
│   ├── Button.jsx        # Boton reutilizable
│   ├── FormInput.jsx     # Input de formulario reutilizable
│   ├── FormModal.jsx     # Modal generico para formularios
│   ├── InfoModal.jsx     # Modal informativo
│   ├── UserFilters.jsx   # Filtros de usuarios (admin)
│   ├── UserList.jsx      # Tabla de usuarios (admin)
│   ├── UserEditModal.jsx # Modal de edicion de usuario
│   ├── ErrorBoundary.jsx # Captura de errores de React
│   ├── AdminLayout.jsx   # Layout admin alternativo
│   └── Layout.jsx        # Layout basico con Outlet
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
│   ├── Dashboard.jsx     # Panel de administracion
│   ├── UserProfile.jsx   # Perfil de usuario
│   ├── Email.jsx         # Verificacion de email
│   ├── Password.jsx      # Recuperacion de contrasena
│   ├── AdminProducts.jsx # Admin: gestion de productos
│   ├── AdminProductDetail.jsx # Admin: detalle de producto
│   ├── AdminUsers.jsx    # Admin: gestion de usuarios
│   ├── AdminCart.jsx     # Admin: carritos
│   ├── AdminCartDetail.jsx # Admin: detalle carrito
│   ├── AdminContact.jsx  # Admin: mensajes de contacto
│   └── AdminAudit.jsx    # Admin: auditoria
│
├── context/              # Contextos de React
│   ├── ThemeContext.jsx  # Tema claro/oscuro
│   └── CartContext.jsx   # Estado global del carrito
│
├── services/
│   └── api.js            # Cliente Axios con 3 instancias
│
└── styles/               # Hojas de estilo
    ├── theme.css         # Variables CSS del sistema de diseno
    ├── globals.css       # Clases utilitarias
    ├── main-layout.css   # Layout del panel admin
    └── ...               # Estilos especificos por pagina
```
