# RED Estampación — Tienda de Ropa Virtual con Estampados 3D

Aplicación fullstack para una tienda de ropa virtual con personalización de estampados 3D. Backend Django REST API + Frontend React (Vite).

## Documentación

Toda la documentación del proyecto está en **[`docs/`](./docs/README.md)**, organizada en:

| Sección | Descripción |
|---------|-------------|
| [Introducción](./docs/01-introduccion/) | Visión general, objetivos, alcance |
| [Arquitectura](./docs/05-arquitectura/) | Stack tecnológico, estructura, diseño visual |
| [API](./docs/07-api/) | Endpoints REST, autenticación, contratos |
| [Instalación](./docs/08-instalacion-entorno-desarrollo/) | Guías de configuración y puesta en marcha |
| [Roadmap](./docs/roadmap.md) | Plan de evolución del proyecto |
| [Checklist Producción](./docs/production-checklist.md) | Preparación para despliegue |

## Stack

- **Backend:** Python 3.12, Django 5.2, DRF, JWT, SQLite/PostgreSQL
- **Frontend:** React 19, Vite 8, Axios, React Router DOM
- **Infra:** Docker Compose, Nginx

## Inicio rápido

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python manage.py migrate
python manage.py runserver

# Frontend (otra terminal)
cd frontend && npm install && npm run dev -- --host
```

Requiere: Git, Python ≥ 3.11, Node.js ≥ 18, npm ≥ 10.

## Repositorio

```
proyecto_formativo/
├── backend/       # API Django
├── frontend/      # App React
├── docs/          # Documentación completa
├── docker-compose.yml
└── .env.example
```
