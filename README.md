# Red Estampación — Tienda de Ropa Virtual con Estampados 3D

Aplicación fullstack para una tienda de ropa virtual con personalización de estampados 3D.
Backend Django REST API + Microservicio Spring Boot (JPA/MongoDB) + Frontend React (Vite) + PostgreSQL + MongoDB.

## Documentación

Toda la documentación del proyecto está en **[`docs/`](./docs/README.md)**, organizada en:

| Sección | Descripción |
|---------|-------------|
| [Introducción](./docs/01-introduccion/) | Visión general, objetivos, alcance |
| [Arquitectura](./docs/05-arquitectura/) | Stack tecnológico, estructura, diseño visual |
| [API](./docs/07-api/) | Endpoints REST, autenticación, contratos |
| [Instalación](./docs/08-instalacion-entorno-desarrollo/) | Guías de configuración y puesta en marcha |
| [Roadmap](./docs/12-historial/roadmap.md) | Plan de evolución del proyecto |
| [Checklist Producción](./docs/09-despliegue/checklist-produccion.md) | Preparación para despliegue |

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Backend** | Python 3.12+, Django 5.2, DRF, SimpleJWT |
| **Microservicio** | Java 21, Spring Boot 4, JPA/MongoDB, Jakarta Validation |
| **Frontend** | React 19, Vite 8, Axios, React Router DOM, React Three Fiber |
| **SQL** | PostgreSQL 16 (Neon cloud en producción) |
| **NoSQL** | MongoDB (diseños 3D, logs de auditoría, microservicio productos) |
| **Imágenes / 3D** | Cloudinary |
| **Emails** | Resend API + Fallback Brevo/Gmail SMTP |
| **Pagos** | Wompi Sandbox / Wompi Checkout |
| **Contenedores** | Docker Compose, Nginx, Render |

## Arquitectura de Microservicios

```
React Frontend (:5173)
    │
    ├── /api/v1/*  ──► Spring Boot (:8082 PostgreSQL / :8083 MongoDB)
    │   CRUD productos: crear, listar, editar, eliminar (soft delete)
    │
    └── /api/*     ──► Django (:8000)
        Imágenes, variantes, categorías, carrito, órdenes,
        auth, catálogo público, checklist, aprobación
```

**Ramas Git espejo:**
- `Proyecto2_JPA/main` + `projecto_formativo/java/microservicio` → PostgreSQL
- `Proyecto2_JPA/java/mongoDB` + `projecto_formativo/java/mongoDB` → MongoDB

## Inicio Rápido

### Con Docker:
```bash
cp .env.example .env    # Configurar credenciales
docker compose up --build
```

### Sin Docker (Desarrollo Local):
```bash
# Backend Django
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python manage.py migrate
python manage.py runserver

# Microservicio Spring Boot (otra terminal)
cd ../Proyecto2_JPA/servicio && ./mvnw spring-boot:run

# Frontend (otra terminal)
cd ../projecto_formativo/frontend && npm install && npm run dev -- --host

# Microservicio 3D (opcional)
cd ../microservices/Tshirt3D && npm install && npm run dev -- --host
```

## Estructura del Repositorio

```
projecto_formativo/
├── backend/            # API Django REST y lógica de negocio
├── frontend/           # Aplicación web cliente y panel administrativo
├── microservices/      # Microservicio independiente del Editor 3D
├── docs/               # Documentación completa del proyecto
├── docker-compose.yml  # Configuración multi-contenedor
└── .env.example        # Plantilla de variables de entorno

Proyecto2_JPA/
├── servicio/           # Microservicio Spring Boot
│   ├── src/            # Código fuente Java
│   └── pom.xml         # Dependencias Maven
└── README.md           # Documentación del microservicio
```

## Créditos

Proyecto formativo — Equipo RED.
