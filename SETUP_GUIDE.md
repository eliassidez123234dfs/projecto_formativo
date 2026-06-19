# Guía de Configuración del Proyecto — RED Estampación

> Esta guía describe cómo instalar y ejecutar el proyecto en un entorno de desarrollo local.
> Para una visión general del proyecto, consulta [README.md](./README.md).
> Para el índice completo de documentación, consulta [INDICE.md](./INDICE.md).

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

### Backend

1. Entre en el directorio `backend`:

   ```bash
   cd backend
   ```

2. Cree y active el entorno virtual:

   Linux / macOS:
   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

   Windows:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```

3. Instale las dependencias:

   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Ejecute las migraciones:

   ```bash
   python manage.py migrate
   ```

5. Cree un superusuario:

   ```bash
   python manage.py createsuperuser
   ```

6. Inicie el servidor de desarrollo:

   ```bash
   python manage.py runserver
   ```

El backend quedará disponible en `http://localhost:8000`.

### Frontend

1. Entre en el directorio `frontend`:

   ```bash
   cd ../frontend
   ```

2. Instale las dependencias:

   ```bash
   npm install
   ```

3. Inicie el servidor de desarrollo:

   ```bash
   npm run dev -- --host
   ```

El frontend quedará disponible en `http://localhost:5173`.

## Ejecución con Docker Compose

Para levantar los servicios del backend y el frontend:

```bash
docker compose up --build
```

## Variables de entorno principales

### Backend

- `SECRET_KEY`
- `DEBUG`
- `ALLOWED_HOSTS`
- `FRONTEND_URL`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USE_TLS`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`

### Frontend

- `VITE_API_URL`
- `VITE_MEDIA_URL`

## Comandos útiles

### Backend

```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver
```

### Frontend

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
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py loaddata seed_data.json
```

---

## 6. Seed Data (Datos de Ejemplo)

Para poblar la base de datos con productos, categorías y un usuario admin de ejemplo:

```bash
cd backend
python manage.py load_sample_data
```

Esto crea:
- Categorías (Camisetas, Hoodies, Gorras, etc.)
- Productos de ejemplo con variantes (tallas, colores)
- Imágenes de muestra (si configuraste Cloudinary)
- Un superusuario: `admin@test.com` / `admin123`

---

## 7. Variables de entorno principales

### Backend

| Variable | Descripción |
|----------|-------------|
| `SECRET_KEY` | Clave secreta de Django |
| `DEBUG` | `True` para desarrollo, `False` para producción |
| `ALLOWED_HOSTS` | Hosts permitidos separados por coma |
| `FRONTEND_URL` | URL base del frontend |
| `DATABASE_URL` | URL de conexión a PostgreSQL (opcional, usa SQLite por defecto) |
| `EMAIL_HOST` / `EMAIL_PORT` | Configuración de correo |
| `CLOUDINARY_URL` | URL de Cloudinary para almacenamiento de imágenes |

### Frontend

| Variable | Descripción |
|----------|-------------|
| `VITE_API_URL` | URL base de la API backend (ej: `http://localhost:8000/api/`) |
| `VITE_MEDIA_URL` | URL base para archivos multimedia |

---

## 8. Notas de Producción

Para entornos productivos se recomienda:

- `DEBUG=False`
- PostgreSQL como base de datos
- Gunicorn + Nginx como servidor
- Frontend servido como estáticos desde Nginx
- HTTPS con Let's Encrypt
- Variables de entorno seguras (nunca en el repositorio)
- Consultar [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) para la lista completa
