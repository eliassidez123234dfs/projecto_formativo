# Estado para despliegue

## Qué quedó preparado

- Backend con Gunicorn sin `--reload` en `docker-compose.prod.yml`.
- Frontend y editor 3D compilados en imágenes Nginx multi-stage.
- Proxy del frontend para `/api/`, `/media/` y `/editor/`.
- Endpoint `GET /api/health/` con comprobación de base de datos.
- Migración `models3d.0003` creada.
- Órdenes protegidas por autenticación y propietario/administrador.
- Facturas protegidas por propietario/administrador o enlace firmado temporal para invitados.
- CORS, CSRF, HSTS y redirección HTTPS parametrizados.

## Variables que debes configurar

Crear `.env.prod` a partir de `.env.prod.example`. No subirlo a Git.

- `SECRET_KEY`: clave aleatoria nueva de producción.
- `DEBUG=False`.
- `ALLOWED_HOSTS`: dominio real del backend.
- `DATABASE_URL`: PostgreSQL de Neon o Supabase.
- `FRONTEND_URL`, `BACKEND_URL`, `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` con URLs HTTPS reales.
- Credenciales SMTP reales para correo.
- Credenciales de Cloudinary.

Rotar antes del despliegue las credenciales que hayan estado en el `.env` local.

## Despliegue recomendado

### Opción sencilla: Vercel + Render + Neon/Supabase

1. Frontend: Vercel con `Root Directory=frontend`, comando `npm run build`, salida `dist`.
2. Backend: Render como Web Service Docker usando `backend/Dockerfile`, puerto `$PORT` y las variables de `.env.prod`.
3. Base de datos: Neon o Supabase PostgreSQL usando `DATABASE_URL`.
4. Editor 3D: Render Static Site con raíz `microservices/Tshirt3D`, comando `npm ci && npm run build`, salida `dist`.
5. Cloudinary para imágenes y modelos.

En Render, el backend debe iniciar con:

```bash
python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

### Opción Docker: VPS

En un VPS con Docker y dominio configurado:

```bash
cp .env.prod.example .env.prod
# completar .env.prod
docker compose -f docker-compose.prod.yml up -d --build
```

Para HTTPS se recomienda colocar Caddy, Nginx Proxy Manager o Nginx con Let's Encrypt delante del puerto 80.

## Validaciones realizadas

- Backend: 74 pruebas pasan.
- `check --deploy` con configuración productiva: sin problemas.
- Frontend: build productivo pasa.
- Tshirt3D: build productivo pasa.
- Compose productivo: estructura válida, requiere `.env.prod` para ejecutarse.

El lint del frontend todavía tiene errores preexistentes en componentes no relacionados con esta preparación.