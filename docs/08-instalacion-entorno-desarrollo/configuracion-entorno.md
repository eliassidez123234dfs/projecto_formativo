# Configuracion del Entorno de Desarrollo

## 24.1 Ejecucion sin Docker

### Backend (Django)

```bash
# 1. Navegar al directorio del backend
cd backend

# 2. Crear y activar entorno virtual
python3 -m venv venv
# source venv/bin/activate  # Linux/Mac
venv\Scripts\activate   # Windows

# 3. Actualizar pip e instalar dependencias
python -m pip install --upgrade pip 
# pip install --upgrade pip
pip install -r requirements.txt

# 4. Configurar variables de entorno
# Editar backend/.env con los valores correspondientes

# 5. Ejecutar migraciones
python manage.py makemigrations # solo la primera vez
# python manage.py showmigrations
python manage.py migrate

# 6. Crear superusuario (opcional)
python manage.py createsuperuser

# 7. Poblar base de datos con datos de prueba (opcional)
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

# 3. Configurar variables de entorn o
# Editar frontend/.env si es necesario
# VITE_API_URL=http://localhost:8000/api/

# 4. Iniciar servidor de desarrollo
npm run dev -- --host
```

El frontend estara disponible en: `http://localhost:5173/`

### Microservicio de Editor 3D (Arquitectura propia, aunque usa mismo Backend)

```bash
# 1. Navegar al directorio del editor
cd microservices/Tshirt3D

# 2. Configurar variables de entorno
# Crea un archivo `.env` en la carpeta `microservices/Tshirt3D` con estas variables si es necesario:
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

## 24.2 Ejecucion con Docker Compose

```bash
# 1. Desde la raiz del proyecto
docker compose up --build
```

Esto iniciara:
- Backend en `http://localhost:8000/`
- Frontend en `http://localhost:5173/`

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

## 24.3 Comandos Django Utiles

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

# Verificar el proyecto
python manage.py check
```

## 24.4 Comandos Frontend Utiles

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

## 24.5 Acceso al Panel de Administracion

Una vez iniciado el servidor, acceder a:

```
http://localhost:8000/admin/
```

Credenciales: las del superusuario creado con `createsuperuser`.

## 24.6 Rutas de la Aplicacion

| Componente | URL (desarrollo) |
|-----------|------------------|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000/api/` |
| Admin Django | `http://localhost:8000/admin/` |
| Editor 3D | `http://localhost:5174` |

## 24.7 Base de Datos

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

## 24.8 Resolucion de Problemas Comunes

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
python manage.py seed_all
```