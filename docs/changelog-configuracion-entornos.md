# Changelog - Configuración de Entornos

## Fecha: 19 de Agosto de 2026

### Cambios Realizados

#### 1. Configuración Flexible de Entornos (.env)

**Archivos Modificados:**
- `.env.example` - Plantilla de configuración
- `.env` - Configuración actual del proyecto
- `microservices/Tshirt3D/.env.example` - Plantilla del microservicio
- `microservices/Tshirt3D/.env` - Configuración actual del microservicio

**Nuevas Variables de Entorno:**

**Modo de Operación:**
- `ENVIRONMENT`: development | staging | production

**Base de Datos SQL:**
- `DB_TYPE`: sqlite | postgres_local | postgres_docker | neon
- Permite seleccionar entre SQLite (desarrollo rápido), PostgreSQL local/Docker, o Neon (producción)

**Correo Electrónico:**
- `EMAIL_BACKEND`: console | smtp
- Configuración flexible para desarrollo (console) o producción (smtp)

**MongoDB:**
- `USE_MONGODB`: true | false
- Habilita/deshabilita MongoDB opcionalmente

**Sesiones:**
- `SESSION_BACKEND`: django_db | redis | cached_db
- Configuración flexible de almacenamiento de sesiones

**Cloudinary:**
- `USE_CLOUDINARY`: true | false
- Habilita/deshabilita almacenamiento en la nube

**Logging y Monitoria:**
- `LOG_OUTPUT`: console | file | both
  - `console`: muestra logs solo en terminal (desarrollo)
  - `file`: guarda logs en archivos (producción)
  - `both`: muestra en terminal y guarda en archivos
- `LOG_LEVEL`: DEBUG | INFO | WARNING | ERROR | CRITICAL
- `LOG_DIR`: directorio para archivos de log (default: logs)

#### 2. Actualización de settings.py

**Archivo Modificado:** `backend/config/settings.py`

**Cambios:**
- Integración de variables de entorno para configuración dinámica
- Sistema flexible de selección de base de datos según `DB_TYPE`
- Sistema de sesiones configurable según `SESSION_BACKEND`
- MongoDB opcional según `USE_MONGODB`
- Cloudinary opcional según `USE_CLOUDINARY`
- Configuración dinámica de logging según `LOG_OUTPUT` y `LOG_LEVEL`

#### 3. Actualización de docker-compose.yml

**Archivo Modificado:** `docker-compose.yml`

**Cambios:**
- Agregados perfiles Docker para diferentes configuraciones:
  - `--profile sqlite`: Desarrollo rápido con SQLite
  - `--profile postgres`: PostgreSQL en Docker
  - `--profile redis`: Redis para caché/sesiones
  - `--profile mongodb`: MongoDB para datos NoSQL
  - `--profile full`: Configuración completa de producción
- Servicio `backend-sqlite` para desarrollo sin dependencias
- Servicios adicionales: Redis y MongoDB con health checks

#### 4. Documentación

**Archivo Creado:** `docs/configuracion-entornos.md`

**Contenido:**
- Guía completa de configuración de entornos
- Ejemplos de configuración para desarrollo y producción
- Guía de comandos Docker Compose
- Solución de problemas comunes
- Documentación de logging y monitoria

#### 5. Configuración de Gitignore

**Archivos Modificados:**
- `.gitignore` - Comentarios de configuración de .env
- `microservices/Tshirt3D/.gitignore` - Configuración de .env

**Cambios:**
- Comentarios actualizados para reflejar nueva configuración flexible

#### 6. Limpieza de Logs

**Acción Realizada:**
- Eliminados archivos de log antiguos en `backend/logs/`:
  - app.log
  - errors.log
  - requests.log
  - client_errors.log

**Configuración Actual:**
- `LOG_OUTPUT=both` - Logs en terminal y archivos
- `LOG_LEVEL=INFO` - Nivel de log informativo
- `LOG_DIR=logs` - Directorio para archivos de log

### Configuración Actual del Proyecto

**Entorno:** Development
**Base de Datos:** Neon (PostgreSQL en la nube)
**MongoDB:** Habilitado (Atlas)
**Sesiones:** Django DB
**Cloudinary:** Habilitado
**Correo:** SMTP (Gmail)
**Logging:** Both (terminal + archivos)

### Beneficios de los Cambios

1. **Flexibilidad:** Configuración completa desde `.env` sin modificar código
2. **Desarrollo Rápido:** Permite usar SQLite para desarrollo local
3. **Producción Robusta:** Configuración optimizada para Neon, MongoDB Atlas, Cloudinary
4. **Logging Configurable:** Control total sobre dónde y cómo se muestran los logs
5. **Docker Profiles:** Facilita despliegue en diferentes configuraciones
6. **Documentación Completa:** Guías detalladas para cada configuración

### Comandos Útiles

**Verificar configuración actual:**
```bash
python -c "from django.conf import settings; print('DB_TYPE:', getattr(settings, 'DB_TYPE', 'Not set'))"
python -c "from django.conf import settings; print('LOG_OUTPUT:', getattr(settings, 'LOG_OUTPUT', 'Not set'))"
```

**Probar diferentes configuraciones:**
```bash
# Desarrollo con SQLite
docker-compose --profile sqlite up

# Producción completa
docker-compose --profile full up
```

### Notas

- Los archivos `.env` y `.env.backup` no se suben al repositorio (configuración en `.gitignore`)
- Las credenciales sensibles (Neon, MongoDB Atlas, Cloudinary, Gmail) se mantienen en `.env`
- Los archivos de log se generan automáticamente según configuración
- La configuración de logging usa RotatingFileHandler con rotación automática (5MB máximo)
