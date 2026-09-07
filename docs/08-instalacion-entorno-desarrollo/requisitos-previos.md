# Requisitos Previos

## 23.1 Software Requerido

| Software | Version Minima | Proposito |
|----------|---------------|-----------|
| Python | 3.12+ | Entorno de ejecucion del backend |
| Node.js | 20+ | Entorno de ejecucion del frontend |
| npm | 10+ | Gestor de paquetes del frontend |
| Git | 2.45+ | Control de versiones |
| Docker (opcional) | 26+ | Contenedorizacion |
| Docker Compose (opcional) | 2.27+ | Orquestacion de contenedores |

## 23.2 Verificacion de Instalacion

```bash
# Verificar Python en Windows
python --version
# Python 3.12.10

# Verificar Python en Linux
python3 --version
# Python 3.12.10

# Verificar Node.js
node --version
# v22.14.0

# Verificar npm
npm --version
# 11.3.0

# Verificar Git
git --version
# git 2.51.1.windows.1

# Verificar Docker (opcional)
docker --version
# Docker version 29.7.2
docker compose version
# Docker Compose version v5.5.1
```

## 23.3 Clonacion del Repositorio

```bash
git clone https://github.com/eliassidez123234dfs/projecto_formativo.git
cd projecto_formativo
```

## 23.4 Variables de Entorno

Copiar el archivo de ejemplo y configurar las variables:

```bash
cp .env.example .env
```

**Variables requeridas en `.env` (raiz del proyecto):**

| Variable | Descripcion | Ejemplo |
|----------|-------------|---------|
| `SECRET_KEY` | Clave secreta de Django | `django-insecure-...` |
| `DEBUG` | Modo debug | `True` (desarrollo) / `False` (produccion) |
| `ALLOWED_HOSTS` | Hosts permitidos | `127.0.0.1,localhost` |
| `FRONTEND_URL` | URL del frontend | `http://localhost:5173` |
| `EMAIL_HOST_USER` | Usuario SMTP | `tu_email@gmail.com` |
| `EMAIL_HOST_PASSWORD` | Password SMTP | `tu_password_app` |
| `DEFAULT_FROM_EMAIL` | Remitente de correos | `noreply@sistema.com` |

## 23.5 Estructura de Archivos .env

El proyecto utiliza **dos** archivos `.env`:

| Archivo | Ubicacion | Proposito |
|---------|-----------|-----------|
| `.env` | Raiz del proyecto | **Unica fuente para backend + frontend + Docker Compose** (Django lee `BASE_DIR.parent/.env`) |
| `microservices/Tshirt3D/.env` | Microservicio Editor 3D | Variables propias del editor (uso de rutas `/api/orders/` y `/api/models3d/models/`) |

> No se necesita `.env` en `backend/` ni en `frontend/`: el backend lee el de la raiz
> y el frontend (Vite) esta configurado con `envDir` apuntando a la raiz del proyecto.
