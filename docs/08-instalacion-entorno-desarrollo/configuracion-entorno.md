# Configuracion del Entorno de Desarrollo

## Requisitos previos

- Git

- Python 3.12 o superior

- Node.js 20 o superior

- npm 10 o superior

- Docker y Docker Compose (opcional)

## Clonar el repositorio

```
git clone \<URL\_DEL\_REPOSITORIO\>  
cd proyecto\_formativo
```

## Variables de entorno

Copie el archivo de ejemplo y adapte los valores a su entorno:

```
cp .env.example .env
```

### Variables de entorno principales — Backend

| Variable | Descripción |
| - | - |
| `SECRET\_KEY` | Clave secreta de Django |
| `DEBUG` | `True` para desarrollo, `False` para producción |
| `ALLOWED\_HOSTS` | Hosts permitidos separados por coma |
| `FRONTEND\_URL` | URL base del frontend |
| `DATABASE\_URL` | URL de conexión a PostgreSQL; obligatoria en producción |
| `EMAIL\_HOST` / `EMAIL\_PORT` / `EMAIL\_USE\_TLS` | Configuración de correo |
| `EMAIL\_HOST\_USER` / `EMAIL\_HOST\_PASSWORD` | Credenciales de correo |
| `DEFAULT\_FROM\_EMAIL` | Remitente por defecto |
| `CLOUDINARY\_URL` | URL de Cloudinary para almacenamiento de imágenes |


### Variables de entorno principales — Frontend

| Variable | Descripción |
| - | - |
| `VITE\_API\_URL` | URL base de la API backend (ej: `http://localhost:8000/api/`) |
| `VITE\_MEDIA\_URL` | URL base para archivos multimedia |


## Seed Data (Datos de Ejemplo)

Para poblar la base de datos con productos, categorías y un usuario admin de ejemplo:

```
cd backend  
python manage.py loaddata  
python manage.py load\_sample\_data  
python manage.py seed\_all
```

Esto crea:

- Categorías (Camisetas, Hoodies, Gorras, etc.)

- Productos de ejemplo con variantes (tallas, colores)

- Imágenes de muestra (si configuraste Cloudinary)

- Un superusuario: `admin@test.com` / `admin123`

## 1. Ejecucion sin Docker

### Backend (Django)

```
# 1. Navegar al directorio del backend  
cd backend  
  
# 2. Crear y activar entorno virtual  
python -m venv venv
# Dependiendo de la version de Python y la configuracion puede ser:
# python -m venv venv 
.\venv\Scripts\Activate.ps1  # Windows
  
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
# El modelo custom usa: --usuario, --correo, --noinput  
# Ejemplo con variables de entorno:  
# DJANGO_SUPERUSER_PASSWORD="Red2026!" DJANGO_SUPERUSER_EMAIL="admin@red.com" 
#   python manage.py createsuperuser --usuario admin --noinput  
  
# 7. Poblar base de datos con datos de prueba (opcional)  
python manage.py loaddata  
python manage.py load_sample_data  
python manage.py seed_all  
  
# 8. Iniciar servidor de desarrollo  
python manage.py runserver
```

El backend estara disponible en: `http://localhost:8000/`

### Frontend (React + Vite)

```
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

```
# 1. Navegar al directorio del editor  
cd microservices/Tshirt3D  
  
# 2. Configurar variables de entorno  
# Copiar microservices/Tshirt3D/.env.example a microservices/Tshirt3D/.env (archivo propio del editor):  
# VITE\_CLOUDINARY\_CLOUD\_NAME=tu\_cloud\_name  
# VITE\_CLOUDINARY\_UPLOAD\_PRESET=tu\_upload\_preset  
# VITE\_CLOUDINARY\_URL=https://api.cloudinary.com/v1\_1/tu\_cloud\_name/image/upload  
# VITE\_MODELS3D\_API\_URL=http://127.0.0.1:8000/api/models3d/models/  
# VITE\_API\_URL=http://127.0.0.1:8000/api/orders/  
  
# 3. Backend (Django) ya deberia estar activado en otra terminal como se explico antes.  
  
# 2. Instalar dependencias  
npm install  
npm install-scripts approve --all  
  
# 4. Iniciar servidor de desarrollo  
npm run dev -- --host
```

Abre el navegador en la URL que muestre Vite, normalmente `http://127.0.0.1:5174/`

## 2. Ejecucion con Docker Compose

```
# 1. Desde la raiz del proyecto  
docker compose up --build
```

Esto iniciara:

- Backend en `http://127.0.0.1:8000/`

- Frontend en `http://127.0.0.1:5173/`

- Microservicio Editor 3D en `http://127.0.0.1:5174/`

### Comandos utiles de Docker

```
# Iniciar contenedores en segundo plano  
docker compose up -d  
  
# Detener contenedores  
docker compose down  
  
# Ver logs  
docker compose logs -f  
  
# Ejecutar comandos dentro del contenedor backend  
docker exec proyecto_backend python manage.py migrate  
docker exec proyecto_backend python manage.py createsuperuser  
docker exec proyecto_backend python manage.py seed\_products  
  
# Reconstruir imagenes  
docker compose build
```

## 3. Comandos Django Utiles

```
# Migraciones  
python manage.py makemigrations <app_name>  
python manage.py migrate  
  
# Reconciliar migraciones fakes (si la BD difiere del historial)  
python manage.py migrate <app_name>  <num_migracion> --fake  # retroceder  
python manage.py migrate <app_name>                            # re-aplicar  
  
# Verificar estado de migraciones  
python manage.py showmigrations  
  
# Crear superusuario (modelo custom: usuario, correo)  
python manage.py createsuperuser  
# Non-interactive (requiere DJANGO_SUPERUSER_PASSWORD y DJANGO_SUPERUSER_EMAIL):  
# DJANGO_SUPERUSER_PASSWORD="pass" DJANGO_SUPERUSER_EMAIL="admin@red.com" \\  
#   python manage.py createsuperuser --usuario admin --noinput  
  
# Shell de Django  
python manage.py shell  
  
# Recolectar archivos estaticos  
python manage.py collectstatic  
  
# Pruebas  
python manage.py test  
  
# Seed de datos de prueba  
python manage.py seed\_products  
python manage.py seed\_users  
python manage.py seed\_all \# los dos comandos anteriores juntos hacen lo mismo que este  
  
# Verificar el proyecto  
python manage.py check
```

## 4. Comandos Frontend Utiles

```
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
| - | - |
| Frontend | `http://127.0.0.1:5173` |
| Backend API | `http://127.0.0.1:8000/api/` |
| Admin Django | `http://127.0.0.1:8000/admin/` |
| Editor 3D | `http://127.0.0.1:5174` |


## 7. Base de Datos

| Aspecto | Desarrollo | Produccion |
| - | - | - |
| Motor | SQLite | PostgreSQL |
| Archivo | `backend/db.sqlite3` | Base de datos dedicada |
| Migracion | `python manage.py migrate` | `python manage.py migrate` |


**Migracion a PostgreSQL en produccion:**

1. Configurar variables en `.env`:

```
DATABASE\_URL=postgres://user:password@host:5432/dbname
```

1. Descomentar la configuracion de PostgreSQL en `settings.py`

2. Ejecutar migraciones:

```
python manage.py migrate
```

## 8. Resolucion de Problemas Comunes

| Problema | Solucion |
| - | - |
| `django.db.utils.OperationalError: no such table` | Ejecutar `python manage.py migrate` |
| `django.db.utils.OperationalError: no such column: usuarios.token\_version` | La migración `users.0005` fue faked. Ejecutar `python manage.py migrate users 0004 --fake` y luego `python manage.py migrate users` |
| `ModuleNotFoundError: No module named '...'` | Ejecutar `pip install -r requirements.txt` |
| CORS error en frontend | Verificar que `CORS\_ALLOWED\_ORIGINS` incluya `http://localhost:5173` |
| Error de conexion a BD | Verificar que PostgreSQL este corriendo y las credenciales sean correctas |
| Puerto 8000 en uso | Usar `python manage.py runserver 0.0.0.0:8001` |
| Token JWT invalido | Refrescar token en `/api/token/refresh/` o volver a iniciar sesion |
| Error de migracion | `python manage.py migrate --run-syncdb` (solo en desarrollo) |
| `AttributeError: OutstandingToken has no attribute objects` | Falta `'rest\_framework\_simplejwt.token\_blacklist'` en `THIRD\_PARTY\_APPS` en `settings.py` |


```
# Borra todas las tablas (datos, no estructura). Después corres seed\_all de nuevo.  
python manage.py flush --noinput  
  
# Alternativa manual si quieres borrar todo + migrations:  
Remove-Item -Path db.sqlite3 -Force  
python manage.py migrate  
python manage.py loaddata  
python manage.py load_sample_data  
python manage.py seed_all
```

## 24.9 Configuracion de Envio de Correos (Consola vs SMTP Real)

En `.env`, puedes alternar cómo se envían los enlaces de verificación de correo y recuperación de contraseña:

### Modo 1: Enviar a la Terminal (Consola - Ideal para desarrollo)

```
EMAIL_BACKEND=console
```

Los enlaces de verificación aparecerán directamente en la consola/terminal donde se ejecuta `python manage.py runserver`.

### Modo 2: Enviar a Correos Reales (SMTP)

```
EMAIL_BACKEND=smtp  
EMAIL_HOST=smtp.gmail.com  
EMAIL_PORT=587  
EMAIL_USE_TLS=True  
EMAIL_HOST_USER=tu_correo@gmail.com  
EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion  
DEFAULT_FROM_EMAIL=tu_correo@gmail.com
```

Los correos se enviarán de verdad a la bandeja de entrada del usuario registrado.

