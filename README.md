# Red Estampación — Tienda de Ropa Virtual con Estampados 3D

Aplicación fullstack para una tienda de ropa virtual con personalización de estampados 3D.
Backend Django REST API + Frontend React (Vite) + Postgres SQL + MongoDB NoSQL.

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
| **Frontend** | React 19, Vite 8, Axios, React Router DOM, React Three Fiber |
| **SQL** | PostgreSQL 16 (Neon en producción, SQLite en desarrollo) |
| **NoSQL** | MongoDB (diseños 3D, logs de auditoría y telemetría) |
| **Imágenes / 3D** | Cloudinary |
| **Emails** | Resend API + Fallback Brevo/Gmail SMTP |
| **Pagos** | Wompi Sandbox / Wompi Checkout |
| **Contenedores** | Docker Compose, Nginx, Render |

## Inicio Rápido

### Con Docker:
```bash
cp .env.example .env    # Configurar credenciales
docker compose up --build
```

### Sin Docker (Desarrollo Local):
```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python manage.py migrate
python manage.py runserver

# Frontend (otra terminal)
cd frontend && npm install && npm run dev -- --host

# Microservicio 3D (opcional para desarrollo aislado)
cd microservices/Tshirt3D && npm install && npm run dev -- --host
```

## Estructura del Repositorio

```
proyecto_formativo/
├── backend/            # API Django REST y lógica de negocio
├── frontend/           # Aplicación web cliente y panel administrativo
├── microservices/      # Microservicio independiente del Editor 3D
├── docs/               # Documentación completa del proyecto
├── docker-compose.yml  # Configuración multi-contenedor
└── .env.example        # Plantilla de variables de entorno
```

## Créditos

Proyecto formativo — Equipo RED.
