# Configuración de Entornos - Red Estampación

Este documento explica cómo configurar el proyecto para diferentes entornos (desarrollo, pruebas, producción) utilizando variables de entorno flexibles.

## Tabla de Contenidos

- [Modos de Operación](#modos-de-operación)
- [Configuración de Base de Datos](#configuración-de-base-de-datos)
- [Configuración de Correo Electrónico](#configuración-de-correo-electrónico)
- [Configuración de MongoDB](#configuración-de-mongodb)
- [Configuración de Sesiones](#configuración-de-sesiones)
- [Configuración de Cloudinary](#configuración-de-cloudinary)
- [Docker Compose Profiles](#docker-compose-profiles)

## Modos de Operación

El proyecto soporta tres modos de operación principales:

```bash
ENVIRONMENT=development  # Desarrollo local
ENVIRONMENT=staging       # Pruebas/QA
ENVIRONMENT=production   # Producción
```

## Configuración de Base de Datos

### Opciones Disponibles

```bash
DB_TYPE=sqlite              # SQLite local (desarrollo rápido)
DB_TYPE=postgres_local      # PostgreSQL instalado localmente
DB_TYPE=postgres_docker     # PostgreSQL en contenedor Docker
DB_TYPE=neon                # PostgreSQL en la nube (Neon)
```

### Ejemplos de Configuración

#### SQLite (Desarrollo Rápido)
```env
DB_TYPE=sqlite
# No requiere DATABASE_URL
```

#### PostgreSQL Local
```env
DB_TYPE=postgres_local
DATABASE_URL=postgres://usuario:password@localhost:5432/projecto_formativo
```

#### PostgreSQL Docker
```env
DB_TYPE=postgres_docker
DATABASE_URL=postgres://proyecto_user:proyecto_pass@postgres:5432/projecto_formativo
```

#### Neon (Producción)
```env
DB_TYPE=neon
DATABASE_URL=postgresql://user:pass@ep-region.aws.neon.tech/neondb?sslmode=require
```

## Configuración de Correo Electrónico

### Opciones Disponibles

```bash
EMAIL_BACKEND=console   # Imprime correos en terminal (desarrollo/pruebas)
EMAIL_BACKEND=smtp     # Envía correos reales (producción)
```

### Ejemplos de Configuración

#### Console (Desarrollo/Pruebas)
```env
EMAIL_BACKEND=console
# No requiere configuración SMTP adicional
```

#### SMTP (Producción)
```env
EMAIL_BACKEND=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_TIMEOUT=10
EMAIL_HOST_USER=tu_correo@gmail.com
EMAIL_HOST_PASSWORD=tu_contraseña_de_aplicacion
DEFAULT_FROM_EMAIL=noreply@sistema.com
```

## Configuración de MongoDB

### Opciones Disponibles

```bash
USE_MONGODB=true   # Habilita MongoDB para diseños 3D, logs, carritos
USE_MONGODB=false  # Usa solo Django ORM (PostgreSQL/SQLite)
```

### Ejemplos de Configuración

#### MongoDB Local
```env
USE_MONGODB=true
MONGODB_URI=mongodb://localhost:27017/projecto_formativo
MONGODB_NAME=projecto_formativo
```

#### MongoDB Atlas (Producción)
```env
USE_MONGODB=true
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority&appName=ClusterRED0
MONGODB_NAME=projecto_formativo
```

#### Sin MongoDB
```env
USE_MONGODB=false
# No requiere configuración MongoDB adicional
```

## Configuración de Sesiones

### Opciones Disponibles

```bash
SESSION_BACKEND=django_db   # Sesiones en base de datos Django
SESSION_BACKEND=redis       # Sesiones en Redis
SESSION_BACKEND=cached_db   # Caché Redis + persistencia en DB
```

### Ejemplos de Configuración

#### Django DB (Desarrollo)
```env
SESSION_BACKEND=django_db
# No requiere REDIS_URL
```

#### Redis (Producción)
```env
SESSION_BACKEND=redis
REDIS_URL=redis://localhost:6379/0
```

#### Cached DB (Producción con persistencia)
```env
SESSION_BACKEND=cached_db
REDIS_URL=redis://localhost:6379/0
```

## Configuración de Logging

### Opciones Disponibles

```bash
LOG_OUTPUT=console   # Muestra logs solo en terminal (desarrollo)
LOG_OUTPUT=file      # Guarda logs en archivos (producción)
LOG_OUTPUT=both      # Muestra en terminal y guarda en archivos
```

```bash
LOG_LEVEL=DEBUG      # Información detallada de depuración
LOG_LEVEL=INFO       # Información general del sistema
LOG_LEVEL=WARNING    # Advertencias
LOG_LEVEL=ERROR      # Errores
LOG_LEVEL=CRITICAL   # Errores críticos
```

### Ejemplos de Configuración

#### Console (Desarrollo)
```env
LOG_OUTPUT=console
LOG_LEVEL=DEBUG
# No requiere LOG_DIR
```

#### File (Producción)
```env
LOG_OUTPUT=file
LOG_LEVEL=INFO
LOG_DIR=logs
```

#### Both (Producción con visibilidad)
```env
LOG_OUTPUT=both
LOG_LEVEL=INFO
LOG_DIR=logs
```

### Archivos de Log Generados

Cuando `LOG_OUTPUT=file` o `both`, se generan los siguientes archivos en el directorio `LOG_DIR`:
- `app.log`: Logs generales de la aplicación
- `errors.log`: Errores y excepciones
- `requests.log`: Logs de peticiones HTTP
- `client_errors.log`: Errores del cliente

Todos los archivos usan RotatingFileHandler con:
- Tamaño máximo: 5MB
- Backups: 3-5 archivos según tipo
- Encoding: UTF-8

## Configuración de Cloudinary

### Opciones Disponibles

```bash
USE_CLOUDINARY=true   # Usa Cloudinary para almacenamiento multimedia
USE_CLOUDINARY=false  # Usa almacenamiento local
```

### Ejemplos de Configuración

#### Cloudinary (Producción)
```env
USE_CLOUDINARY=true
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

#### Almacenamiento Local (Desarrollo)
```env
USE_CLOUDINARY=false
# No requiere credenciales Cloudinary
```

## Docker Compose Profiles

El proyecto incluye perfiles de Docker Compose para diferentes configuraciones:

### Profile: SQLite (Desarrollo Rápido)
```bash
docker-compose --profile sqlite up
```
- Usa SQLite como base de datos
- No requiere contenedores adicionales
- Ideal para desarrollo rápido

### Profile: PostgreSQL (Desarrollo con Docker)
```bash
docker-compose --profile postgres up
```
- Usa PostgreSQL en contenedor Docker
- Incluye backend con configuración PostgreSQL

### Profile: Full (Producción Completa)
```bash
docker-compose --profile full up
```
- Incluye PostgreSQL, Redis y MongoDB
- Configuración completa para producción
- Sesiones con caché Redis
- MongoDB habilitado

### Profile Individual
```bash
# Solo PostgreSQL
docker-compose --profile postgres up postgres

# Solo Redis
docker-compose --profile redis up redis

# Solo MongoDB
docker-compose --profile mongodb up mongodb
```

## Ejemplos de Configuración Completa

### Desarrollo Local (SQLite)
```env
ENVIRONMENT=development
DEBUG=True
DB_TYPE=sqlite
EMAIL_BACKEND=console
SESSION_BACKEND=django_db
USE_MONGODB=false
USE_CLOUDINARY=false
LOG_OUTPUT=console
LOG_LEVEL=DEBUG
```

### Desarrollo con Docker
```env
ENVIRONMENT=development
DEBUG=True
DB_TYPE=postgres_docker
EMAIL_BACKEND=console
SESSION_BACKEND=cached_db
REDIS_URL=redis://redis:6379/0
USE_MONGODB=true
MONGODB_URI=mongodb://mongodb:27017/projecto_formativo
USE_CLOUDINARY=true
LOG_OUTPUT=console
LOG_LEVEL=DEBUG
```

### Producción (Neon + Atlas + Cloudinary)
```env
ENVIRONMENT=production
DEBUG=False
DB_TYPE=neon
DATABASE_URL=postgresql://user:pass@ep-region.aws.neon.tech/neondb?sslmode=require
EMAIL_BACKEND=smtp
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=produccion@sistema.com
EMAIL_HOST_PASSWORD=contraseña_segura
SESSION_BACKEND=cached_db
REDIS_URL=redis://localhost:6379/0
USE_MONGODB=true
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority&appName=ClusterRED0
USE_CLOUDINARY=true
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
LOG_OUTPUT=file
LOG_LEVEL=INFO
LOG_DIR=logs
```

## Comandos Útiles

### Verificar Configuración Actual
```bash
# Ver variables de entorno actuales
python -c "from django.conf import settings; print('DB_TYPE:', getattr(settings, 'DB_TYPE', 'Not set'))"
python -c "from django.conf import settings; print('USE_MONGODB:', getattr(settings, 'USE_MONGODB', 'Not set'))"
python -c "from django.conf import settings; print('SESSION_BACKEND:', getattr(settings, 'SESSION_BACKEND', 'Not set'))"
python -c "from django.conf import settings; print('LOG_OUTPUT:', getattr(settings, 'LOG_OUTPUT', 'Not set'))"
python -c "from django.conf import settings; print('LOG_LEVEL:', getattr(settings, 'LOG_LEVEL', 'Not set'))"
```

### Probar Diferentes Configuraciones
```bash
# Desarrollo con SQLite
cp .env.example .env
# Editar .env con DB_TYPE=sqlite
python manage.py runserver

# Desarrollo con Docker
docker-compose --profile postgres up
```

### Migraciones entre Configuraciones
```bash
# Al cambiar de DB_TYPE, siempre ejecutar migraciones
python manage.py migrate --noinput

# Crear datos de prueba
python manage.py seed_users
python manage.py seed_data
```

## Solución de Problemas

### Error: Conexión a Base de Datos
- Verificar que `DB_TYPE` coincide con la configuración
- Para PostgreSQL Docker, verificar que el contenedor está corriendo
- Para Neon, verificar que `DATABASE_URL` incluye `sslmode=require`

### Error: Correos no enviados
- Verificar `EMAIL_BACKEND` configuration
- Para SMTP, verificar credenciales y puerto
- Para Gmail, usar contraseña de aplicación

### Error: MongoDB no conecta
- Verificar que `USE_MONGODB=true`
- Verificar que `MONGODB_URI` es correcta
- Para Atlas, verificar IP whitelist

### Error: Sesiones no persisten
- Verificar `SESSION_BACKEND` configuration
- Para Redis, verificar que el servicio está corriendo
- Verificar `REDIS_URL` es correcta
