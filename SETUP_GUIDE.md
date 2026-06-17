# Guía de configuración del proyecto

Esta guía describe cómo instalar y ejecutar el proyecto en un entorno de desarrollo local.

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
npm run dev -- --host
```

### Docker

```bash
docker compose up --build
```

## Despliegue en producción

Para un entorno de producción se recomienda:

- ejecutar `python manage.py collectstatic`.
- usar Gunicorn como servidor WSGI.
- usar Nginx o un proxy reverso para servir el frontend y los activos.
- usar una base de datos de producción.
- mantener las variables de entorno fuera del repositorio.
