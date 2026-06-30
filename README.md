# Red Estampación — Tienda Virtual con Estampados 3D

Aplicación fullstack para personalización y venta de ropa con modelos 3D.
Backend Django REST API + Frontend React + Postgres SQL + MongoDB NoSQL.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.14, Django 5.2, DRF, SimpleJWT |
| Frontend | React 19, Vite 8, Axios, Zustand, React Three Fiber |
| SQL | PostgreSQL 16 (Neon en producción, SQLite en desarrollo) |
| NoSQL | MongoDB Atlas (diseños 3D, logs, carritos persistentes) |
| Imágenes | Cloudinary |
| Pagos | Wompi |
| Contenedores | Docker Compose |

## Inicio rápido

```bash
cp .env.example .env    # Configurar credenciales
docker compose up --build
```

Abrir http://localhost:5173

## Documentación

- [`SETUP_GUIDE.md`](SETUP_GUIDE.md) — Instalación detallada (con y sin Docker, Windows/Linux/macOS)
- `docs/` — Documentos de análisis, diseño y arquitectura

## Créditos

Proyecto formativo — equipo RED.
