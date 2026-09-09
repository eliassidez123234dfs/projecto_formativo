# RED Estampación — Tienda Virtual con Estampados 3D

Aplicación fullstack para personalización y venta de ropa con modelos 3D.
Backend Django REST API + Frontend React + PostgreSQL.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.12, Django 5.2, DRF, SimpleJWT |
| Frontend | React 19, Vite 8, Axios, Zustand, React Three Fiber |
| SQL | PostgreSQL 16 (Neon en producción, SQLite en desarrollo) |
| Imágenes | Cloudinary |
| Pagos | Wompi |
| Contenedores | Docker Compose |

## Inicio rápido

```bash
cp .env.example .env    # Configurar credenciales
docker compose up --build
```

Abrir http://localhost:5173

## Inicio rápido (sin Docker)

```bash
# Backend
cd backend && python -m venv venv && source venv/bin/activate
pip install -r requirements.txt && python manage.py migrate
python manage.py runserver

# Frontend (otra terminal)
cd frontend && npm install && npm run dev -- --host
```

Requiere: Git, Python ≥ 3.12, Node.js ≥ 18, npm ≥ 10.

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

## Repositorio

```
proyecto_formativo/
├── backend/       # API Django
├── frontend/      # App React
├── docs/          # Documentación completa
├── docker-compose.yml
└── .env.example
```

## Créditos

Proyecto formativo — equipo RED.
