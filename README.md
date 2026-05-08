# 🏪 Proyecto Formativo – Tienda de Ropa Virtual con Estampados 3D

## 📋 Descripción

Este proyecto es una aplicación fullstack de e-commerce para una tienda de ropa virtual que también ofrece estampados personalizados con un editor 3D. Construido con arquitectura moderna y escalable.

### 🛠️ Stack Tecnológico

**Backend:**

- **Django 5.2.13** + **Django REST Framework** (API)
- **PostgreSQL** / **SQLite** (base de datos)
- **Django-environ** (variables de entorno)
- **Pillow** (procesamiento de imágenes)
- **django-cors-headers** (comunicación frontend)

**Frontend:**

- **React** + **Vite** (interfaz)
- **Three.js** (visualización 3D)
- **Bootstrap** (estilos responsive)

**Arquitectura:**

- **Microservicios** + **Capas** + **MVC**
- **Monolito modular** (escalable)
- **API RESTful** (separación frontend/backend)

---

## 🏗️ Arquitectura General

El backend está estructurado como un **monolito modular**, donde cada app representa un dominio del negocio específico.

### 📦 Apps del Sistema

#### 👤 **users**

Gestión de usuarios y autenticación

- Registro / login
- Perfil de usuario
- Autenticación (JWT o sesión)

#### 📱 **products**

Gestión de productos base (camisas 3D)

- Nombre, precio, stock
- Imágenes / assets
- Variantes (talla/color)
- **✅ Completado con validaciones completas**

#### 🏪 **catalog**

Capa de consulta y organización de productos

- Filtros avanzados
- Búsqueda inteligente
- Categorías
- Ordenamiento
- **✅ Completado con búsqueda y filtros**

#### 🛒 **carts**

Carrito de compras temporal del usuario

- Agregar productos
- Actualizar cantidades
- Eliminar items
- **✅ Completado con validación de stock**

#### 💳 **checkout**

Proceso de compra y validación

- Validar carrito
- Calcular totales
- Aplicar descuentos
- Verificar stock
- Crear orden

#### 📦 **orders**

Historial de compras confirmadas

- Estado del pedido
- Items congelados
- Fecha de compra
- Estados: pending/paid/shipped/cancelled

#### 🌐 **landing**

Página pública del sistema

- Marketing
- Presentación del producto
- Entrada al catálogo

---

## 🔄 Flujo del Sistema

1. **Usuario entra a landing** → Explora catálogo
2. **Explora catálogo** → Usa filtros y búsqueda
3. **Ve productos** → Detalles con imágenes 3D
4. **Agrega al carrito** → Validación de stock
5. **Checkout procesa** → Cálculo de totales
6. **Se crea orden** → Confirmación del pedido
7. **Se confirma pedido** → Procesamiento envío

---

## 🎨 Microservicios (Externo)

El sistema 3D de camisas puede estar desacoplado como microservicio:

- Generación de modelos 3D
- Renderizado en tiempo real
- Personalización avanzada
- Integración con editor web

---

## 📊 Nota de Arquitectura

- **products** = datos base
- **catalog** = consulta y visualización
- **cart** = estado temporal
- **checkout** = proceso
- **orders** = resultado final

---

## 🚀 Setup Instructions

### 📋 Requisitos Previos

1. **Python 3.11+** y **pip**
2. **PostgreSQL** (o SQLite para desarrollo)
3. **Node.js 18+** y **npm** (para frontend)
4. **Git**

---

### 🐍 Backend Setup

#### 1. Crear Entorno Virtual

```bash
cd /home/South_Knight/Documentos/projecto_formativo/backend
python -m venv venv

# Linux/Mac
source venv/bin/activate

# Windows
venv\Scripts\activate
```

#### 2. Instalar Dependencias

```bash
pip install -r requirements.txt
```

#### 3. Configurar Base de Datos

**Opción A: SQLite (Recomendado para desarrollo)**

```bash
# Ya configurado por defecto
# Solo ejecutar migrations
```

**Opción B: PostgreSQL**

```bash
# Crear base de datos
createdb projecto_formativo

# Configurar variables de entorno
export DB_NAME=projecto_formativo
export DB_USER=postgres
export DB_PASSWORD=tu_password
export DB_HOST=localhost
export DB_PORT=5432
```

#### 4. Crear y Ejecutar Migrations

```bash
python manage.py makemigrations products catalog carts
python manage.py migrate
```

#### 5. Crear Superusuario

```bash
python manage.py createsuperuser
```

#### 6. Iniciar Servidor de Desarrollo

```bash
python manage.py runserver
```

**Backend disponible en:** `http://localhost:8000`

---

### ⚛️ Frontend Setup

#### 1. Instalar Dependencias

```bash
cd /home/South_Knight/Documentos/projecto_formativo/frontend
npm install
```

#### 2. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

**Frontend disponible en:** `http://localhost:5173`

---

## 🗂️ Estructura del Proyecto

```
projecto_formativo/
├── backend/                    # Django API
│   ├── apps/
│   │   ├── products/          # ✅ Gestión de productos
│   │   ├── catalog/           # ✅ Catálogo público
│   │   ├── carts/             # ✅ Carrito de compras
│   │   ├── users/             # Usuarios y autenticación
│   │   ├── orders/            # Pedidos
│   │   ├── checkout/          # Proceso de compra
│   │   └── landing/           # Página principal
│   ├── config/                # Configuración Django
│   ├── manage.py
│   └── requirements.txt
├── frontend/                  # React + Vite
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── microservices/             # Servicios externos (futuro)
└── README_COMPLETO.md         # Este archivo
```

---

## 🔧 Configuración de Variables de Entorno

### Backend (.env)

```bash
# Security
SECRET_KEY=django-insecure-key-solo-para-desarrollo
DEBUG=True

# Database (SQLite por defecto)
# DB_NAME=projecto_formativo
# DB_USER=postgres
# DB_PASSWORD=tu_password
# DB_HOST=localhost
# DB_PORT=5432

# Media files
MEDIA_URL=/media/
MEDIA_ROOT=media/

# CORS (para frontend)
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### Frontend (.env)

```bash
VITE_API_BASE_URL=http://localhost:8000/api/
VITE_MEDIA_URL=http://localhost:8000/media/
```

---

## 📋 Módulos Completados

### ✅ Products API

- **Models**: Product, ProductImage, Variant, ProductAudit
- **Serializers**: Validaciones completas según user stories
- **Viewsets**: CRUD, búsqueda, filtros, paginación
- **Features**: Checklist de configuración, auditoría, publicación

### ✅ Catalog API

- **Models**: Category, SearchHistory, PopularSearch
- **Features**: Búsqueda avanzada, filtros combinables
- **Endpoints**: Catálogo público, categorías, productos destacados

### ✅ Cart API

- **Models**: Cart, CartItem
- **Features**: Gestión de carrito por sesión, validación de stock
- **Integration**: Con products y catalog

---

## 📚 API Documentation

### Base URL

```
http://localhost:8000/api/
```

### 🔐 Authentication

Actualmente usa sesión de Django. Futuro: JWT authentication.

---

### 📦 Products API (`/api/products/`)

#### GET `/api/products/`

Lista todos los productos con paginación y filtros.

**Query Parameters:**

- `search` - Búsqueda por nombre/descripción
- `is_active` - true/false
- `is_approved` - true/false
- `min_price` - Precio mínimo
- `max_price` - Precio máximo
- `ordering` - Ordenamiento (name, -name, base_price, -base_price, created_at, -created_at)
- `page` - Número de página
- `page_size` - Elementos por página (max 100)

#### POST `/api/products/`

Crear nuevo producto (admin).

#### GET `/api/products/{id}/`

Obtener detalles de producto específico.

#### POST `/api/products/{id}/images`

Agregar imagen a producto (JPG/PNG, max 2MB, min 400x400px).

#### POST `/api/products/{id}/variants`

Agregar variante a producto (talla/color/stock).

#### POST `/api/products/{id}/publish`

Publicar producto (solo si cumple requisitos).

#### GET `/api/products/{id}/checklist`

Ver checklist de configuración del producto.

#### GET `/api/products/{id}/audits`

Obtener historial de auditoría del producto.

#### POST `/api/products/add-to-cart/`

Agregar producto al carrito desde catálogo o editor 3D.

#### GET `/api/products/search/`

Búsqueda avanzada con filtros combinables.

---

### 🏪 Catalog API (`/api/catalog/`)

#### GET `/api/catalog/`

Catálogo público para usuarios (solo productos activos/aprobados).

**Query Parameters:**

- `q` - Término de búsqueda
- `category` - ID de categoría
- `min_price` / `max_price` - Rango de precios
- `size` / `color` - Filtros de variante
- `has_stock` - true/false
- `ordering` - Incluye `popularity`

#### GET `/api/catalog/filters/`

Obtener filtros disponibles sin paginación.

#### GET `/api/catalog/popular-searches/`

Búsquedas populares recientes.

#### GET `/api/catalog/search-history/`

Historial de búsqueda del usuario (por sesión).

#### GET `/api/catalog/featured/`

Productos destacados (con stock e imágenes).

#### GET `/api/catalog/deals/`

Productos en oferta.

---

### 📂 Categories API (`/api/catalog/categories/`)

#### GET `/api/catalog/categories/`

Lista todas las categorías activas.

#### GET `/api/catalog/categories/{id}/products/`

Productos de una categoría específica.

---

### 🛒 Cart API (`/api/cart/`)

#### GET `/api/cart/`

Obtener carrito actual del usuario.

#### POST `/api/cart/add/`

Agregar producto al carrito.

#### PATCH `/api/cart/items/{item_id}/quantity`

Actualizar cantidad de un item.

#### DELETE `/api/cart/items/{item_id}/remove`

Eliminar item del carrito.

---

## 📋 Validaciones y Reglas de Negocio

### Products

- **Nombre**: Único, requerido, max 100 caracteres
- **Descripción**: Requerida, max 500 caracteres
- **Precio**: Mayor a 0, 2 decimales
- **Imágenes**: Máximo 5 por producto, JPG/PNG, max 2MB, min 400x400px
- **Variantes**: Máximo 4 tallas y 10 colores por producto
- **Stock**: Mayor o igual a 0
- **Publicación**: Requiere imagen principal y al menos una variante con stock

### Cart

- **Cantidad**: Mínima 1, no puede superar stock disponible
- **Producto**: Debe estar activo y aprobado
- **Variante**: Debe pertenecer al producto
- **Duplicados**: Actualiza cantidad en lugar de duplicar

### Catalog

- **Búsqueda**: Parcial e insensible a mayúsculas
- **Filtros**: Combinables entre sí
- **Paginación**: Máximo 20 resultados por página por defecto

---

## 🔧 Errores Comunes

### 400 Bad Request

```json
{
  "name": ["El nombre no puede superar 100 caracteres."],
  "base_price": ["El precio base debe ser mayor a 0."],
  "image": ["La imagen no puede superar 2MB."],
  "quantity": ["La cantidad no puede superar el stock disponible."]
}
```

### 404 Not Found

```json
{
  "detail": "No encontrado."
}
```

### 403 Forbidden

```json
{
  "name": "No se puede editar el nombre si existen pedidos activos."
}
```

---

## 🚀 Guía de Integración Frontend

### 1. Configurar Axios

```javascript
const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
  withCredentials: true
});
```

### 2. Ejemplo: Catálogo con filtros

```javascript
const fetchCatalog = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  
  const response = await api.get(`catalog/?${params}`);
  return response.data;
};
```

### 3. Ejemplo: Agregar al carrito

```javascript
const addToCart = async (productId, variantId, quantity) => {
  const response = await api.post('products/add-to-cart/', {
    product_id: productId,
    variant_id: variantId,
    quantity
  });
  return response.data;
};
```

### 4. Manejo de errores

```javascript
try {
  const result = await addToCart(1, 1, 2);
  showToast(result.message);
} catch (error) {
  if (error.response?.status === 400) {
    Object.values(error.response.data).flat().forEach(showError);
  }
}
```

---

## 📱 Ejemplos de Uso

### React + Bootstrap Component

```jsx
const ProductCard = ({ product }) => {
  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, product.variants[0].id, 1);
      alert('Producto agregado al carrito');
    } catch (error) {
      alert('Error: ' + error.response.data.detail);
    }
  };

  return (
    <div className="card">
      <img src={product.main_image} className="card-img-top" />
      <div className="card-body">
        <h5 className="card-title">{product.name}</h5>
        <p className="card-text">${product.base_price}</p>
        <button 
          className="btn btn-primary"
          onClick={handleAddToCart}
          disabled={!product.ready_to_publish}
        >
          Agregar al Carrito
        </button>
      </div>
    </div>
  );
};
```

---

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
python manage.py test

# Tests por app
python manage.py test apps.products
python manage.py test apps.catalog
python manage.py test apps.carts
```

### Tests de API

```bash
# Instalar pytest-django
pip install pytest-django

# Ejecutar tests de API
pytest apps/products/api/tests.py
```

---

## 🚀 Despliegue

### Development

```bash
# Backend
python manage.py runserver 0.0.0.0:8000

# Frontend  
npm run dev -- --host
```

### Production (Futuro)

```bash
# Backend con Gunicorn
pip install gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000

# Frontend build
npm run build

# Servir archivos estáticos con nginx
```

---

## 🐛 Problemas Comunes y Soluciones

### 1. ModuleNotFoundError: No module named 'environ'

```bash
# Activar entorno virtual
source venv/bin/activate

# Reinstalar dependencias
pip install -r requirements.txt
```

### 2. Error de conexión a PostgreSQL

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql

# Verificar credenciales
psql -h localhost -U postgres -d projecto_formativo
```

### 3. Problemas con CORS en frontend

```bash
# Verificar configuración en settings.py
CORS_ALLOWED_ORIGINS = ["http://localhost:5173"]
```

### 4. Imágenes no se muestran

```bash
# Verificar configuración de media
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# En desarrollo, agregar a urls.py
from django.conf import settings
from django.conf.urls.static import static
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 5. Error: No existe el rol 'South_Knight' (PostgreSQL)

**Solución 1: Usar SQLite (Recomendado para desarrollo)**

```python
# En settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

**Solución 2: Configurar PostgreSQL correctamente**

```bash
# Crear rol de usuario
sudo -u postgres psql
CREATE USER south_knight WITH PASSWORD 'tu_password';
CREATE DATABASE projecto_formativo OWNER south_knight;
GRANT ALL PRIVILEGES ON DATABASE projecto_formativo TO south_knight;
\q
```

---

## 📚 Documentación Adicional

- **Django Admin**: `http://localhost:8000/admin/`
- **DRF Browsable API**: `http://localhost:8000/api/products/`

---

## 🔄 Próximos Pasos

1. **Ejecutar migrations** para crear tablas en BD ✅
2. **Crear datos de prueba** con fixtures o management commands
3. **Configurar frontend** para consumir las APIs
4. **Implementar autenticación** (JWT o sesión)
5. **Agregar tests** automatizados
6. **Configurar Docker** para desarrollo consistente

---

## 📞 Soporte

Para problemas específicos:

1. Revisar logs del servidor Django
2. Verificar documentación de API arriba
3. Consultar tests para ver ejemplos de uso
4. Revisar configuración de variables de entorno

---

## 🎯 Checklist de Funcionalidades

### Products Management ✅

- [X] Crear producto con validaciones
- [X] Subir imágenes (JPG/PNG, 2MB, 400x400px)
- [X] Definir variantes (talla/color/stock)
- [X] Buscar y filtrar productos
- [X] Editar producto con auditoría
- [X] Validar configuración mínima

### Catalog ✅

- [X] Búsqueda parcial insensible a mayúsculas
- [X] Filtros combinables (precio, estado, etc.)
- [X] Paginación y ordenamiento
- [X] Categorías de productos
- [X] Historial de búsqueda
- [X] Búsquedas populares

### Cart ✅

- [X] Agregar productos al carrito
- [X] Validar stock disponible
- [X] Actualizar cantidades
- [X] Evitar duplicados
- [X] Integración con catálogo

### Frontend (Pendiente)

- [ ] Componentes React para catálogo
- [ ] Integración con Three.js para 3D
- [ ] Bootstrap para estilos
- [ ] Vite para build y desarrollo

---

## 🔄 Futuras Mejoras

- JWT Authentication
- Rate Limiting
- Caching con Redis
- WebSockets para tiempo real
- Integración con pasarelas de pago
- Sistema de calificaciones y reseñas
- Búsqueda avanzada con Elasticsearch
- CDN para imágenes
- Microservicios para renderizado 3D

---

## 🎉 **Estado Actual del Proyecto**

✅ **Backend Django API completamente funcional**
✅ **Módulos Products, Catalog y Cart implementados**
✅ **Validaciones completas según user stories**
✅ **API RESTful documentada y lista para consumir**
✅ **Servidor corriendo en http://localhost:8000**

🔄 **Pendiente: Frontend React + Three.js**

---

**¡El proyecto está listo para mostrar al instructor y para que tus compañeros integren el frontend!** 🚀