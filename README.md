# Proyecto Formativo: Tienda de Ropa Virtual con Estampados 3D

Aplicacion fullstack para una tienda de ropa virtual con personalizacion de estampados 3D.  
**RED** (Redimido, Redencion) **Estampacion** — Proyecto formativo ADSO, ficha 3147208, SENA CTGI.

Backend Django + DRF | Frontend React + Vite | Editor 3D Three.js

---

## Indice de documentacion

### Puesta en marcha y configuracion

| Documento | Que contiene |
|-----------|-------------|
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Guia completa: backend, frontend, Docker, editor 3D, BD, seed data, superusuarios, troubleshooting (Windows/Linux) |
| **[.env.example](.env.example)** | Plantilla de variables de entorno con todas las opciones disponibles |
| **[FIX_POSTGRESQL.md](FIX_POSTGRESQL.md)** | Solucion de problemas con PostgreSQL (rol, conexion, migraciones) |

### Contribucion y metodologia

| Documento | Que contiene |
|-----------|-------------|
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | GitFlow, estructura de ramas, flujo diario, PRs, merges, ramas temporales, estilo de codigo, comandos git |
| **[Estructura del proyecto](estructura.txt)** | Arbol de directorios completo del repositorio |

### Herramientas y desarrollo

| Documento | Que contiene |
|-----------|-------------|
| **[TOOLKIT.md](docs/TOOLKIT.md)** | IDEs, extensiones, IAs, utilidades y herramientas recomendadas para el desarrollo |

### Stack tecnologico

| Capa | Tecnologias |
|------|-------------|
| Backend | Python 3.12, Django 5.2, DRF 3.16, JWT, Celery, Cloudinary |
| Frontend | React 19, Vite 8, Axios, React Router |
| Editor 3D | Three.js, @react-three/fiber, @react-three/drei, Tailwind CSS |
| Base de datos | SQLite (desarrollo) / PostgreSQL (produccion) |
| Contenedores | Docker, Docker Compose |

### Modulos del backend

| App | Funcionalidad |
|-----|---------------|
| `users` | Autenticacion JWT, registro, perfiles, roles, auditoria |
| `products` | CRUD de productos, variantes, imagenes, stock |
| `catalog` | Catalogo publico, busqueda, filtros, categorias |
| `carts` | Carrito por sesion/usuario, validacion de stock |
| `checkout` | Proceso de compra |
| `orders` | Pedidos, historial, estados |
| `models3d` | Modelos 3D con Cloudinary, previews |
| `landing` | Pagina principal y contenido estatico |

---

## Inicio rapido

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python manage.py migrate
python manage.py seed_all && python manage.py runserver

# Frontend (otra terminal)
cd frontend && npm install && npm run dev -- --host

# Editor 3D (otra terminal)
cd microservices/Tshirt3D && npm install && npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/
- Admin Django: http://localhost:8000/admin/

---

## Documentacion tecnica detallada

### API y backend

| Documento | Que contiene |
|-----------|-------------|
| **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** | Documentacion completa de todos los endpoints REST (451 lineas) |
| **[Models3D - API](backend/apps/models3d/README.md)** | Endpoints, ejemplos y flujo de integracion de modelos 3D con Cloudinary |
| **[Cloudinary](cloudinary.md)** | Guia de integracion de Cloudinary: almacenamiento, transformaciones, widget de subida (742 lineas) |

### Arquitectura y analisis

| Documento | Que contiene |
|-----------|-------------|
| **[docs/archive/ANALISIS_COMPLETO.md](docs/archive/ANALISIS_COMPLETO.md)** | Analisis completo del proyecto: repositorios, backend, frontend, arquitectura, estado |
| **[docs/archive/ARQUITECTURA_ADMIN_PANEL.md](docs/archive/ARQUITECTURA_ADMIN_PANEL.md)** | Arquitectura del panel de administracion: temas, componentes, API |
| **[docs/archive/SITEMAP_AND_FLOWS.md](docs/archive/SITEMAP_AND_FLOWS.md)** | Sitemap visual, flujos de usuario, diagramas de navegacion (469 lineas) |

### Frontend y diseno

| Documento | Que contiene |
|-----------|-------------|
| **[DESIGN_GUIDE.md](DESIGN_GUIDE.md)** | Guia de diseno: paleta de colores, tipografia, componentes, responsividad |
| **[docs/archive/REDESIGN_SUMMARY.md](docs/archive/REDESIGN_SUMMARY.md)** | Resumen del rediseno corporutivo de la interfaz (v2.0) |
| **[docs/archive/ENTREGA_FINAL.md](docs/archive/ENTREGA_FINAL.md)** | Entrega final del rediseno: archivos CSS, componentes, documentacion |
| **[docs/archive/ADMIN_PANEL_RESUMEN.md](docs/archive/ADMIN_PANEL_RESUMEN.md)** | Resumen del panel de administracion profesional |
| **[frontend/README.md](frontend/README.md)** | README generado por Vite (template inicial) |

### Editor 3D y microservicios

| Documento | Que contiene |
|-----------|-------------|
| **[microservices/Tshirt3D/README.md](microservices/Tshirt3D/README.md)** | Documentacion del editor 3D: setup, configuracion Cloudinary, flujo de uso |

### Administracion y operacion

| Documento | Que contiene |
|-----------|-------------|
| **[docs/archive/GUIA_ADMIN_PANEL.md](docs/archive/GUIA_ADMIN_PANEL.md)** | Guia de uso del panel de administracion |
| **[docs/archive/ERRORES_Y_CORRECCIONES.md](docs/archive/ERRORES_Y_CORRECCIONES.md)** | Historial de errores encontrados y sus correcciones |

---

## Documentacion del proyecto (requisitos y especificaciones)

| Documento | Que contiene |
|-----------|-------------|
| **[Ficha Proyecto RED.md](Ficha%20Proyecto%20RED.md)** | Ficha tecnica del proyecto: objetivos, justificacion, problematica, equipo, instructores |
| **[Matrix de requerimientos/](Matrix%20de%20requerimientos.xlsx/)** | Matriz de requerimientos en HTML: RF, RNF, casos de prueba, HU, trazabilidad, arquitectura |
| `Matrix de requerimientos.xlsx/RF.html` | Requisitos funcionales |
| `Matrix de requerimientos.xlsx/RNF.html` | Requisitos no funcionales |
| `Matrix de requerimientos.xlsx/CASOS DE PRUEBA.html` | Casos de prueba |
| `Matrix de requerimientos.xlsx/Historias de Usuario.html` | Historias de usuario |
| `Matrix de requerimientos.xlsx/Trazabilidad.html` | Matriz de trazabilidad |
| `Matrix de requerimientos.xlsx/ARQUITECTURA RECOMENDADA.html` | Arquitectura recomendada |

---

## Documentacion para IAs (SDD / Spec-Driven Development)

| Documento | Que contiene |
|-----------|-------------|
| **[.cursorrules](.cursorrules)** | Reglas de desarrollo asistido por IA: MCP tools, flujo de trabajo, estandares (230 lineas) |
| **[.auxly/](.auxly/)** | Configuracion de Auxly: versionamiento, trial details, task management |
| **[.sixth/skills/](.sixth/skills/)** | Skills de desarrollo para Sixth (IA coding assistant) |

---

## Enlaces rapidos

- **Repositorio:** https://github.com/eliassidez123234dfs/projecto_formativo
- **Panel admin:** http://localhost:8000/admin/
- **API navegable:** http://localhost:8000/api/products/

### Archivos clave del proyecto

| Archivo | Proposito |
|---------|-----------|
| `backend/config/settings.py` | Configuracion principal de Django |
| `backend/config/urls.py` | Rutas principales de la API |
| `backend/requirements.txt` | Dependencias de Python |
| `docker-compose.yml` | Orquestacion de contenedores |
| `frontend/package.json` | Dependencias del frontend |
| `frontend/vite.config.js` | Configuracion de Vite |
| `microservices/Tshirt3D/package.json` | Dependencias del editor 3D |
