# DOCUMENTACION COMPLETA DEL PROYECTO RED
## Ropa con Estampados Digitales - Tienda Virtual con Personalizacion 3D

**Proyecto Formativo - Equipo RED**
**Fecha:** Septiembre 2026

---

## TABLA DE CONTENIDOS

1. [Vision General del Proyecto](#1-vision-general-del-proyecto)
2. [Arquitectura y Stack Tecnologico](#2-arquitectura-y-stack-tecnologico)
3. [Patrones de Diseno Utilizados](#3-patrones-de-diseno-utilizados)
4. [Requerimientos Funcionales (RF)](#4-requerimientos-funcionales-rf)
5. [Backend - Django REST API](#5-backend---django-rest-api)
6. [Frontend - React + Vite](#6-frontend---react--vite)
7. [Microservicio Tshirt3D - Three.js](#7-microservicio-tshirt3d---threejs)
8. [Funciones, Metodos, Clases y Variables](#8-funciones-metodos-clases-y-variables)
9. [Eventos, Promesas y Flujos Asincronos](#9-eventos-promesas-y-flujos-asincronos)
10. [Capas de Seguridad](#10-capas-de-seguridad)
11. [Validaciones](#11-validaciones)
12. [Infraestructura y Despliegue](#12-infraestructura-y-despliegue)
13. [Base de Datos](#13-base-de-datos)

---

## 1. VISION GENERAL DEL PROYECTO

### 1.1 Que es RED?

RED (Ropa con Estampados Digitales) es una **plataforma e-commerce completa** que permite a los usuarios personalizar camisetas en 3D con logotipos, textos y texturas, previsualizarlas en tiempo real en un visor tridimensional, y comprarlas directamente desde la plataforma.

### 1.2 Problema que Resuelve

Las tiendas de ropa tradicionales no ofrecen una experiencia de personalizacion inmersiva. El usuario no puede visualizar como quedaria un estampado antes de comprarlo. RED resuelve esto con un **editor 3D interactivo** integrado en la plataforma e-commerce.

### 1.3 Stack Tecnologico Completo

| Capa | Tecnologia | Version | Funcion |
|------|-----------|---------|---------|
| Backend API | Django + DRF | 5.2 / 3.16 | API RESTful, autenticacion, logica de negocio |
| Frontend | React + Vite | 19 / 8 | Interfaz de usuario, rutas, estado |
| Editor 3D | Three.js + React Three Fiber | 0.155 / 8.13 | Visualizacion 3D interactiva |
| Estado 3D | Valtio | 1.11 | Estado reactivo para el editor |
| Animaciones | Framer Motion | 10.16 | Transiciones y animaciones UI |
| SQL Database | PostgreSQL (prod) / SQLite (dev) | - | Datos persistentes relacionales |
| NoSQL Database | MongoDB | 7 | Logs, auditoria, sesiones |
| Imagenes | Cloudinary | SDK 1.44 | Almacenamiento y optimizacion de imagenes |
| Pagos | Wompi (Payments) | API | Pasarela de pagos colombiana |
| Email | Brevo (SMTP) | - | Notificaciones por correo |
| Contenedores | Docker + Docker Compose | - | Aislamiento y orquestacion |
| CI/CD | GitHub Actions | - | Integracion continua y despliegue |
| Seguridad CI | CodeQL + Trivy | - | Analisis estatico y escaneo de dependencias |
| Despliegue | Render / Vercel | - | Hosting cloud |

### 1.4 Estadisticas del Proyecto

- **8 aplicaciones Django:** users, products, catalog, carts, checkout, orders, landing, models3d
- **18 tablas de base de datos**
- **40+ endpoints REST**
- **22 paginas frontend**
- **15+ componentes reutilizables**
- **40+ archivos de documentacion**
- **58 requisitos funcionales (RF)**
- **26 requisitos no funcionales (RNF)**

---

## 2. ARQUITECTURA Y STACK TECNOLOGICO

### 2.1 Arquitectura de 3 Capas + Microservicio

```
┌─────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACION                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Frontend     │  │  Tshirt3D    │  │  Admin Panel      │  │
│  │  React+Vite   │  │  Microserv.  │  │  (dentro React)   │  │
│  │  Puerto 5173  │  │  Puerto 5174 │  │  Rutas /admin/*   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
│         │                 │                    │              │
│         └─────────────────┼────────────────────┘              │
│                           │                                   │
│                    ┌──────▼───────┐                          │
│                    │   API REST   │                          │
│                    │  /api/       │                          │
│                    └──────┬───────┘                          │
└───────────────────────────┼───────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────┐
│                    CAPA DE LOGICA DE NEGOCIO                   │
│                    ┌──────▼───────┐                           │
│                    │   Django     │                           │
│                    │   + DRF      │                           │
│                    │   8 Apps     │                           │
│                    └──────┬───────┘                           │
└───────────────────────────┼───────────────────────────────────┘
                            │
┌───────────────────────────┼───────────────────────────────────┐
│                    CAPA DE DATOS                               │
│         ┌─────────────────┼─────────────────┐                 │
│         │                 │                 │                  │
│   ┌─────▼─────┐   ┌──────▼──────┐  ┌──────▼──────┐         │
│   │ PostgreSQL │   │   MongoDB   │  │  Cloudinary │         │
│   │  (SQL)     │   │  (NoSQL)    │  │  (Media)    │         │
│   │  Usuarios  │   │  Auditoria  │  │  Imagenes   │         │
│   │  Productos │   │  Logs       │  │  3D Models  │         │
│   │  Pedidos   │   │  Sesiones   │  │             │         │
│   └───────────┘   └─────────────┘  └─────────────┘         │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Arquitectura de Microservicios

El proyecto opera con **3 servicios independientes** orquestados via Docker Compose:

| Servicio | Contenedor | Puerto | Tecnologia | Responsabilidad |
|----------|-----------|--------|-----------|-----------------|
| Backend | proyecto_backend | 8000 | Django + Gunicorn | API, logica de negocio, auth |
| Frontend | proyecto_frontend | 5173 | React + Vite | UI principal, rutas, estado |
| Tshirt3D | proyecto_tshirt3d | 5174 | React + Three.js | Editor 3D, canvas, captura |

**MongoDB** (contenedor `proyecto_mongo`, puerto 27017) funciona como base de datos complementaria para logs y auditoria.

---

## 3. PATRONES DE DISENO UTILIZADOS

### 3.1 MVC (Model-View-Controller)

**Ubicacion:** Backend Django

| Capa | Elementos | Archivos |
|------|-----------|----------|
| **Model** | Modelos Django (ORM) | `backend/users/models.py`, `backend/products/models.py`, `backend/catalog/models.py`, `backend/carts/models.py`, `backend/checkout/models.py`, `backend/orders/models.py`, `backend/landing/models.py`, `backend/models3d/models.py` |
| **View** | ViewSets DRF | `backend/users/views.py`, `backend/products/views.py`, `backend/catalog/views.py`, `backend/carts/views.py`, `backend/checkout/views.py`, `backend/orders/views.py`, `backend/landing/views.py`, `backend/models3d/views.py` |
| **Controller** | Serializers DRF | `backend/users/serializers.py`, `backend/products/serializers.py`, `backend/catalog/serializers.py`, `backend/carts/serializers.py`, `backend/checkout/serializers.py`, `backend/orders/serializers.py`, `backend/landing/serializers.py`, `backend/models3d/serializers.py` |

**Explicacion:** Cada app Django sigue el patron MVC donde los `models.py` definen la estructura de datos (M), los `views.py` manejan la logica de negocio y peticiones HTTP (C), y los `serializers.py` actuan como capa de transformacion y validacion entre modelo y respuesta JSON (V/API).

### 3.2 Component-Based Architecture (Frontend)

**Ubicacion:** Frontend React y Microservicio Tshirt3D

```
Componentes Atomicos:
├── Header.jsx          (navegacion)
├── CustomButton.jsx    (boton reutilizable)
├── Tab.jsx             (pestaña reutilizable)
├── ColorPicker.jsx     (selector de color)
├── FilePicker.jsx      (selector de archivo)
├── TextPicker.jsx      (selector de texto)
└── ErrorBoundary.jsx   (manejo de errores)

Componentes de Pagina:
├── Landing.jsx
├── AuthPage.jsx
├── Dashboard.jsx
├── ProductDetail.jsx
├── CheckoutPage.jsx
├── Customizer.jsx      (editor 3D principal)
└── Preview.jsx         (vista previa del pedido)
```

### 3.3 Repository Pattern (via DRF ViewSets)

**Ubicacion:** Backend `views.py` de cada app

Los ViewSets de Django REST Framework implementan implicitamente el patron Repository al encapsular las operaciones CRUD contra la base de datos:

```python
# Ejemplo: backend/products/views.py
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    # List, Create, Retrieve, Update, Destroy automaticos
```

### 3.4 Singleton Pattern (State Management)

**Ubicacion:** Microservicio Tshirt3D - `src/store/index.js`

El store de Valtio implementa un Singleton reactivo global:
```javascript
// src/store/index.js
import { proxy } from 'valtio';

const state = proxy({
    intro: true,
    color: '#353934',
    isLogoTexture: true,
    isFullTexture: false,
    logoDecal: './superman_logo1.png',
    fullDecal: './circuit.png',
    // ... todo el estado del editor
});

export default state;
```

**Explicacion:** Una unica instancia global de estado compartida entre todos los componentes del editor 3D. Mutaciones directas `state.color = '#ff0000'` provocan re-renders reactivos.

### 3.5 Observer Pattern (Valtio Proxy)

**Ubicacion:** Microservicio Tshirt3D

Valtio usa `proxy()` de JavaScript para crear objetos observables. Cualquier mutacion en `state` dispara actualizaciones automaticas en los componentes que lo consumen:

```javascript
// Componente que observa cambios
import { useSnapshot } from 'valtio';
import state from '../store';

function ColorPicker() {
    const snap = useSnapshot(state); // Observa cambios reactivamente
    return <div style={{ backgroundColor: snap.color }} />;
}
```

### 3.6 Strategy Pattern (Auth Flow)

**Ubicacion:** Backend `backend/users/views.py` y Frontend `frontend/src/services/authService.js`

La estrategia de autenticacion cambia segun el contexto:
- **Produccion:** JWT (SimpleJWT) con access/refresh tokens
- **Desarrollo:** Session cookies + CSRF tokens
- **OAuth:** Google, GitHub, Microsoft (Neon Auth)

### 3.7 Factory Pattern (Serializers)

**Ubicacion:** Backend `serializers.py`

Los serializers actuan como fabricas que transforman modelos Django en JSON y viceversa:
```python
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
    # Factory: crea instancias de Product desde datos JSON
```

### 3.8 Observer Pattern (Event-Driven en MongoDB)

**Ubicacion:** Backend `backend/*/signals.py` y `backend/*/models.py`

Django signals implementan patron Observer para auditoria:
```python
# Ejemplo: señal de auditoria
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def log_user_change(sender, instance, **kwargs):
    # Observer: ejecuta accion cuando ocurre un evento
    pass
```

### 3.9 Proxy Pattern (CORS + CSRF)

**Ubicacion:** Backend middleware

Django actua como proxy inverso en produccion, manejando CORS y CSRF como capas intermedias:
```
Request -> CORS Middleware -> CSRF Middleware -> View -> Response
```

### 3.10 Container Pattern (Docker)

**Ubicacion:** `docker-compose.yml` y `docker-compose.prod.yml`

Cada servicio esta empaquetado en un contenedor Docker con su propio entorno aislado:
```yaml
services:
  backend:    # Contenedor Django
  frontend:   # Contenedor React
  tshirt3d:   # Contenedor Editor 3D
  mongo:      # Contenedor MongoDB
```

### 3.11 Decorator Pattern (DRF)

**Ubicacion:** Backend `views.py`

DRF usa decoradores para增强 funcionalidad:
```python
@permission_classes([IsAuthenticated])
@action(detail=False, methods=['post'])
def custom_action(self, request):
    pass
```

### 3.12 Higher-Order Component Pattern (HOC)

**Ubicacion:** Frontend React

Los componentes de orden superior envuelven componentes para agregar funcionalidad:
```javascript
// ErrorBoundary envuelve componentes para manejar errores
<ErrorBoundary>
    <App />
</ErrorBoundary>
```

---

## 4. REQUERIMIENTOS FUNCIONALES (RF)

### 4.1 RF-001 a RF-010: Autenticacion y Usuarios

| RF | Descripcion | Ubicacion |
|----|-------------|-----------|
| RF-001 | Registro de usuario con email y password | `frontend/src/pages/AuthPage.jsx`, `backend/users/views.py` |
| RF-002 | Inicio de sesion con JWT | `frontend/src/services/authService.js`, `backend/users/views.py` |
| RF-003 | Cierre de sesion | `frontend/src/services/authService.js` |
| RF-004 | Recuperacion de password por email | `frontend/src/pages/Password.jsx`, `backend/users/views.py` |
| RF-005 | Perfil de usuario | `frontend/src/pages/UserProfile.jsx`, `backend/users/views.py` |
| RF-006 | Roles (Admin, Cliente) | `backend/users/models.py` (campo `rol`) |
| RF-007 | Autenticacion OAuth (Google, GitHub, Microsoft) | `backend/users/views.py`, Neon Auth |
| RF-008 | Gestion de usuarios (admin) | `frontend/src/pages/AdminUsers.jsx` |
| RF-009 | Sesiones de usuario | `backend/settings.py` (SESSION_BACKEND) |
| RF-010 | JWT access/refresh tokens | `backend/users/serializers.py` |

### 4.2 RF-011 a RF-020: Catalogo y Productos

| RF | Descripcion | Ubicacion |
|----|-------------|-----------|
| RF-011 | Listado de productos | `frontend/src/pages/Dashboard.jsx`, `backend/products/views.py` |
| RF-012 | Detalle de producto | `frontend/src/pages/ProductDetail.jsx` |
| RF-013 | Busqueda de productos | `frontend/src/constants.js` (search) |
| RF-014 | Filtrado por categorias | `frontend/src/utils/catalog.js` |
| RF-015 | Gestion de categorias (admin) | `frontend/src/pages/AdminCategories.jsx`, `backend/catalog/views.py` |
| RF-016 | CRUD de productos (admin) | `frontend/src/pages/AdminProducts.jsx`, `backend/products/views.py` |
| RF-017 | Imagenes de producto | `backend/products/models.py`, Cloudinary |
| RF-018 | Variantes de producto (talla, color) | `backend/products/models.py` |
| RF-019 | Precios y descuentos | `backend/products/models.py` |
| RF-020 | Catalogo publico | `frontend/src/pages/Dashboard.jsx` |

### 4.3 RF-021 a RF-030: Editor 3D y Personalizacion

| RF | Descripcion | Ubicacion |
|----|-------------|-----------|
| RF-021 | Editor 3D de camisetas | `microservices/Tshirt3D/src/pages/Customizer.jsx` |
| RF-022 | Cambio de color de camiseta | `microservices/Tshirt3D/src/components/ColorPicker.jsx` |
| RF-023 | Subir logo personalizado | `microservices/Tshirt3D/src/components/FilePicker.jsx` |
| RF-024 | Texto personalizado en 3D | `microservices/Tshirt3D/src/components/TextPicker.jsx` |
| RF-025 | Textura completa (full decal) | `microservices/Tshirt3D/src/canvas/Shirt.jsx` |
| RF-026 | Rotacion 360 grados | `microservices/Tshirt3D/src/canvas/CameraRig.jsx` |
| RF-027 | Captura dual (frente/atras) | `microservices/Tshirt3D/src/config/helpers.js` (captureShirtDualViews) |
| RF-028 | Persistencia en Cloudinary | `microservices/Tshirt3D/src/config/helpers.js` (uploadCanvasToCloudinary) |
| RF-029 | Modelo 3D GLB | `microservices/Tshirt3D/public/shirt_baked.glb` |
| RF-030 | Sesion de editor (backend) | `microservices/Tshirt3D/src/store/index.js` (loadEditorSession) |

### 4.4 RF-031 a RF-040: Carrito y Checkout

| RF | Descripcion | Ubicacion |
|----|-------------|-----------|
| RF-031 | Agregar al carrito | `frontend/src/utils/cartLimits.js`, `backend/carts/views.py` |
| RF-032 | Ver carrito | `frontend/src/pages/Cart.jsx` |
| RF-033 | Modificar cantidad | `backend/carts/views.py` |
| RF-034 | Eliminar del carrito | `backend/carts/views.py` |
| RF-035 | Limites de carrito | `frontend/src/utils/cartLimits.js` |
| RF-036 | Proceso de checkout | `frontend/src/pages/CheckoutPage.jsx`, `backend/checkout/views.py` |
| RF-037 | Formulario de envio | `frontend/src/pages/CheckoutPage.jsx` |
| RF-038 | Datos de Colombia | `frontend/src/data/colombiaData.js` |
| RF-039 | Seleccion de pago | `frontend/src/pages/CheckoutPage.jsx` |
| RF-040 | Resumen de pedido | `frontend/src/pages/OrderConfirmation.jsx` |

### 4.5 RF-041 a RF-050: Pagos y Pedidos

| RF | Descripcion | Ubicacion |
|----|-------------|-----------|
| RF-041 | Pago con Wompi | `frontend/src/pages/CheckoutPage.jsx`, `backend/checkout/views.py` |
| RF-042 | Webhooks de pago | `backend/checkout/views.py` |
| RF-043 | Estados de pedido | `backend/orders/models.py` |
| RF-044 | Historial de pedidos (usuario) | `frontend/src/pages/UserOrders.jsx` |
| RF-045 | Detalle de pedido | `frontend/src/pages/AdminOrderDetail.jsx` |
| RF-046 | Gestion de pedidos (admin) | `frontend/src/pages/AdminOrders.jsx` |
| RF-047 | Confirmacion por email | `backend/checkout/views.py`, Brevo SMTP |
| RF-048 | PDF de pedido | `backend/orders/views.py` (ReportLab) |
| RF-049 | Estadisticas admin | `frontend/src/pages/AdminDashboard.jsx` |
| RF-050 | Monitoreo de pagos | `backend/checkout/views.py` |

### 4.6 RF-051 a RF-058: Funcionalidades Adicionales

| RF | Descripcion | Ubicacion |
|----|-------------|-----------|
| RF-051 | Landing page | `frontend/src/pages/Landing.jsx` |
| RF-052 | Panel de administracion | `frontend/src/pages/Dashboard.jsx` (admin routes) |
| RF-053 | Gestion de imagenes (admin) | `frontend/src/pages/AdminImages.jsx` |
| RF-054 | Gestion de disenos (admin) | `frontend/src/pages/AdminDesigns.jsx` |
| RF-055 | Disenos del usuario | `frontend/src/pages/UserDesigns.jsx` |
| RF-056 | Pagina 404 | `frontend/src/pages/NotFound.jsx` |
| RF-057 | UI Showcase | `frontend/src/pages/UIShowcase.jsx` |
| RF-058 | Contacto | `frontend/src/pages/Email.jsx` |

---

## 5. BACKEND - DJANGO REST API

### 5.1 Estructura del Backend

```
backend/
├── config/                 # Configuracion del proyecto Django
│   ├── settings.py         # Configuracion principal
│   ├── urls.py             # URLs raiz
│   ├── wsgi.py             # WSGI para despliegue
│   └── asgi.py             # ASGI para async
├── users/                  # App de usuarios
│   ├── models.py           # Modelo User (rol, avatar, telefono)
│   ├── views.py            # UserViewSet, registro, login, OAuth
│   ├── serializers.py      # UserSerializer, LoginSerializer
│   ├── urls.py             # /api/users/
│   ├── signals.py          # Señales de auditoria
│   └── admin.py            # Registro en admin
├── products/               # App de productos
│   ├── models.py           # Product, ProductImage, Variant
│   ├── views.py            # ProductViewSet
│   ├── serializers.py      # ProductSerializer
│   └── urls.py             # /api/products/
├── catalog/                # App de categorias
│   ├── models.py           # Category
│   ├── views.py            # CategoryViewSet
│   └── urls.py             # /api/catalog/
├── carts/                  # App de carrito
│   ├── models.py           # Cart, CartItem
│   ├── views.py            # CartViewSet
│   └── urls.py             # /api/carts/
├── checkout/               # App de checkout
│   ├── models.py           # CheckoutSession
│   ├── views.py            # CheckoutViewSet, WompiWebhook
│   └── urls.py             # /api/checkout/
├── orders/                 # App de pedidos
│   ├── models.py           # Order, OrderItem
│   ├── views.py            # OrderViewSet, PDF generation
│   └── urls.py             # /api/orders/
├── landing/                # App de landing
│   ├── models.py           # Banner, Testimonial
│   ├── views.py            # LandingViewSet
│   └── urls.py             # /api/landing/
├── models3d/               # App de modelos 3D
│   ├── models.py           # Model3D, Design
│   ├── views.py            # Model3DViewSet
│   └── urls.py             # /api/models3d/
├── manage.py               # CLI de Django
└── requirements.txt        # Dependencias Python
```

### 5.2 Modelos de Base de Datos Principales

#### User (backend/users/models.py)
```python
class User(AbstractUser):
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default='Cliente')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    telefono = models.CharField(max_length=20, blank=True)
    direccion = models.TextField(blank=True)
    # Hereda: username, email, password, first_name, last_name, is_active, date_joined
```

#### Product (backend/products/models.py)
```python
class Product(models.Model):
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField()
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    imagen = models.ImageField(upload_to='products/')
    categoria = models.ForeignKey('catalog.Category', on_delete=models.CASCADE)
    stock = models.IntegerField(default=0)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
```

#### Cart / CartItem (backend/carts/models.py)
```python
class Cart(models.Model):
    usuario = models.OneToOneField(User, on_delete=models.CASCADE)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)

class CartItem(models.Model):
    carrito = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    producto = models.ForeignKey(Product, on_delete=models.CASCADE)
    cantidad = models.IntegerField(default=1)
    variante = models.JSONField(blank=True, null=True)
```

#### Order (backend/orders/models.py)
```python
class Order(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('pagado', 'Pagado'),
        ('enviado', 'Enviado'),
        ('entregado', 'Entregado'),
        ('cancelado', 'Cancelado'),
    ]
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    total = models.DecimalField(max_digits=10, decimal_places=2)
    direccion_envio = models.TextField()
    metodo_pago = models.CharField(max_length=50)
    referencia_pago = models.CharField(max_length=200, blank=True)
    notas = models.TextField(blank=True)
    fecha_pedido = models.DateTimeField(auto_now_add=True)
```

#### Model3D / Design (backend/models3d/models.py)
```python
class Model3D(models.Model):
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    imagen_front = models.URLField()  # URL de Cloudinary
    imagen_back = models.URLField()   # URL de Cloudinary
    color = models.CharField(max_length=7)
    texto_personalizado = models.CharField(max_length=40, blank=True)
    logo_textura = models.BooleanField(default=False)
    full_textura = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
```

### 5.3 Endpoints API Principales

| Modulo | Endpoint | Metodo | Descripcion |
|--------|----------|--------|-------------|
| **Auth** | `/api/users/register/` | POST | Registro de usuario |
| | `/api/users/login/` | POST | Inicio de sesion |
| | `/api/users/logout/` | POST | Cierre de sesion |
| | `/api/users/profile/` | GET/PUT | Perfil de usuario |
| | `/api/users/password-reset/` | POST | Recuperar password |
| **Products** | `/api/products/` | GET | Listar productos |
| | `/api/products/{id}/` | GET | Detalle de producto |
| | `/api/products/` | POST | Crear producto (admin) |
| | `/api/products/{id}/` | PUT | Actualizar producto (admin) |
| | `/api/products/{id}/` | DELETE | Eliminar producto (admin) |
| **Catalog** | `/api/catalog/categories/` | GET | Listar categorias |
| | `/api/catalog/categories/` | POST | Crear categoria (admin) |
| **Carts** | `/api/carts/` | GET | Ver carrito |
| | `/api/carts/add/` | POST | Agregar item |
| | `/api/carts/update/` | PUT | Actualizar cantidad |
| | `/api/carts/remove/` | DELETE | Eliminar item |
| **Checkout** | `/api/checkout/` | POST | Iniciar checkout |
| | `/api/checkout/webhook/` | POST | Webhook Wompi |
| **Orders** | `/api/orders/` | GET | Listar pedidos |
| | `/api/orders/{id}/` | GET | Detalle de pedido |
| | `/api/orders/{id}/pdf/` | GET | Descargar PDF |
| **Models3D** | `/api/models3d/models/` | GET/POST | Listar/crear modelos 3D |
| | `/api/models3d/models/{id}/` | GET | Detalle de modelo 3D |
| **Landing** | `/api/landing/banners/` | GET | Banners de landing |
| **Health** | `/api/health/` | GET | Health check |

### 5.4 Funciones y Metodos del Backend

#### Users (backend/users/views.py)

| Funcion/Metodo | Linea | Descripcion |
|----------------|-------|-------------|
| `UserViewSet.register()` | ~45 | Registra nuevo usuario, hashea password |
| `UserViewSet.login()` | ~80 | Autentica usuario, retorna JWT tokens |
| `UserViewSet.logout()` | ~120 | Invalida refresh token |
| `UserViewSet.profile()` | ~140 | Obtiene/actualiza perfil del usuario |
| `UserViewSet.password_reset()` | ~180 | Genera token y envia email de reset |
| `UserViewSet.google_auth()` | ~220 | Autenticacion OAuth con Google |
| `UserViewSet.github_auth()` | ~260 | Autenticacion OAuth con GitHub |

#### Products (backend/products/views.py)

| Funcion/Metodo | Linea | Descripcion |
|----------------|-------|-------------|
| `ProductViewSet.get_queryset()` | ~20 | Filtra productos activos |
| `ProductViewSet.list()` | ~30 | Lista productos con paginacion |
| `ProductViewSet.retrieve()` | ~40 | Detalle con imagenes y variantes |
| `ProductViewSet.create()` | ~50 | Crea producto (solo admin) |
| `ProductViewSet.update()` | ~60 | Actualiza producto (solo admin) |

#### Carts (backend/carts/views.py)

| Funcion/Metodo | Linea | Descripcion |
|----------------|-------|-------------|
| `CartViewSet.get_or_create_cart()` | ~20 | Obtiene o crea carrito del usuario |
| `CartViewSet.add_item()` | ~40 | Agrega producto al carrito |
| `CartViewSet.update_item()` | ~60 | Actualiza cantidad de item |
| `CartViewSet.remove_item()` | ~80 | Elimina item del carrito |
| `CartViewSet.clear_cart()` | ~100 | Vacia todo el carrito |

#### Checkout (backend/checkout/views.py)

| Funcion/Metodo | Linea | Descripcion |
|----------------|-------|-------------|
| `CheckoutViewSet.create()` | ~30 | Inicia proceso de checkout |
| `CheckoutViewSet.process_payment()` | ~60 | Procesa pago con Wompi |
| `CheckoutViewSet.webhook()` | ~100 | Recibe notificacion de Wompi |
| `CheckoutViewSet.verify_payment()` | ~140 | Verifica estado del pago |

#### Orders (backend/orders/views.py)

| Funcion/Metodo | Linea | Descripcion |
|----------------|-------|-------------|
| `OrderViewSet.list()` | ~20 | Lista pedidos del usuario |
| `OrderViewSet.retrieve()` | ~40 | Detalle de pedido |
| `OrderViewSet.generate_pdf()` | ~60 | Genera PDF con ReportLab |
| `OrderViewSet.update_status()` | ~80 | Cambia estado del pedido (admin) |

---

## 6. FRONTEND - REACT + VITE

### 6.1 Estructura del Frontend

```
frontend/src/
├── main.jsx                # Entry point React
├── App.jsx                 # Router principal + rutas
├── App.css                 # Estilos globales
├── index.css               # Estilos base
├── constants.js            # Constantes globales
├── store/
│   └── appStore.js         # Estado global (Context API)
├── pages/
│   ├── Landing.jsx         # Pagina de inicio
│   ├── AuthPage.jsx        # Login/Registro
│   ├── Password.jsx        # Recuperar password
│   ├── Dashboard.jsx       # Panel principal (admin/user)
│   ├── ProductDetail.jsx   # Detalle de producto
│   ├── Product3D.jsx       # Producto con editor 3D
│   ├── UserOrders.jsx      # Historial de pedidos
│   ├── UserDesigns.jsx     # Disenos del usuario
│   ├── UserProfile.jsx     # Perfil de usuario
│   ├── CheckoutPage.jsx    # Proceso de checkout
│   ├── OrderConfirmation.jsx # Confirmacion de pedido
│   ├── AdminOrders.jsx     # Gestion de pedidos (admin)
│   ├── AdminOrderDetail.jsx # Detalle pedido (admin)
│   ├── AdminUsers.jsx      # Gestion de usuarios (admin)
│   ├── AdminCategories.jsx # Gestion de categorias (admin)
│   ├── AdminImages.jsx     # Gestion de imagenes (admin)
│   ├── AdminDesigns.jsx    # Gestion de disenos (admin)
│   ├── Email.jsx           # Formulario de contacto
│   ├── UIShowcase.jsx      # Showcase de componentes
│   └── NotFound.jsx        # Pagina 404
├── components/             # Componentes reutilizables
│   ├── Header.jsx
│   ├── Footer.jsx
│   ├── ProductCard.jsx
│   ├── CartItem.jsx
│   ├── Modal.jsx
│   └── ...
├── services/
│   ├── api.js              # Configuracion de axios/fetch
│   └── authService.js      # Servicio de autenticacion
├── hooks/
│   ├── useConnection.js    # Hook de conexion
│   └── useMediaQuery.js    # Hook de responsive
├── utils/
│   ├── catalog.js          # Utilidades de catalogo
│   ├── cartLimits.js       # Limites de carrito
│   ├── editor3d.js         # Utilidades del editor 3D
│   ├── format.js           # Formateo de datos
│   ├── formatError.js      # Formateo de errores
│   ├── errorCatalog.js     # Catalogo de errores
│   └── logger.js           # Logger personalizado
├── data/
│   ├── colombiaData.js     # Datos geograficos de Colombia
│   └── products.js         # Datos estaticos de productos
└── styles/                 # Hojas de estilo CSS
    ├── globals.css
    ├── theme.css
    ├── header.css
    ├── components.css
    ├── Landing.css
    ├── Auth.css
    ├── AuthPage.css
    ├── Dashboard.css
    ├── Catalog.css
    ├── product-card.css
    ├── form-modal.css
    ├── admin.css
    ├── responsive.css
    └── ...
```

### 6.2 Enrutamiento (App.jsx)

```javascript
// frontend/src/App.jsx
<Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<AuthPage />} />
    <Route path="/registro" element={<AuthPage />} />
    <Route path="/password/:token" element={<Password />} />
    <Route path="/catalogo" element={<Dashboard />} />
    <Route path="/producto/:id" element={<ProductDetail />} />
    <Route path="/producto-3d/:id" element={<Product3D />} />
    <Route path="/carrito" element={<Cart />} />
    <Route path="/checkout" element={<CheckoutPage />} />
    <Route path="/checkout/resultado" element={<OrderConfirmation />} />
    <Route path="/mis-pedidos" element={<UserOrders />} />
    <Route path="/mis-disenos" element={<UserDesigns />} />
    <Route path="/perfil" element={<UserProfile />} />
    <Route path="/contacto" element={<Email />} />
    <Route path="/admin" element={<Dashboard />} />
    <Route path="/admin/pedidos" element={<AdminOrders />} />
    <Route path="/admin/pedidos/:id" element={<AdminOrderDetail />} />
    <Route path="/admin/usuarios" element={<AdminUsers />} />
    <Route path="/admin/categorias" element={<AdminCategories />} />
    <Route path="/admin/imagenes" element={<AdminImages />} />
    <Route path="/admin/disenos" element={<AdminDesigns />} />
    <Route path="/ui-showcase" element={<UIShowcase />} />
    <Route path="*" element={<NotFound />} />
</Routes>
```

### 6.3 Estado Global (appStore.js)

**Patron:** Context API + useReducer

```javascript
// frontend/src/store/appStore.js
const AppContext = createContext();

export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(appReducer, initialState);
    // Estado incluye: user, cart, token, isLoading, error
    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}
```

### 6.4 Servicio de Autenticacion (authService.js)

```javascript
// frontend/src/services/authService.js
const authService = {
    login: async (email, password) => {
        const response = await api.post('/users/login/', { email, password });
        localStorage.setItem('token', response.data.access);
        return response.data;
    },
    register: async (userData) => {
        return await api.post('/users/register/', userData);
    },
    logout: async () => {
        localStorage.removeItem('token');
        return await api.post('/users/logout/');
    },
    getProfile: async () => {
        return await api.get('/users/profile/');
    },
    resetPassword: async (email) => {
        return await api.post('/users/password-reset/', { email });
    }
};
```

### 6.5 Hooks Personalizados

#### useConnection.js
```javascript
// frontend/src/hooks/useConnection.js
// Verifica el estado de conexion con el backend
// Retorna: { isConnected, checkConnection }
```

#### useMediaQuery.js
```javascript
// frontend/src/hooks/useMediaQuery.js
// Detecta断点 responsive
// Retorna: { isMobile, isTablet, isDesktop }
```

### 6.6 Utilidades

#### cartLimits.js
```javascript
// frontend/src/utils/cartLimits.js
// Funciones para limitar-items en carrito:
// - MAX_ITEMS_PER_PRODUCT: Limite por producto
// - MAX_TOTAL_ITEMS: Limite total en carrito
// - validateCartLimits(): Valida contra limites
// - getCartSummary(): Resumen del carrito
```

#### editor3d.js
```javascript
// frontend/src/utils/editor3d.js
// Utilidades para integracion con el editor 3D:
// - openEditor(productId, variantId): Abre editor en iframe
// - captureDesign(): Captura diseno del canvas
// - sendToBackend(): Envia diseno al backend
```

#### errorCatalog.js
```javascript
// frontend/src/utils/errorCatalog.js
// Catalogo centralizado de errores:
// - AUTH_ERRORS: Errores de autenticacion
// - CART_ERRORS: Errores de carrito
// - PAYMENT_ERRORS: Errores de pago
// - GENERIC_ERRORS: Errores generales
// - getErrorMessage(code): Retorna mensaje legible
```

#### format.js
```javascript
// frontend/src/utils/format.js
// Funciones de formateo:
// - formatCurrency(value): Formatea a COP ($ 1.000.000)
// - formatDate(date): Formatea fecha
// - formatPhone(phone): Formatea telefono colombiano
```

#### logger.js
```javascript
// frontend/src/utils/logger.js
// Logger personalizado para debugging:
// - logger.info(message)
// - logger.warn(message)
// - logger.error(message)
// - logger.debug(message)
// Solo activen en modo DEBUG
```

---

## 7. MICROSERVICIO TSHIRT3D - THREE.JS

### 7.1 Estructura del Microservicio

```
microservices/Tshirt3D/
├── index.html              # Shell HTML
├── package.json            # Dependencias
├── vite.config.js          # Config Vite (puerto 5174)
├── tailwind.config.js      # Config Tailwind
├── src/
│   ├── main.jsx            # Entry React
│   ├── App.jsx             # Componente raiz
│   ├── index.css           # Estilos
│   ├── store/
│   │   └── index.js        # Estado Valtio (Singleton)
│   ├── pages/
│   │   ├── Customizer.jsx  # Editor 3D principal
│   │   └── Preview.jsx     # Vista previa de pedido
│   ├── canvas/
│   │   ├── index.jsx       # Setup Canvas Three.js
│   │   ├── Shirt.jsx       # Modelo 3D de camiseta
│   │   ├── CameraRig.jsx   # Control de camara
│   │   └── Backdrop.jsx    # Fondo iluminacion
│   ├── components/
│   │   ├── Header.jsx      # Navegacion
│   │   ├── ColorPicker.jsx # Selector de color
│   │   ├── FilePicker.jsx  # Selector de archivo
│   │   ├── TextPicker.jsx  # Selector de texto
│   │   ├── CustomButton.jsx # Boton personalizado
│   │   ├── Tab.jsx         # Pestaña reutilizable
│   │   └── ErrorBoundary.jsx # Manejo de errores
│   ├── config/
│   │   ├── helpers.js      # Funciones API/utilidades
│   │   ├── constants.js    # Constantes del editor
│   │   └── motion.js       # Animaciones Framer Motion
│   └── assets/             # Iconos e imagenes
└── public/
    └── shirt_baked.glb     # Modelo 3D GLB
```

### 7.2 Store de Estado (Valtio)

**Archivo:** `microservices/Tshirt3D/src/store/index.js`

```javascript
import { proxy } from 'valtio';

const state = proxy({
    // ====== ESTADO DE UI ======
    intro: true,                    // Muestra intro screen
    captureTransparent: false,      // Captura con fondo transparente

    // ====== COLOR DE CAMISETA ======
    color: '#353934',               // Color hex de la camiseta

    // ====== TEXTURAS/DECALS ======
    isLogoTexture: true,            // Activa logo decal
    isFullTexture: false,           // Activa textura completa
    logoDecal: './superman_logo1.png', // URL del logo
    fullDecal: './circuit.png',     // URL de textura completa

    // ====== POSICION Y ESCALA DEL LOGO ======
    logoPosition: [0, 0.04, 0.15],  // Vector 3D [x, y, z]
    logoScale: 0.15,                // Escala del logo

    // ====== ROTACION DE CAMISETA ======
    shirtRotationY: 0,              // Rotacion actual (radianes)
    targetRotationY: 0,             // Rotacion objetivo
    autoRotate: false,              // Auto-rotacion activada
    isCapturing: false,             // Modo captura (pausa rotacion)

    // ====== TEXTO PERSONALIZADO ======
    isTextTexture: false,           // Activa texto en 3D
    customText: '',                 // Texto del usuario (max 40)
    textColor: '#ffffff',           // Color del texto
    textFont: 'Impact',             // Fuente seleccionada
    textScale: 1,                   // Escala del texto
    textPosition: [0, 0.08, 0.2],   // Posicion del texto

    // ====== CONTEXTO DEL EDITOR ======
    mode: null,                     // Modo desde URL param
    colorName: '',                  // Nombre del color
    size: '',                       // Talla seleccionada
    productId: null,                // ID del producto
    productName: '',                // Nombre del producto
    variantId: null,                // ID de la variante
    quantity: 1,                    // Cantidad

    // ====== ESTADO DE SESION ======
    sessionLoaded: false,           // Sesion cargada desde backend
    sessionError: null              // Error de carga de sesion
});

// ====== FUNCION: Cargar sesion desde backend ======
export async function loadEditorSession() {
    try {
        const response = await fetch('/editor-session/', {
            credentials: 'include'  // Incluye cookies de sesion
        });
        if (!response.ok) throw new Error('Sesion no valida');

        const session = await response.json();

        // Valida y asigna datos del servidor (NUNCA de URL)
        state.productId = session.product_id;
        state.productName = session.product_name;
        state.variantId = session.variant_id;
        state.color = session.color || '#353934';
        state.size = session.size || '';
        state.quantity = session.quantity || 1;
        state.sessionLoaded = true;
    } catch (error) {
        state.sessionError = error.message;
    }
}

export default state;
```

**Explicacion:** Este es el corazon del editor 3D. Valtio crea un proxy reactivo que, al ser mutado (`state.color = '#ff0000'`), actualiza automaticamente todos los componentes que lo consumen via `useSnapshot()`. La funcion `loadEditorSession()` implementa el patron **Load Session** para obtener datos del producto desde el backend, nunca confiando en parametros de URL por seguridad.

### 7.3 Canvas Three.js

#### index.jsx - Setup del Canvas
```javascript
// microservices/Tshirt3D/src/canvas/index.jsx
// Configuracion del Canvas de React Three Fiber:
// - preserveDrawingBuffer: true (necesario para captura PNG)
// - alpha: true (fondo transparente)
// - Camera: position [0,0,2], fov=25
// - Luces: ambientLight + Environment preset="city"
// - Componentes: CameraRig > Backdrop > Center > Shirt
// - WebGLErrorBoundary: Captura errores de WebGL
```

#### Shirt.jsx - Modelo 3D
```javascript
// microservices/Tshirt3D/src/canvas/Shirt.jsx
// Modelo GLB de camiseta con 3 decal layers:
// 1. Full Texture (linea 102-109): Textura completa sobre toda la camiseta
// 2. Logo Decal (linea 112-122): Logo posicionado en el pecho
// 3. Text Decal (linea 125-135): Texto personalizado

// Funcion createTextTexture():
// - Crea CanvasTexture de 1024x512
// - Renderiza texto con fuente bold 64px
// - Agrega sombra para legibilidad
// - Retorna CanvasTexture para Three.js

// Eventos de Pointer:
// - onPointerMove: Actualiza posicion del logo/texto en tiempo real
// - onPointerUp: Fija posicion final

// Animacion de color:
// - useFrame + easing.dampC: Transicion suave entre colores
```

#### CameraRig.jsx - Control de Camara
```javascript
// microservices/Tshirt3D/src/canvas/CameraRig.jsx
// Responsive camera positioning:
// - Desktop (>=1260px): target [0,0,2]
// - Tablet (>=600px): target [0,0,2]
// - Mobile (<600px): target [0,0,2.5]
//
// Auto-rotate: delta * 0.8 rad/s
// Manual rotation: smooth easing con damping
// Mouse orbital: pointer.y/7, pointer.x/-2
// Freeze during capture mode
```

#### Backdrop.jsx - Fondo
```javascript
// microservices/Tshirt3D/src/canvas/Backdrop.jsx
// AccumulativeShadows:
// - Temporal: true (acumula frames)
// - Frames: 30
// - Alpha: 0.25
// - Opacity: 0.5
// - Scale: 6
//
// Dos RandomizedLight sources:
// - Luz principal: intensity 0.28, position [5,5,10]
// - Luz secundaria: intensity 0.18, position [-5,5,10]
```

### 7.4 Funciones API (helpers.js)

**Archivo:** `microservices/Tshirt3D/src/config/helpers.js`

| Funcion | Linea | Descripcion |
|---------|-------|-------------|
| `downloadCanvasToImage()` | 33-50 | Descarga el canvas como imagen PNG |
| `captureShirtDualViews()` | 63-89 | **Captura dual**: Captura frente (0 rad) y atras (PI rad) como blobs separados |
| `uploadCanvasToCloudinary()` | 91-142 | Sube ambas imagenes (frente+atras) a Cloudinary via FormData |
| `sendCanvasToApi()` | 144-184 | POST a `/api/orders/` con imagen, color, texturas, notas |
| `createModel3D()` | 186-202 | POST a `/api/models3d/models/` con credenciales de sesion |
| `addDesignToCart()` | 204-239 | POST a `/api/editor-session/commit/` con token CSRF |
| `reader()` | 241-247 | Wrapper de FileReader como Promise |
| `getContrastingColor()` | 249-256 | Selecciona negro/blanco basado en luminancia W3C |

### 7.5 Constantes del Editor (constants.js)

```javascript
// microservices/Tshirt3D/src/config/constants.js
export const EditorTabs = [
    { name: 'colorpicker', icon: swatch },    // Selector de color
    { name: 'filepicker', icon: file },       // Selector de archivo
    { name: 'textpicker', icon: textIcon }    // Selector de texto
];

export const FilterTabs = [
    { name: 'logoShirt', icon: logoTshirt },  // Modo logo
    { name: 'textShirt', icon: textIcon },    // Modo texto
    { name: 'stylishShirt', icon: stylish }   // Modo textura completa
];

export const DecalTypes = {
    logo: {
        stateProperty: 'logoDecal',           // Propiedad en el state
        filterTab: 'logoShirt'                // Tab de filtro
    },
    full: {
        stateProperty: 'fullDecal',           // Propiedad en el state
        filterTab: 'stylishShirt'             // Tab de filtro
    }
};
```

### 7.6 Animaciones (motion.js)

```javascript
// microservices/Tshirt3D/src/config/motion.js
// Framer Motion animation presets:

export const slideAnimation = (direction) => ({
    initial: { x: direction === 'left' ? -100 : 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: direction === 'left' ? 100 : -100, opacity: 0 },
    transition: { type: 'spring', damping: 25, stiffness: 200 }
});

export const fadeAnimation = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
};

export const headTextAnimation = {
    initial: { x: 100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { type: 'spring', damping: 5, stiffness: 40 }
};

export const headContentAnimation = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { type: 'spring', damping: 7, stiffness: 30 }
};

export const headContainerAnimation = {
    initial: { x: -100, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: { type: 'spring', damping: 20, stiffness: 100 }
};
```

---

## 8. FUNCIONES, METODOS, CLASES Y VARIABLES

### 8.1 Clases Principales

#### Backend (Django)

| Clase | Archivo | Linea | Descripcion |
|-------|---------|-------|-------------|
| `User` | `backend/users/models.py` | ~10 | Modelo de usuario extendido |
| `Product` | `backend/products/models.py` | ~10 | Modelo de producto |
| `ProductImage` | `backend/products/models.py` | ~30 | Imagenes de producto |
| `Category` | `backend/catalog/models.py` | ~10 | Categoria de producto |
| `Cart` | `backend/carts/models.py` | ~10 | Carrito de compras |
| `CartItem` | `backend/carts/models.py` | ~25 | Item del carrito |
| `Order` | `backend/orders/models.py` | ~10 | Pedido |
| `OrderItem` | `backend/orders/models.py` | ~35 | Item del pedido |
| `Model3D` | `backend/models3d/models.py` | ~10 | Modelo 3D generado |
| `Design` | `backend/models3d/models.py` | ~30 | Diseno guardado |
| `UserViewSet` | `backend/users/views.py` | ~15 | ViewSet de usuarios |
| `ProductViewSet` | `backend/products/views.py` | ~15 | ViewSet de productos |
| `CartViewSet` | `backend/carts/views.py` | ~15 | ViewSet del carrito |
| `OrderViewSet` | `backend/orders/views.py` | ~15 | ViewSet de pedidos |
| `CheckoutViewSet` | `backend/checkout/views.py` | ~15 | ViewSet de checkout |

#### Frontend (React)

| Clase/Componente | Archivo | Linea | Descripcion |
|------------------|---------|-------|-------------|
| `ErrorBoundary` | `microservices/Tshirt3D/src/components/ErrorBoundary.jsx` | ~10 | Clase React para capturar errores de render |
| `WebGLErrorBoundary` | `microservices/Tshirt3D/src/canvas/index.jsx` | ~11 | Clase para errores de WebGL |

### 8.2 Funciones Principales del Backend

#### Autenticacion

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `get_tokens_for_user(user)` | `backend/users/serializers.py` | Genera JWT access + refresh tokens |
| `create_user_session(user, request)` | `backend/users/views.py` | Crea sesion de usuario en el servidor |
| `send_password_reset_email(user, token)` | `backend/users/views.py` | Envia email con token de reset |
| `validate_google_token(token)` | `backend/users/views.py` | Valida token de Google OAuth |
| `validate_github_token(token)` | `backend/users/views.py` | Valida token de GitHub OAuth |

#### Productos

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `filter_products(queryset, category, search)` | `backend/products/views.py` | Filtra productos por categoria y busqueda |
| `calculate_discount(price, discount)` | `backend/products/models.py` | Calcula precio con descuento |
| `get_product_variants(product)` | `backend/products/views.py` | Obtiene variantes de un producto |

#### Carrito

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `get_or_create_cart(user)` | `backend/carts/views.py` | Obtiene carrito existente o crea uno nuevo |
| `validate_cart_item(cart, product, quantity)` | `backend/carts/views.py` | Valida que el item sea valido |
| `calculate_cart_total(cart)` | `backend/carts/views.py` | Calcula total del carrito |
| `clear_expired_carts()` | `backend/carts/models.py` | Limpia carritos abandonados |

#### Checkout y Pagos

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `process_wompi_payment(order, payment_data)` | `backend/checkout/views.py` | Procesa pago con Wompi API |
| `verify_wompi_transaction(transaction_id)` | `backend/checkout/views.py` | Verifica estado de transaccion |
| `handle_webhook_payload(payload)` | `backend/checkout/views.py` | Procesa payload del webhook |
| `send_confirmation_email(order)` | `backend/checkout/views.py` | Envia email de confirmacion |
| `generate_order_pdf(order)` | `backend/orders/views.py` | Genera PDF del pedido con ReportLab |

#### Modelos 3D

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `save_model3d(usuario, imagenes, metadata)` | `backend/models3d/views.py` | Guarda modelo 3D en BD |
| `get_user_designs(user)` | `backend/models3d/views.py` | Obtiene disenos del usuario |
| `delete_model3d(model_id, user)` | `backend/models3d/views.py` | Elimina modelo 3D |

### 8.3 Funciones Principales del Frontend

#### Servicios

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `api.get(url)` | `frontend/src/services/api.js` | Peticion GET con token |
| `api.post(url, data)` | `frontend/src/services/api.js` | Peticion POST con token |
| `api.put(url, data)` | `frontend/src/services/api.js` | Peticion PUT con token |
| `api.delete(url)` | `frontend/src/services/api.js` | Peticion DELETE con token |
| `authService.login(email, pass)` | `frontend/src/services/authService.js` | Login y guardado de token |
| `authService.register(data)` | `frontend/src/services/authService.js` | Registro de usuario |
| `authService.logout()` | `frontend/src/services/authService.js` | Cierre de sesion |
| `authService.getProfile()` | `frontend/src/services/authService.js` | Obtiene perfil |

#### Utilidades

| Funcion | Archivo | Descripcion |
|---------|---------|-------------|
| `formatCurrency(value)` | `frontend/src/utils/format.js` | Formatea a pesos colombianos |
| `formatDate(date)` | `frontend/src/utils/format.js` | Formatea fecha local |
| `formatPhone(phone)` | `frontend/src/utils/format.js` | Formatea telefono |
| `getErrorMessage(code)` | `frontend/src/utils/errorCatalog.js` | Obtiene mensaje de error |
| `validateCartLimits(cart)` | `frontend/src/utils/cartLimits.js` | Valida limites del carrito |
| `openEditor3D(productId)` | `frontend/src/utils/editor3d.js` | Abre editor en ventana/modal |
| `logger.info(msg)` | `frontend/src/utils/logger.js` | Log informativo |
| `logger.error(msg)` | `frontend/src/utils/logger.js` | Log de error |

#### Hooks

| Hook | Archivo | Descripcion |
|------|---------|-------------|
| `useConnection()` | `frontend/src/hooks/useConnection.js` | Verifica conexion con backend |
| `useMediaQuery(query)` | `frontend/src/hooks/useMediaQuery.js` | Detecta断点 responsive |
| `useApp()` | `frontend/src/store/appStore.js` | Accede al estado global |

### 8.4 Variables Globales Importantes

#### Backend (settings.py)

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `SECRET_KEY` | Configurada via .env | Clave secreta de Django |
| `DEBUG` | True/False | Modo debug |
| `DATABASE_URL` | postgres://... o vacia | URL de PostgreSQL (vacia = SQLite) |
| `USE_MONGODB` | True | Habilita MongoDB para logs |
| `MONGODB_URI` | mongodb://... | URI de conexion MongoDB |
| `CORS_ALLOWED_ORIGINS` | http://localhost:5173,... | Origenes permitidos CORS |
| `CSRF_TRUSTED_ORIGINS` | http://localhost:5173,... | Origenes de confianza CSRF |
| `SESSION_BACKEND` | cached_db | Backend de sesiones Django |
| `CLOUDINARY_*` | Configuradas via .env | Credenciales Cloudinary |
| `WOMPI_*` | Configuradas via .env | Credenciales Wompi |
| `EMAIL_BACKEND` | console/smtp | Backend de email |

#### Frontend (Vite env)

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `VITE_API_URL` | http://localhost:8000/api/ | URL base del backend |
| `VITE_MEDIA_URL` | http://localhost:8000/media/ | URL de archivos media |
| `VITE_EDITOR_3D_URL` | http://localhost:5174 | URL del editor 3D |
| `VITE_TSHIRT3D_URL` | http://localhost:5174/ | URL del microservicio |
| `VITE_CLOUDINARY_CLOUD_NAME` | - | Nombre de cloud Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | - | Preset de subida |
| `VITE_WOMPI_PUBLIC_KEY` | - | Clave publica Wompi |

#### Microservicio Tshirt3D (Vite env)

| Variable | Valor | Descripcion |
|----------|-------|-------------|
| `VITE_API_URL` | http://127.0.0.1:8000/api/ | URL del backend |
| `VITE_CLOUDINARY_CLOUD_NAME` | - | Cloud Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | - | Preset de subida |
| `VITE_FRONTEND_URL` | http://localhost:5173 | URL del frontend |

---

## 9. EVENTOS, PROMESAS Y FLUJOS ASINCRONOS

### 9.1 Eventos del Frontend

#### React Events

| Evento | Componente | Descripcion |
|--------|-----------|-------------|
| `onClick` | `CustomButton.jsx` | Click en boton personalizado |
| `onChange` | `ColorPicker.jsx` | Cambio de color |
| `onChange` | `FilePicker.jsx` | Seleccion de archivo |
| `onChange` | `TextPicker.jsx` | Cambio de texto |
| `onSubmit` | `AuthPage.jsx` | Envio de formulario login/registro |
| `onSubmit` | `CheckoutPage.jsx` | Envio de formulario de envio |
| `onSubmit` | `Email.jsx` | Envio de formulario de contacto |
| `onPointerMove` | `Shirt.jsx` | Movimiento del mouse sobre camiseta 3D |
| `onPointerUp` | `Shirt.jsx` | Soltar mouse sobre camiseta 3D |
| `onBeforeUnload` | `Customizer.jsx` | Alerta al salir con cambios sin guardar |

#### DOM Events

| Evento | Componente | Descripcion |
|--------|-----------|-------------|
| `keydown` | `Customizer.jsx` | Teclas de atajos del editor |
| `resize` | `CameraRig.jsx` | Cambio de tamano de ventana |
| `scroll` | `Landing.jsx` | Scroll para animaciones de entrada |

### 9.2 Promesas y Async/Await

#### Frontend - Promesas Encadenadas

```javascript
// microservices/Tshirt3D/src/pages/Customizer.jsx
// Flujo de guardado (Promise Chain):
const handleSave = async () => {
    try {
        setIsSaving(true);
        // Paso 1: Capturar dual views
        const { frontBlob, backBlob } = await captureShirtDualViews();

        // Paso 2: Subir a Cloudinary
        const { frontUrl, backUrl } = await uploadCanvasToCloudinary(frontBlob, backBlob);

        // Paso 3: Crear modelo 3D en backend
        await createModel3D(frontUrl, backUrl);

        // Paso 4: Agregar al carrito
        await addDesignToCart(frontUrl, backUrl);

        setShowResult(true);
    } catch (error) {
        setError(error.message);
    } finally {
        setIsSaving(false);
    }
};
```

```javascript
// microservices/Tshirt3D/src/config/helpers.js
// captureShirtDualViews() - Promesa de captura dual:
export const captureShirtDualViews = () => {
    return new Promise((resolve, reject) => {
        // Captura frente (0 radianes)
        const frontCanvas = document.querySelector('canvas');
        frontCanvas.toBlob((frontBlob) => {
            // Captura atras (PI radianes)
            state.shirtRotationY = Math.PI;
            setTimeout(() => {
                const backCanvas = document.querySelector('canvas');
                backCanvas.toBlob((backBlob) => {
                    resolve({ frontBlob, backBlob });
                });
            }, 1000); // Espera 1s para que la rotacion se complete
        }, 'image/png');
    });
};
```

#### Backend - Señales Django (Event-Driven)

```python
# Backend Django signals (event-driven):
# post_save: Se ejecuta DESPUES de guardar un modelo
# pre_save: Se ejecuta ANTES de guardar un modelo
# post_delete: Se ejecuta DESPUES de eliminar un modelo

# Ejemplo: Auditoria automatica
@receiver(post_save, sender=Order)
def log_order_created(sender, instance, created, **kwargs):
    if created:
        # Evento: Nuevo pedido creado
        # Accion: Registrar en MongoDB
        mongo_db.audit_log.insert_one({
            'event': 'order_created',
            'order_id': instance.id,
            'user_id': instance.usuario_id,
            'timestamp': datetime.now()
        })
```

### 9.3 Flujo de Autenticacion Completo

```
1. Usuario envia formulario (email + password)
   │
   ▼
2. Frontend: authService.login(email, password)
   │
   ▼
3. POST /api/users/login/ → Backend
   │
   ▼
4. Backend valida credenciales
   ├── Si son correctas:
   │   ├── Genera JWT access token (5 min)
   │   ├── Genera JWT refresh token (24h)
   │   ├── Guarda sesion en cache (Redis/cached_db)
   │   └── Retorna { access, refresh, user }
   │
   └── Si son incorrectas:
       └── Retorna 401 Unauthorized
   │
   ▼
5. Frontend guarda tokens
   ├── localStorage.setItem('token', access)
   └── localStorage.setItem('refreshToken', refresh)
   │
   ▼
6. Peticiones futuras incluyen header:
   Authorization: Bearer <access_token>
```

### 9.4 Flujo de Pago con Wompi

```
1. Usuario completa checkout
   │
   ▼
2. POST /api/checkout/ → Backend crea Order (estado: pendiente)
   │
   ▼
3. Backend genera "firma de integridad" (HMAC SHA256)
   │
   ▼
4. Frontend redirige a Wompi con datos:
   - public_key
   - amount_in_cents
   - currency: COP
   - reference_code
   - signature integrity
   │
   ▼
5. Wompi procesa pago (tarjeta/PSE/nequi)
   │
   ▼
6. Wompi envia webhook a POST /api/checkout/webhook/
   │
   ▼
7. Backend verifica firma del webhook
   ├── Firma valida:
   │   ├── Actualiza Order.estado = 'pagado'
   │   ├── Envia email de confirmacion
   │   └── Genera PDF del pedido
   │
   └── Firma invalida:
       └── Rechaza webhook (seguridad)
   │
   ▼
8. Frontend muestra OrderConfirmation.jsx
```

### 9.5 Flujo del Editor 3D

```
1. Usuario hace clic en "Personalizar en 3D"
   │
   ▼
2. Frontend abre Tshirt3D en nueva ventana/modal
   │
   ▼
3. Tshirt3D ejecuta loadEditorSession()
   │
   ▼
4. GET /editor-session/ → Backend retorna datos del producto
   │
   ▼
5. Store se inicializa con datos del servidor
   │
   ▼
6. Usuario personaliza:
   - Cambia color (state.color = '#ff0000')
   - Sube logo (state.logoDecal = URL)
   - Agrega texto (state.customText = 'Mi texto')
   │
   ▼
7. Usuario hace clic en "Guardar"
   │
   ▼
8. captureShirtDualViews() → Captura frente + atras
   │
   ▼
9. uploadCanvasToCloudinary() → Sube 2 imagenes
   │
   ▼
10. createModel3D() → POST /api/models3d/models/
    │
    ▼
11. addDesignToCart() → POST /api/editor-session/commit/
    │
    ▼
12. Diseno guardado en BD + imagenes en Cloudinary
```

---

## 10. CAPAS DE SEGURIDAD

### 10.1 Autenticacion y Autorizacion

| Capa | Implementacion | Ubicacion |
|------|---------------|-----------|
| **JWT Authentication** | SimpleJWT con access (5min) + refresh (24h) tokens | `backend/users/serializers.py` |
| **Password Hashing** | PBKDF2 (Django default) | `backend/users/models.py` |
| **Role-Based Access** | Roles: Admin, Cliente | `backend/users/models.py` (campo `rol`) |
| **Session Management** | `cached_db` backend (Redis + DB) | `backend/settings.py` (SESSION_BACKEND) |
| **OAuth** | Google, GitHub, Microsoft via Neon Auth | `backend/users/views.py` |
| **Token Refresh** | Auto-refresh antes de expirar | `frontend/src/services/authService.js` |

### 10.2 Proteccion de Datos en Transito

| Capa | Implementacion | Ubicacion |
|------|---------------|-----------|
| **HTTPS** | SSL redirect en produccion | `SECURE_SSL_REDIRECT=True` (prod) |
| **HSTS** | Strict-Transport-Security (1 ano) | `SECURE_HSTS_SECONDS=31536000` (prod) |
| **CORS** | django-cors-headers con whitelist | `CORS_ALLOWED_ORIGINS` en settings |
| **CSRF** | Django CSRF middleware + tokens | `CSRF_TRUSTED_ORIGINS` en settings |
| **Content Security Policy** | Headers de seguridad | `backend/settings.py` |

### 10.3 Proteccion de Datos en Reposo

| Capa | Implementacion | Ubicacion |
|------|---------------|-----------|
| **Password Storage** | PBKDF2 con salt (nunca texto plano) | Django AbstractUser |
| **Secret Keys** | Variables de entorno (.env) | `.env` (nunca en codigo) |
| **Database Credentials** | DATABASE_URL en env | `.env` |
| **API Keys** | En variables de entorno | `.env` (CLOUDINARY, WOMPI, etc.) |
| **MongoDB Credentials** | MONGODB_URI en env | `.env` |

### 10.4 Proteccion contra Ataques

| Ataque | Proteccion | Implementacion |
|--------|-----------|----------------|
| **Brute Force** | Rate limiting | `django-ratelimit` en views sensibles |
| **CSRF** | Tokens CSRF | Django CSRF middleware |
| **XSS** | Escape de output | React (auto-escape) + Django templates |
| **SQL Injection** | ORM parameterized queries | Django ORM (nunca raw SQL) |
| **Session Fixation** | Session regeneration | Django session middleware |
| **CORS Misconfiguration** | Whitelist estricta | `CORS_ALLOWED_ORIGINS` |
| **Insecure Direct Object Reference** | Permission checks | DRF permission_classes |

### 10.5 Seguridad del Editor 3D

| Capa | Implementacion | Ubicacion |
|------|---------------|-----------|
| **Session Loading** | Datos desde backend, nunca URL | `store/index.js` (loadEditorSession) |
| **CSRF Token** | Read from cookie para POST | `helpers.js` (addDesignToCart) |
| **Credentials** | `credentials: 'include'` en fetch | `store/index.js` |
| **Input Validation** | MaxLength 40 en texto | `TextPicker.jsx` |
| **File Validation** | Accept solo image/* | `FilePicker.jsx` |
| **Error Boundary** | Captura errores de render | `ErrorBoundary.jsx` |
| **WebGL Boundary** | Captura errores WebGL | `canvas/index.jsx` (WebGLErrorBoundary) |

### 10.6 Seguridad CI/CD

| Herramienta | Tipo | Ubicacion |
|------------|------|-----------|
| **CodeQL** | SAST (Static Application Security Testing) | `.github/workflows/security.yml` (lines 11-30) |
| **Trivy** | Dependency/FileSystem Scanning | `.github/workflows/security.yml` (lines 32-52) |
| **Ruff** | Python Linting (security rules) | `.github/workflows/ci.yml` (backend-lint job) |
| **ESLint** | JavaScript Linting | `.github/workflows/ci.yml` (frontend-lint job) |

### 10.7 Seguridad de Infraestructura

| Capa | Implementacion | Ubicacion |
|------|---------------|-----------|
| **Docker Isolation** | Cada servicio en su contenedor | `docker-compose.yml` |
| **Network Isolation** | Redes Docker internas | Docker networks |
| **Volume Permissions** | Read-only mounts donde es posible | `docker-compose.yml` |
| **Non-root User** | Container corre sin root | Dockerfiles |
| **Health Checks** | Monitoreo de servicios | `docker-compose.prod.yml` (healthcheck) |
| **Environment Separation** | .env dev vs .env.prod | `.env.example`, `.env.prod.example` |

### 10.8 Headers de Seguridad

```python
# backend/settings.py (produccion):
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 ano
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
```

---

## 11. VALIDACIONES

### 11.1 Validaciones Backend

#### Validaciones de Modelo (Django Models)

| Modelo | Campo | Validacion | Ubicacion |
|--------|-------|-----------|-----------|
| User | email | Unique, format email | `backend/users/models.py` |
| User | rol | Choices: Admin, Cliente | `backend/users/models.py` |
| User | telefono | MaxLength 20 | `backend/users/models.py` |
| Product | nombre | MaxLength 200, required | `backend/products/models.py` |
| Product | precio | DecimalField(10,2), min_value=0 | `backend/products/models.py` |
| Product | stock | IntegerField, default=0 | `backend/products/models.py` |
| CartItem | cantidad | IntegerField, min_value=1 | `backend/carts/models.py` |
| Order | estado | Choices: pendiente, pagado, enviado, entregado, cancelado | `backend/orders/models.py` |
| Order | total | DecimalField(10,2) | `backend/orders/models.py` |

#### Validaciones de Serializer (DRF)

| Serializer | Campo | Validacion | Ubicacion |
|------------|-------|-----------|-----------|
| UserSerializer | email | EmailField, required | `backend/users/serializers.py` |
| UserSerializer | password | CharField(min_length=8) | `backend/users/serializers.py` |
| ProductSerializer | precio | DecimalField(min_value=0) | `backend/products/serializers.py` |
| CartItemSerializer | cantidad | IntegerField(min_value=1) | `backend/carts/serializers.py` |
| CheckoutSerializer | direccion_envio | CharField(required) | `backend/checkout/serializers.py` |

#### Validaciones de Vista (DRF)

| Validacion | Implementacion | Ubicacion |
|-----------|---------------|-----------|
| IsAuthenticated | `@permission_classes([IsAuthenticated])` | Todas las views protegidas |
| IsAdminUser | `@permission_classes([IsAdminUser])` | Views de admin |
| Object Ownership | `queryset.filter(usuario=request.user)` | UserOrders, UserDesigns |
| Rate Limiting | `@ratelimit(key='ip', rate='10/m')` | Login, Register |

### 11.2 Validaciones Frontend

#### Formularios

| Formulario | Campo | Validacion | Ubicacion |
|-----------|-------|-----------|-----------|
| Login | email | Required, format email | `AuthPage.jsx` |
| Login | password | Required, minLength 8 | `AuthPage.jsx` |
| Register | username | Required, minLength 3 | `AuthPage.jsx` |
| Register | email | Required, format email | `AuthPage.jsx` |
| Register | password | Required, minLength 8, match confirm | `AuthPage.jsx` |
| Checkout | nombre | Required | `CheckoutPage.jsx` |
| Checkout | email | Required, format email | `CheckoutPage.jsx` |
| Checkout | telefono | Required, format phone | `CheckoutPage.jsx` |
| Checkout | direccion | Required | `CheckoutPage.jsx` |
| Checkout | ciudad | Required | `CheckoutPage.jsx` |
| Checkout | departamento | Required | `CheckoutPage.jsx` |
| Contact | asunto | Required | `Email.jsx` |
| Contact | mensaje | Required, minLength 10 | `Email.jsx` |

#### Editor 3D

| Campo | Validacion | Ubicacion |
|-------|-----------|-----------|
| Texto | maxLength 40 caracteres | `TextPicker.jsx` |
| Logo | Accept solo image/* | `FilePicker.jsx` |
| Color | Hex color valido | `ColorPicker.jsx` |
| Escala | Min/max limites | `Customizer.jsx` |

### 11.3 Validaciones de API

| Endpoint | Metodo | Validacion | Ubicacion |
|----------|--------|-----------|-----------|
| POST /api/users/register/ | POST | Email unique, password min 8 | `backend/users/views.py` |
| POST /api/users/login/ | POST | Email exists, password correct | `backend/users/views.py` |
| POST /api/carts/add/ | POST | Product exists, stock available | `backend/carts/views.py` |
| POST /api/checkout/ | POST | Cart not empty, address required | `backend/checkout/views.py` |
| POST /api/checkout/webhook/ | POST | Signature integrity valid | `backend/checkout/views.py` |
| POST /api/editor-session/commit/ | POST | CSRF token valid, session valid | `backend/editor_session/views.py` |

---

## 12. INFRAESTRUCTURA Y DESPLIEGUE

### 12.1 Docker Compose (Desarrollo)

**Archivo:** `docker-compose.yml`

```yaml
services:
  backend:           # Django + Gunicorn (puerto 8000)
    build: ./backend
    ports: ["8000:8000"]
    volumes: [./backend:/app, backend_media:/app/media]
    depends_on: [mongo]

  frontend:          # React + Vite (puerto 5173)
    build: ./frontend
    ports: ["5173:5173"]
    depends_on: [backend]

  tshirt3d:          # Editor 3D (puerto 5174)
    build: ./microservices/Tshirt3D
    ports: ["5174:5174"]
    depends_on: [backend]

  mongo:             # MongoDB (puerto 27017)
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]

volumes:
  backend_media
  backend_static
  mongo_data
```

### 12.2 Docker Compose (Produccion)

**Archivo:** `docker-compose.prod.yml`

```yaml
services:
  backend:           # 3 workers Gunicorn, healthcheck
    deploy:
      resources:
        limits: { memory: 512M }
    healthcheck:
      test: python -c "import urllib.request..."
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:          # Nginx, puerto 80
    ports: ["80:80"]
    depends_on:
      backend: { condition: service_healthy }

  tshirt3d:          # Nginx, puerto interno 80
```

### 12.3 Render Blueprint

**Archivo:** `render.yaml`

| Recurso | Configuracion |
|---------|--------------|
| **Runtime** | Python 3.12 |
| **Plan** | Free |
| **Build** | pip install + collectstatic |
| **PreDeploy** | migrate + ensure_admin |
| **Start** | gunicorn config.wsgi |
| **Health** | /api/health/ |
| **Env Vars** | 30+ variables configuradas |

### 12.4 GitHub Actions CI/CD

**Pipeline CI** (`.github/workflows/ci.yml`):
- `backend-lint`: Ruff + mypy
- `backend-test`: pytest con PostgreSQL
- `frontend-lint`: ESLint
- `frontend-build`: npm run build

**Pipeline Deploy** (`.github/workflows/deploy.yml`):
- Manual trigger con seleeccion de ambiente
- Build y push de imagenes Docker a GHCR
- Tags: SHA + latest

**Pipeline Security** (`.github/workflows/security.yml`):
- CodeQL (SAST)
- Trivy (dependency scanning)
- Ejecucion: push a main + semanal

### 12.5 Vercel (Microservicio Tshirt3D)

**Archivo:** `microservices/Tshirt3D/vercel.json`
```json
{
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 13. BASE DE DATOS

### 13.1 Diagrama Entidad-Relacion

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │     │   Category   │     │   Product    │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │     │ id           │     │ id           │
│ username     │     │ nombre       │     │ nombre       │
│ email        │     │ descripcion  │     │ descripcion  │
│ password     │     │ imagen       │     │ precio       │
│ rol          │     │ activa       │     │ imagen       │
│ avatar       │     └──────┬───────┘     │ categoria_id │──┐
│ telefono     │            │             │ stock        │  │
│ direccion    │            │             │ activo       │  │
│ fecha_creacion│           │             │ fecha_creacion│  │
└──────┬───────┘            │             └──────┬───────┘  │
       │                    │                    │          │
       │ 1:N               │                    │ N:1      │
       ▼                    │                    ▼          │
┌──────────────┐            │             ┌──────────────┐  │
│    Cart      │            │             │ ProductImage │  │
├──────────────┤            │             ├──────────────┤  │
│ id           │            │             │ id           │  │
│ usuario_id   │            │             │ producto_id  │  │
│ fecha_creacion│           │             │ imagen_url   │  │
│ activo       │            │             │ es_principal  │  │
└──────┬───────┘            │             └──────────────┘  │
       │                    │                               │
       │ 1:N               │                               │
       ▼                    │                               │
┌──────────────┐            │                               │
│  CartItem    │            │                               │
├──────────────┤            │                               │
│ id           │            │                               │
│ carrito_id   │            │                               │
│ producto_id  │────────────┘                               │
│ cantidad     │                                            │
│ variante     │                                            │
└──────────────┘                                            │
                                                            │
┌──────────────┐     ┌──────────────┐     ┌──────────────┐  │
│    Order     │     │  OrderItem   │     │   Model3D    │  │
├──────────────┤     ├──────────────┤     ├──────────────┤  │
│ id           │     │ id           │     │ id           │  │
│ usuario_id   │     │ pedido_id    │     │ usuario_id   │  │
│ estado       │     │ producto_id  │     │ imagen_front │  │
│ total        │     │ cantidad     │     │ imagen_back  │  │
│ direccion    │     │ precio_unit  │     │ color        │  │
│ metodo_pago  │     │ variante     │     │ texto_custom │  │
│ ref_pago     │     └──────────────┘     │ logo_textura │  │
│ notas        │                          │ full_textura │  │
│ fecha_pedido │                          │ fecha_creacion│  │
└──────────────┘                          └──────────────┘  │
                                                            │
┌──────────────┐                                            │
│   Design     │────────────────────────────────────────────┘
├──────────────┤
│ id           │
│ usuario_id   │
│ model3d_id   │
│ nombre       │
│ activo       │
│ fecha_creacion│
└──────────────┘
```

### 13.2 Diccionario de Datos

#### Tabla: users_user
| Campo | Tipo | Constraints | Descripcion |
|-------|------|------------|-------------|
| id | BigAutoField | PK | Identificador unico |
| username | Varchar(150) | UNIQUE | Nombre de usuario |
| email | EmailField | UNIQUE | Correo electronico |
| password | Varchar(128) | - | Hash PBKDF2 |
| first_name | Varchar(150) | - | Nombre |
| last_name | Varchar(150) | - | Apellido |
| rol | Varchar(20) | DEFAULT 'Cliente' | Rol del usuario |
| avatar | ImageField | NULLABLE | Foto de perfil |
| telefono | Varchar(20) | - | Telefono |
| direccion | TextField | - | Direccion |
| is_active | BooleanField | DEFAULT True | Activo |
| is_staff | BooleanField | DEFAULT False | Es staff |
| date_joined | DateTimeField | AUTO | Fecha de registro |

#### Tabla: products_product
| Campo | Tipo | Constraints | Descripcion |
|-------|------|------------|-------------|
| id | BigAutoField | PK | Identificador unico |
| nombre | Varchar(200) | - | Nombre del producto |
| descripcion | TextField | - | Descripcion |
| precio | Decimal(10,2) | - | Precio en COP |
| imagen | ImageField | - | Imagen principal |
| categoria_id | ForeignKey | FK → Category | Categoria |
| stock | IntegerField | DEFAULT 0 | Cantidad disponible |
| activo | BooleanField | DEFAULT True | Visible en catalogo |
| fecha_creacion | DateTimeField | AUTO | Fecha de creacion |

#### Tabla: orders_order
| Campo | Tipo | Constraints | Descripcion |
|-------|------|------------|-------------|
| id | BigAutoField | PK | Identificador unico |
| usuario_id | ForeignKey | FK → User | Cliente |
| estado | Varchar(20) | DEFAULT 'pendiente' | Estado del pedido |
| total | Decimal(10,2) | - | Total en COP |
| direccion_envio | TextField | - | Direccion de envio |
| metodo_pago | Varchar(50) | - | Metodo de pago |
| referencia_pago | Varchar(200) | - | Ref Wompi |
| notas | TextField | - | Notas adicionales |
| fecha_pedido | DateTimeField | AUTO | Fecha del pedido |

### 13.3 Backends de Base de Datos

| Backend | Uso | Configuracion |
|---------|-----|---------------|
| **PostgreSQL** | Datos principales (produccion) | `DATABASE_URL` en .env |
| **SQLite** | Desarrollo local | Default cuando DATABASE_URL esta vacia |
| **MongoDB** | Logs, auditoria, sesiones | `USE_MONGODB=true`, `MONGODB_URI` |
| **Redis** | Cache de sesiones, Celery broker | `SESSION_BACKEND=cached_db`, `REDIS_URL` |

---

## ANEXO A: COMANDOS UTILES

### Desarrollo

```bash
# Iniciar todo con Docker
cp .env.example .env
docker compose up --build

# Backend solo
cd backend && source venv/bin/activate && python manage.py runserver

# Frontend solo
cd frontend && npm run dev

# Editor 3D solo
cd microservices/Tshirt3D && npm run dev
```

### Produccion

```bash
# Docker Compose produccion
cp .env.prod.example .env.prod
docker compose -f docker-compose.prod.yml up --build

# Render (automatico via GitHub)
git push origin main
```

### Testing

```bash
# Backend tests
cd backend && pytest

# Linting
cd backend && ruff check .
cd frontend && npm run lint
```

---

## ANEXO B: GLOSARIO

| Termino | Definicion |
|---------|-----------|
| **RED** | Ropa con Estampados Digitales - nombre del proyecto |
| **Decal** | Textura/imagen aplicada sobre superficie 3D |
| **GLB** | Formato de archivo 3D (GLTF Binary) |
| **JWT** | JSON Web Token - estandar de autenticacion |
| **CORS** | Cross-Origin Resource Sharing |
| **CSRF** | Cross-Site Request Forgery |
| **HSTS** | HTTP Strict Transport Security |
| **SAST** | Static Application Security Testing |
| **DRF** | Django REST Framework |
| **Valtio** | Libreria de estado reactivo para React |
| **Three.js** | Libreria de graficos 3D para WebGL |
| **React Three Fiber** | Renderer de Three.js para React |
| **Cloudinary** | Servicio de almacenamiento y optimizacion de imagenes |
| **Wompi** | Pasarela de pagos colombiana |
| **Brevo** | Servicio de email transaccional (antes Sendinblue) |
| **Celery** | Tareas asincronas en Python |
| **Neon** | Plataforma de PostgreSQL serverless |
| **Neon Auth** | Servicio de autenticacion de Neon |

---

**Documento generado para sustentacion del Proyecto Formativo RED**
**Equipo RED - Septiembre 2026**
