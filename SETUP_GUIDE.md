# Guía de Configuración — Red Estampación

Guía completa para clonar, configurar y ejecutar el proyecto en cualquier
sistema operativo (Windows, Linux, macOS).

---

## Requisitos mínimos

| Herramienta | Versión mínima | Opcional |
|------------|---------------|----------|
| Python | 3.11 | — |
| Node.js | 18 | — |
| npm | 10 | — |
| PostgreSQL | 16 | ✅ (sin Docker) |
| MongoDB | 7 | ✅ (sin Docker) |
| Docker | 24 + Compose | ✅ |
| Git | 2.30 | — |

> **Sin Docker** necesitas PostgreSQL y MongoDB instalados localmente.
> **Con Docker** solo necesitas Docker + Git — los contenedores incluyen
> PostgreSQL; MongoDB queda opcional.

---

## 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd proyecto_formativo
```

## 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales. Valores obligatorios:

| Variable | Dónde obtenerla |
|----------|----------------|
| `SECRET_KEY` | `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `DATABASE_URL` | Tu instancia PostgreSQL local, Docker o Neon |
| `MONGODB_URI` | Tu instancia MongoDB local o Atlas |

### Ejemplo para desarrollo local sin Docker (PostgreSQL + MongoDB locales)

```env
SECRET_KEY=generada-con-el-comando-de-arriba
DEBUG=True
DATABASE_URL=postgres://proyecto_user:proyecto_pass@localhost:5432/projecto_formativo
MONGODB_URI=mongodb://localhost:27017/projecto_formativo
```

### Ejemplo para desarrollo local con Docker

```env
SECRET_KEY=generada-con-el-comando-de-arriba
DEBUG=True
DATABASE_URL=postgres://proyecto_user:proyecto_pass@postgres:5432/projecto_formativo
MONGODB_URI=
```

> Si `DATABASE_URL` está vacío, Django usará SQLite automáticamente.
> Si `MONGODB_URI` está vacío, MongoDB se omite sin errores.

---

## 3. Opción A — Ejecutar con Docker (recomendado)

```bash
# Iniciar PostgreSQL + Backend + Frontend
docker compose up --build

# Servicio          Puerto
# PostgreSQL        5432
# Backend Django    8000
# Frontend React    5173
```

El `docker-compose.yml` ya incluye seed de datos automático.

> Docker no incluye MongoDB por defecto. Para añadirlo:
> ```bash
> docker run -d --name proyecto_mongo -p 27017:27017 mongo:7
> ```

---

## 3. Opción B — Ejecutar sin Docker

### Backend

```bash
# 1. Entorno virtual
cd backend
python -m venv venv

# Linux/macOS:
source venv/bin/activate
# Windows:
# venv\Scripts\activate

# 2. Dependencias
pip install --upgrade pip
pip install -r requirements.txt

# 3. Migraciones
python manage.py migrate

# 4. Semilla de datos (crea usuarios de prueba)
python manage.py seed_users
python manage.py seed_data

# 5. Servidor
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### MongoDB (opcional — necesario solo para carritos persistentes, diseños 3D y logs)

```bash
# Instalar MongoDB local o usar Docker:
docker run -d --name proyecto_mongo -p 27017:27017 mongo:7
```

---

## 4. Usuarios de prueba (seed)

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin_red` | `Admin123!` | Administrador API | Dashboard admin |
| `superadmin` | `SuperAdmin123!` | Superusuario | Dashboard admin + Django admin |
| `admin` | `Admin123!` | Administrador | Desde seed_data |
| `test` | `Test123!` | Usuario | Catálogo, perfil |

> Las contraseñas por defecto pueden sobreescribirse con variables de entorno:
> `SEED_ADMIN_PASSWORD`, `SEED_SUPER_PASSWORD`, `SEED_TEST_PASSWORD`

---

## 5. Arquitectura de almacenamiento

| Tipo | Tecnología | Qué almacena |
|------|-----------|-------------|
| **SQL** | PostgreSQL (o SQLite dev) | Usuarios, productos, variantes, órdenes, facturas |
| **NoSQL** | MongoDB | Diseños 3D guardados, logs de auditoría, carritos persistentes, plantillas comunitarias |
| **Archivos** | Cloudinary | Imágenes de productos, texturas, modelos 3D (.glb) |
| **Memoria** | RAM (navegador) | JWT access token (nunca en localStorage) |
| **SessionStorage** | Navegador | JWT refresh token (se borra al cerrar pestaña) |

---

## 6. Verificar que todo funciona

```bash
# Backend health check
curl http://localhost:8000/api/health/

# Frontend
Abrir http://localhost:5173 en el navegador

# MongoDB (si configurado)
cd backend && python -c "
from apps.users.mongodb import is_mongo_connected
print('MongoDB:', 'conectado' if is_mongo_connected() else 'no configurado')
"
```

---

## 7. Despliegue a producción (Render + Vercel)

Ver `render.yaml` para el blueprint de Render.

Variables requeridas en producción:
- `SECRET_KEY` — generada, **nunca** la misma que desarrollo
- `DATABASE_URL` — apuntando a Neon PostgreSQL
- `MONGODB_URI` — apuntando a MongoDB Atlas
- `DEBUG=False`
- `DJANGO_ALLOWED_HOSTS=dominio.com`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `EMAIL_BACKEND`, `EMAIL_HOST`, etc. — SMTP real
- `WOMPI_*` — credenciales de Wompi (producción)
