# Guia de configuracion del proyecto

Guia completa para poner en funcionamiento el proyecto en entornos de desarrollo local, tanto en **Linux** como en **Windows**.

---

## Requisitos previos

| Herramienta       | Version minima  | Donde descargar                              |
|-------------------|-----------------|----------------------------------------------|
| Git               | Cualquiera      | https://git-scm.com/downloads                |
| Python            | 3.11+           | https://www.python.org/downloads/            |
| Node.js           | 18+             | https://nodejs.org/                          |
| npm               | 10+             | Viene con Node.js                            |
| Docker            | 24+ (opcional)  | https://www.docker.com/products/docker-desktop|

---

## 1. Clonar el repositorio

```bash
git clone <URL_DEL_REPOSITORIO>
cd projecto_formativo
```

Si ya lo tienes clonado y quieres actualizar:

```bash
git checkout main
git pull origin main
```

---

## 2. Variables de entorno

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Edita `.env` con tus valores. Las variables mas importantes:

### Backend (las lee Django desde la raiz del proyecto)

```env
SECRET_KEY=django-insecure-projecto-formativo-dev-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
FRONTEND_URL=http://localhost:5173

# Email (opcional en desarrollo, imprime en consola por defecto)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Base de datos

Por defecto usa **SQLite** (no requiere configuracion).  
Para PostgreSQL, descomenta en `backend/config/settings.py` y agrega al `.env`:

```env
DB_NAME=projecto_formativo
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
```

### Cloudinary (imagenes de productos)

```env
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### Frontend

```env
VITE_API_URL=http://localhost:8000/api/
VITE_MEDIA_URL=http://localhost:8000/media/
```

---

## 3. Backend (Django)

### 3.1 Crear y activar entorno virtual

**Linux / macOS:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

**Windows (cmd o PowerShell):**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
```

### 3.2 Instalar dependencias

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3.3 Migrar la base de datos

```bash
python manage.py migrate
```

Si aparece `InconsistentMigrationHistory`, borra la base de datos y vuelve a migrar:

```bash
rm -f db.sqlite3        # Linux/macOS
del db.sqlite3          # Windows
python manage.py migrate
```

### 3.4 Cargar datos de ejemplo

El proyecto incluye un comando que crea usuarios, categorias, productos, variantes, pedidos y modelos 3D de prueba:

```bash
python manage.py seed_all
```

Usuarios creados:

| Usuario  | Correo             | Contrasena | Rol            |
|----------|--------------------|------------|----------------|
| admin    | admin@red.com      | Admin123!  | Administrador  |
| staff    | staff@red.com      | Staff123!  | Administrador  |
| juan     | juan@email.com     | User1234!  | Usuario        |
| maria    | maria@email.com    | Maria123!  | Usuario        |
| carlos   | carlos@email.com   | Carlos12!  | Usuario        |

### 3.5 Crear superusuario (alternativa si no usas seed)

```bash
# Con contrasena interactiva
python manage.py createsuperuser

# O con contrasena por variable de entorno (para scripting)
DJANGO_SUPERUSER_PASSWORD=Admin123! python manage.py createsuperuser \
    --usuario admin --correo admin@test.com --noinput
```

### 3.6 Iniciar el servidor

```bash
python manage.py runserver
```

El backend queda disponible en `http://localhost:8000`.  
El panel de administracion en `http://localhost:8000/admin/`.  
La API navegable en `http://localhost:8000/api/products/`.

### 3.7 Comandos utiles de manage.py

```bash
# Migraciones
python manage.py makemigrations              # Crear archivos de migracion
python manage.py migrate                     # Aplicar migraciones
python manage.py migrate --fake <app> <num>  # Fingir migracion (para resolver conflictos)
python manage.py showmigrations              # Ver estado de las migraciones
python manage.py sqlmigrate <app> <num>      # Ver SQL de una migracion

# Datos
python manage.py seed_all                    # Cargar datos de ejemplo
python manage.py dumpdata > datos.json       # Exportar datos
python manage.py loaddata datos.json         # Importar datos

# Shell
python manage.py shell                       # Consola interactiva de Django

# Tests
python manage.py test                        # Ejecutar todos los tests
python manage.py test apps.products          # Tests de una app especifica

# Utilidades
python manage.py check                       # Verificar configuracion
python manage.py collectstatic               # Recolectar archivos estaticos
python manage.py createsuperuser             # Crear superusuario
```

---

## 4. Frontend (React + Vite)

### 4.1 Instalar dependencias

```bash
cd frontend
npm install
```

Si da error `EACCES: permission denied`, corrige los permisos:

```bash
# Linux/macOS
sudo chown -R $USER:$USER package.json package-lock.json
```

### 4.2 Iniciar servidor de desarrollo

```bash
npm run dev -- --host
```

El frontend queda disponible en `http://localhost:5173`.

### 4.3 Build para produccion

```bash
npm run build
npm run preview    # Vista previa del build
```

---

## 5. Docker

### 5.1 Requisitos

- Docker Desktop instalado y en ejecucion
  - **Linux:** `sudo systemctl start docker`
  - **Windows/macOS:** Abre Docker Desktop desde el menu de inicio

Verifica que Docker esta corriendo:

```bash
docker info
```

### 5.2 Construir y levantar los contenedores

Desde la raiz del proyecto:

```bash
docker compose up --build
```

Esto levanta:
- **Backend** en `http://localhost:8000` (con Gunicorn)
- **Frontend** en `http://localhost:5173` (con Vite)

### 5.3 Ejecutar comandos dentro del contenedor

```bash
# Migraciones
docker compose exec backend python manage.py migrate

# Seed data
docker compose exec backend python manage.py seed_all

# Superusuario
docker compose exec backend python manage.py createsuperuser

# Shell de Django
docker compose exec backend python manage.py shell

# Logs en tiempo real
docker compose logs -f
```

### 5.4 Detener y limpiar

```bash
# Detener contenedores (los datos persisten)
docker compose down

# Detener y eliminar volumenes (borra la BD)
docker compose down -v

# En PC con bajos recursos: apaga Docker Desktop cuando no lo uses
# Linux: sudo systemctl stop docker
# Windows/macOS: Cierra Docker Desktop desde la bandeja del sistema
```

---

## 6. Microservicio: Editor 3D (Tshirt3D)

El editor 3D es un microservicio independiente basado en React, Three.js y Vite.

### 6.1 Iniciar el editor 3D

```bash
cd microservices/Tshirt3D
npm install
```

Crea el archivo `microservices/Tshirt3D/.env`:

```env
VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=tu_upload_preset
VITE_CLOUDINARY_URL=https://api.cloudinary.com/v1_1/tu_cloud_name/image/upload
VITE_MODELS3D_API_URL=http://127.0.0.1:8000/api/models3d/models/
```

Inicia:

```bash
npm run dev
```

Disponible en `http://localhost:5173` (o el puerto que asigne Vite).

### 6.2 Requisitos

- Backend Django corriendo en `http://127.0.0.1:8000`
- Cuenta de Cloudinary con `upload preset`
- Node.js 18+

---

## 7. Base de datos

### SQLite (desarrollo, por defecto)

No requiere configuracion. La base de datos se crea automaticamente en `backend/db.sqlite3`.

```bash
python manage.py migrate
```

### PostgreSQL (produccion)

1. Instala PostgreSQL y crea la base de datos:

```bash
sudo -u postgres psql
CREATE USER tu_usuario WITH PASSWORD 'tu_password';
CREATE DATABASE projecto_formativo OWNER tu_usuario;
GRANT ALL PRIVILEGES ON DATABASE projecto_formativo TO tu_usuario;
\q
```

2. Configura las variables de entorno en `.env`.
3. En `backend/config/settings.py`, descomenta la configuracion de PostgreSQL y comenta la de SQLite.
4. Migra:

```bash
python manage.py migrate
```

---

## 8. Solucion de problemas comunes

### ModuleNotFoundError: No module named 'django'

El entorno virtual no esta activado:

```bash
# Linux/macOS
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### EACCES: permission denied (frontend)

Los archivos son propiedad de root. Solucion:

```bash
sudo chown -R $USER:$USER frontend/
```

### InconsistentMigrationHistory

Las migraciones estan desordenadas. Solucion mas rapida en desarrollo:

```bash
rm -f backend/db.sqlite3
python manage.py migrate
```

### Puerto en uso

```bash
# Linux/macOS
lsof -i :8000
kill -9 <PID>

# Windows
netstat -ano | findstr :8000
taskkill /F /PID <PID>
```

### Docker: cannot connect to docker daemon

Docker no esta corriendo:

```bash
# Linux
sudo systemctl start docker

# Windows/macOS: abre Docker Desktop
```

### Error de CORS en el frontend

Verifica que `CORS_ALLOWED_ORIGINS` en `settings.py` incluya `http://localhost:5173`.

### Las imagenes no se muestran

Verifica la configuracion de media en `settings.py`:

```python
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

Y que las rutas de `urls.py` incluyan el handler de media.

---

## 9. Estructura del proyecto

```
projecto_formativo/
├── backend/                     # Django API
│   ├── apps/
│   │   ├── users/               # Autenticacion, usuarios, tokens
│   │   ├── products/            # Productos, variantes, imagenes
│   │   ├── catalog/             # Catalogo publico, categorias
│   │   ├── carts/               # Carrito de compras
│   │   ├── orders/              # Pedidos y estado
│   │   ├── checkout/            # Proceso de compra
│   │   ├── landing/             # Pagina principal
│   │   └── models3d/            # Modelos 3D
│   ├── config/                  # Configuracion Django (settings, urls)
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                    # React + Vite
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── Dockerfile
├── microservices/               # Servicios externos
│   └── Tshirt3D/               # Editor 3D con Three.js
├── docker-compose.yml           # Orquestacion de contenedores
├── .env.example                 # Plantilla de variables de entorno
├── README.md                    # Resumen del proyecto
├── SETUP_GUIDE.md               # Esta guia
└── CONTRIBUTING.md              # Guia de contribucion y GitFlow
```
