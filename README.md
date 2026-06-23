# Proyecto Formativo: Tienda de Ropa Virtual con Estampados 3D

Este repositorio contiene una aplicación fullstack para una tienda de ropa virtual con personalización de estampados. El proyecto está compuesto por un backend Django que expone una API REST y un frontend React construido con Vite.

## Estructura del repositorio

- `backend/`: API Django, apps del negocio y configuración del servidor.
- `frontend/`: Aplicación React, rutas públicas y administración.
- `docker-compose.yml`: Configuración de contenedores para desarrollo.
- `.env.example`: Plantilla de variables de entorno.
- `SETUP_GUIDE.md`: Guía de instalación y ejecución.
- `DESIGN_GUIDE.md`: Guía de diseño e interfaz.
- `docs/archive/`: Documentos de análisis y diseño anteriores archivados.

## Stack tecnológico

### Backend

- Python 3.12
- Django 5.2
- Django REST Framework
- django-environ
- django-cors-headers
- djangorestframework-simplejwt
- Pillow
- SQLite para desarrollo (configuración inicial)

### Frontend

- React 19
- Vite 8
- Axios
- React Router DOM

### Contenedores

- Docker Compose para desarrollo local
- Servicios separados para backend y frontend

## Arquitectura

El backend está organizado en aplicaciones Django que representan dominios del negocio:

- `apps.users`: autenticación y usuarios.
- `apps.products`: productos, variantes e imágenes.
- `apps.catalog`: catálogo público y filtros.
- `apps.carts`: carrito de compras.
- `apps.checkout`: proceso de compra.
- `apps.orders`: órdenes y estado de pedidos.
- `apps.landing`: páginas públicas y contenido de presentación.

El frontend agrupa componentes y páginas para:

- autenticación y registro.
- catálogo y búsqueda.
- detalle de producto.
- carrito y checkout.
- dashboard de usuario.
- administración de productos y usuarios.

## Funcionalidades principales

### Backend

- API REST para productos, catálogo, carrito y órdenes.
- Creación, edición y publicación de productos.
- Gestión de variantes y validación de stock.
- Endpoints de carrito con actualización de cantidad y eliminación.
- Autenticación JWT y soporte de sesión.
- Gestión de archivos estáticos y multimedia.

### Frontend

- Aplicación React con Vite.
- Consumo de la API backend con Axios.
- Rutas públicas y protegidas.
- Carrito y checkout interactivos.
- Administración de usuarios y productos.

## Requisitos

- Git
- Python 3.11 o superior
- Node.js 18 o superior
- npm 10 o superior
- Docker y Docker Compose (opcional)

## Ejecución local sin Docker

### Backend

```bash
cd backend
python -m venv venv
# source venv/bin/activate
venv/Scripts/activate
pip install --upgrade pip
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

El backend estará disponible en `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

El frontend estará disponible en `http://localhost:5173`.

## Ejecución con Docker Compose

```bash
docker compose up --build
```

## Variables de entorno

Copie el archivo de ejemplo y configure los valores necesarios:

```bash
cp .env.example .env
```

### Backend

- `SECRET_KEY`: clave de Django.
- `DEBUG`: `True` para desarrollo, `False` para producción.
- `ALLOWED_HOSTS`: lista de hosts permitidos.
- `FRONTEND_URL`: URL base del frontend.
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL`: configuración de correo.

### Frontend

- `VITE_API_URL`: URL base de la API backend.
- `VITE_MEDIA_URL`: URL base para medios.

## Estructura del proyecto

```
proyecto_formativo/
├── backend/
├── frontend/
├── docker-compose.yml
├── .env.example
├── .env
├── README.md
├── SETUP_GUIDE.md
├── DESIGN_GUIDE.md
└── docs/archive/
```

## Notas de despliegue

Este proyecto está preparado para desarrollo local. Para producción se recomienda:

- establecer `DEBUG=False`.
- usar una base de datos de producción como PostgreSQL.
- servir el frontend construido como archivos estáticos.
- usar Nginx o un proxy reverso.
- proteger las variables de entorno y no incluir `.env` en el repositorio.
