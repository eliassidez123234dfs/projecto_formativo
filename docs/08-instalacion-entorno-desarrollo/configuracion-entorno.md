# Configuracion del Entorno de Desarrollo

## Requisitos previos

- Git
- Python 3.11 o superior
- Node.js 18 o superior
- npm 10 o superior
- Docker y Docker Compose (opcional)

## Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd proyecto_formativo
```

## Variables de entorno

Copie el archivo de ejemplo y adapte los valores a su entorno:

```bash
cp .env.example .env
```

### Variables de entorno principales — Backend

| Variable | Descripción |
|----------|-------------|
| `SECRET_KEY` | Clave secreta de Django |
| `DEBUG` | `True` para desarrollo, `False` para producción |
| `ALLOWED_HOSTS` | Hosts permitidos separados por coma |
| `FRONTEND_URL` | URL base del frontend |
| `DATABASE_URL` | URL de conexión a PostgreSQL (opcional, usa SQLite por defecto) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USE_TLS` | Configuración de correo |
| `EMAIL_HOST_USER` / `EMAIL_HOST_PASSWORD` | Credenciales de correo |
| `DEFAULT_FROM_EMAIL` | Remitente por defecto |
| `CLOUDINARY_URL` | URL de Cloudinary para almacenamiento de imágenes |

### Variables de entorno principales — Frontend

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base de la API backend (ej: `http://localhost:8000/api/`) |
| `VITE_MEDIA_URL` | URL base para archivos multimedia |

## Seed Data (Datos de Ejemplo)

Para poblar la base de datos con productos, categorías y un usuario admin de ejemplo:

```bash
cd backend
python manage.py loaddata
python manage.py load_sample_data
python manage.py seed_all
```

Esto crea:
- Categorías (Camisetas, Hoodies, Gorras, etc.)
- Productos de ejemplo con variantes (tallas, colores)
- Imágenes de muestra (si configuraste Cloudinary)
- Un superusuario: `admin@test.com` / `admin123`

## 1. Ejecucion sin Docker

### Backend (Django)

```bash
# 1. Navegar al directorio del backend
cd backend

# 2. Crear y activar entorno virtual
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate   # Windows

# 3. Actualizar pip e instalar dependencias
python -m pip install --upgrade pip 
pip install --upgrade pip
pip install -r requirements.txt

# 4. Configurar variables de entorno
# Copiar .env.example a .env en la RAÍZ del proyecto y completar los valores

# 5. Ejecutar migraciones
python manage.py makemigrations # solo la primera vez
python manage.py showmigrations
python manage.py migrate

# 6. Crear superusuario (opcional)
python manage.py createsuperuser

# 7. Poblar base de datos con datos de prueba (opcional)
python manage.py loaddata
python manage.py load_sample_data
python manage.py seed_all

# 8. Iniciar servidor de desarrollo
python manage.py runserver
```

El backend estara disponible en: `http://localhost:8000/`

### Frontend (React + Vite)

```bash
# 1. Navegar al directorio del frontend
cd frontend

# 2. Instalar dependencias
npm install
npm install-scripts approve --all

# 3. Configurar variables de entorno
# El frontend lee el .env de la RAÍZ del proyecto (configurado en vite.config.js con envDir)
# No hace falta frontend/.env

# 4. Iniciar servidor de desarrollo
npm run dev -- --host
```

El frontend estara disponible en: `http://127.0.0.1:5173/`

### Microservicio de Editor 3D (Arquitectura propia, aunque usa mismo Backend)

```bash
# 1. Navegar al directorio del editor
cd microservices/Tshirt3D

# 2. Configurar variables de entorno
# Copiar microservices/Tshirt3D/.env.example a microservices/Tshirt3D/.env (archivo propio del editor):
# VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
# VITE_CLOUDINARY_UPLOAD_PRESET=tu_upload_preset
# VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/tu_cloud_name/image/upload
# VITE_MODELS3D_API_URL=http://127.0.0.1:8000/api/models3d/models/
# VITE_API_URL=http://127.0.0.1:8000/api/orders/

# 3. Backend (Django) ya deberia estar activado en otra terminal como se explico antes.

# 2. Instalar dependencias
npm install
npm install-scripts approve --all

# 4. Iniciar servidor de desarrollo
npm run dev -- --host
```

Abre el navegador en la URL que muestre Vite, normalmente `http://127.0.0.1:5174/`

## 2. Ejecucion con Docker Compose

```bash
# 1. Desde la raiz del proyecto
docker compose up --build
```

Esto iniciara:
- Backend en `http://127.0.0.1:8000/`
- Frontend en `http://127.0.0.1:5173/`
- Microservicio Editor 3D en `http://127.0.0.1:5174/`

### Comandos utiles de Docker

```bash
# Iniciar contenedores en segundo plano
docker compose up -d

# Detener contenedores
docker compose down

# Ver logs
docker compose logs -f

# Ejecutar comandos dentro del contenedor backend
docker exec proyecto_backend python manage.py migrate
docker exec proyecto_backend python manage.py createsuperuser
docker exec proyecto_backend python manage.py seed_products

# Reconstruir imagenes
docker compose build
```

## 3. Comandos Django Utiles

```bash
# Migraciones
python manage.py makemigrations <app_name>
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Shell de Django
python manage.py shell

# Recolectar archivos estaticos
python manage.py collectstatic

# Pruebas
python manage.py test

# Seed de datos de prueba
python manage.py seed_products
python manage.py seed_users
python manage.py seed_all # los dos comandos anteriores juntos hacen lo mismo que este

# Verificar el proyecto
python manage.py check
```

## 4. Comandos Frontend Utiles

```bash
# Desarrollo
npm run dev

# Build de produccion
npm run build

# Preview del build
npm run preview

# Linter
npm run lint
```

## 5. Acceso al Panel de Administracion

Una vez iniciado el servidor, acceder a:

```
http://localhost:8000/admin/
```

Credenciales: las del superusuario creado con `createsuperuser`.

## 6. Rutas de la Aplicacion

| Componente | URL (desarrollo) |
|-----------|------------------|
| Frontend | `http://127.0.0.1:5173` |
| Backend API | `http://127.0.0.1:8000/api/` |
| Admin Django | `http://127.0.0.1:8000/admin/` |
| Editor 3D | `http://127.0.0.1:5174` |

## 7. Base de Datos

| Aspecto | Desarrollo | Produccion |
|---------|-----------|------------|
| Motor | SQLite | PostgreSQL |
| Archivo | `backend/db.sqlite3` | Base de datos dedicada |
| Migracion | `python manage.py migrate` | `python manage.py migrate` |

**Migracion a PostgreSQL en produccion:**

1. Configurar variables en `.env`:
```
DATABASE_URL=postgres://user:password@host:5432/dbname
```

2. Descomentar la configuracion de PostgreSQL en `settings.py`

3. Ejecutar migraciones:
```bash
python manage.py migrate
```

## 8. Resolucion de Problemas Comunes

| Problema | Solucion |
|----------|----------|
| `django.db.utils.OperationalError: no such table` | Ejecutar `python manage.py migrate` |
| `ModuleNotFoundError: No module named '...'` | Ejecutar `pip install -r requirements.txt` |
| CORS error en frontend | Verificar que `CORS_ALLOWED_ORIGINS` incluya `http://localhost:5173` |
| Error de conexion a BD | Verificar que PostgreSQL este corriendo y las credenciales sean correctas |
| Puerto 8000 en uso | Usar `python manage.py runserver 0.0.0.0:8001` |
| Token JWT invalido | Refrescar token en `/api/token/refresh/` o volver a iniciar sesion |
| Error de migracion | `python manage.py migrate --run-syncdb` (solo en desarrollo) |

```bash
# Borra todas las tablas (datos, no estructura). Después corres seed_all de nuevo.
python manage.py flush --noinput

# Alternativa manual si quieres borrar todo + migrations:
Remove-Item -Path db.sqlite3 -Force
python manage.py migrate
python manage.py loaddata
python manage.py seed_all
```

## 24.9 Configuracion de Envio de Correos (Consola vs SMTP Real)

En `.env`, puedes alternar cómo se envían los enlaces de verificación de correo y recuperación de contraseña:

### Modo 1: Enviar a la Terminal (Consola - Ideal para desarrollo)
```env
EMAIL_BACKEND=console
```
Los enlaces de verificación aparecerán directamente en la consola/terminal donde se ejecuta `python manage.py runserver`.

### Modo 2: Enviar a Correos Reales (SMTP)
```env
EMAIL_BACKEND=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion
DEFAULT_FROM_EMAIL=tu_correo@gmail.com
```
Los correos se enviarán de verdad a la bandeja de entrada del usuario registrado.