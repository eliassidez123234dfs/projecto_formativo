# 09. Despliegue en la nube

Esta guía documenta el proceso completo para desplegar el proyecto usando exclusivamente
servicios con plan gratuito permanente (sin tarjeta de crédito, sin trials que expiran).

## 1. Arquitectura de despliegue

| Componente | Servicio | Plan |
|---|---|---|
| Frontend (React + Vite) | Vercel | Hobby (gratis) |
| Backend API (Django + DRF) | Render — Web Service | Free |
| Microservicio Tshirt3D | Render — Web Service (o Static Site si solo sirve build de Three.js) | Free |
| Base de datos SQL | Neon o Supabase (PostgreSQL) | Free |
| Base de datos NoSQL | MongoDB Atlas | M0 (Free) |
| Media (imágenes, estampados, modelos 3D) | Cloudinary | Free |
| Monitoreo de errores | Sentry | Developer (Free) |

**Importante:** Railway ya no ofrece plan gratuito permanente (desde 2023 solo da un trial
de $5 en créditos y después cobra). No se usa en este proyecto por esa razón.

**Regla general de actualización:** cada servicio queda conectado directo al repositorio de
GitHub. Un `git push` a la rama configurada dispara un redeploy automático. **No se crea un
proyecto nuevo cuando cambia el código o la arquitectura** — se actualiza el mismo servicio,
salvo que se decida migrar de plataforma o separar un microservicio que antes iba junto.

---

## 2. GitHub

### 2.1 Estructura de ramas (Gitflow adaptado a 4 personas)

```
main        → producción (lo que está desplegado)
develop     → integración (lo próximo a liberar)
feature/*   → una rama por historia de usuario/tarea
release/*   → estabilización antes de pasar a main
hotfix/*    → arreglos urgentes directo sobre main
```

### 2.2 Configuración inicial

1. Crear el repositorio en GitHub (si no existe) y subir el proyecto.
2. Crear la rama `develop` a partir de `main`:
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```
3. **Settings → Branches → Branch protection rules**: proteger `main` y `develop`
   - Require pull request before merging
   - Require al menos 1 aprobación (de otro integrante del equipo)
4. **Settings → Collaborators**: agregar a los 4 integrantes con permiso de escritura.

### 2.3 GitHub Student Developer Pack

Con los 4 correos institucionales, activar el pack en cada uno:
`https://education.github.com/pack` → verificar con correo `.edu`. Los beneficios exactos
(créditos en otras plataformas, dominios gratis, etc.) cambian con el tiempo — revisarlos
directamente al activar la cuenta.

---

## 3. Frontend en Vercel

### 3.1 Conexión del proyecto

1. Crear cuenta en [vercel.com](https://vercel.com) con GitHub (login directo, sin formulario).
2. **Add New → Project** → seleccionar el repositorio.
3. **Root Directory**: `frontend` (el monorepo tiene backend y frontend juntos, hay que
   indicarle a Vercel que solo construya esa carpeta).
4. **Framework Preset**: Vite (Vercel lo detecta automático al ver `vite.config.js`).
5. **Build Command**: `npm run build` (por defecto).
6. **Output Directory**: `dist` (por defecto en Vite).

### 3.2 Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Valor | Entorno |
|---|---|---|
| `VITE_API_URL` | `https://tu-backend.onrender.com/api` | Production |
| `VITE_CLOUDINARY_CLOUD_NAME` | tu cloud name de Cloudinary | Production, Preview |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | nombre del preset unsigned | Production, Preview |
| `VITE_SENTRY_DSN` | DSN del proyecto React en Sentry | Production |
| `VITE_TSHIRT3D_URL` | URL del microservicio 3D en Render | Production |

> Cualquier variable que empiece con `VITE_` queda incluida en el build final del navegador.
> **Nunca** pongas ahí una API secret (esas solo van en el backend).

### 3.3 Deploy y ramas

- `main` → Production deploy automático.
- Cualquier otra rama o Pull Request → Preview deploy con URL única (útil para que el equipo
  revise una feature antes de aprobarla).
- No se requiere ninguna acción manual adicional: cada push reconstruye y republica solo.

---

## 4. Backend en Render

### 4.1 Crear el Web Service

1. Crear cuenta en [render.com](https://render.com) con GitHub.
2. **New → Web Service** → seleccionar el repositorio.
3. **Root Directory**: `backend`.
4. **Runtime**: Docker (Render detecta el `Dockerfile` en `backend/Dockerfile`).
5. **Instance Type**: Free.
6. **Branch**: `main`.

### 4.2 Variables de entorno (Render → Environment)

| Variable | Ejemplo / origen |
|---|---|
| `DEBUG` | `False` |
| `SECRET_KEY` | generar una clave nueva, nunca reusar la de desarrollo |
| `ALLOWED_HOSTS` | `tu-backend.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | `https://tu-frontend.vercel.app` |
| `DATABASE_URL` | connection string de Neon/Supabase (ver sección 5) |
| `MONGO_URI` | connection string de MongoDB Atlas (ver sección 6) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | del panel de Cloudinary |
| `SENTRY_DSN` | DSN del proyecto Django en Sentry |
| `ENVIRONMENT` | `production` |

### 4.3 Build & Start command

Si el Dockerfile ya define el `entrypoint.sh`, Render lo usa directo. Verificar que ese script
corra las migraciones antes de levantar el servidor:

```bash
# entrypoint.sh
python manage.py migrate --noinput
python manage.py collectstatic --noinput
gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
```

`$PORT` lo inyecta Render automáticamente — no se hardcodea el puerto.

### 4.4 Cold starts (limitación del free tier)

El servicio se "duerme" tras 15 minutos sin tráfico y tarda 30-60 segundos en responder la
primera petición después de eso. Es esperable en un plan gratuito; menciónalo en la
sustentación como limitación conocida y no como bug. No afecta la lógica ni los datos.

### 4.5 Microservicio Tshirt3D

Repetir el mismo proceso creando un **segundo Web Service** con:
- **Root Directory**: `microservices/Tshirt3D`
- Variables de entorno propias (URL del backend principal si necesita consumir su API, URL
  de Cloudinary para los modelos `.glb`).

Esto mantiene la separación de microservicios también en el despliegue, no solo en el código.

---

## 5. Base de datos SQL — Neon o Supabase

Cualquiera de las dos cubre las necesidades del proyecto. Elegir una:

- **Neon**: mejor si la base de datos va a estar mayormente inactiva entre sesiones de
  desarrollo (escala a cero, no consume cuota cuando nadie la usa).
- **Supabase**: mejor si además quieren aprovechar su panel de administración visual de
  tablas o su Auth integrado más adelante.

### 5.1 Neon

1. Crear cuenta en [neon.tech](https://neon.tech) con GitHub.
2. **Create Project** → elegir región cercana (ej. `us-east`).
3. Copiar el **Connection String** que aparece en el dashboard (formato
   `postgresql://usuario:password@host/dbname?sslmode=require`).
4. Pegarlo como `DATABASE_URL` en Render (sección 4.2).

### 5.2 Supabase

1. Crear cuenta en [supabase.com](https://supabase.com) con GitHub.
2. **New Project** → definir contraseña de base de datos (guardarla, no se vuelve a mostrar).
3. **Project Settings → Database → Connection string** → copiar el modo `URI`.
4. Pegarlo como `DATABASE_URL` en Render.

> Free tier de Supabase pausa el proyecto tras 1 semana sin actividad — se reactiva con un
> clic desde el dashboard, no se pierden datos.

### 5.3 Django

```python
# config/settings.py
import dj_database_url

DATABASES = {
    'default': dj_database_url.config(
        default=os.environ.get('DATABASE_URL'),
        conn_max_age=600,
        ssl_require=True,
    )
}
```

```bash
pip install dj-database-url psycopg2-binary
```

---

## 6. Base de datos NoSQL — MongoDB Atlas

Se usa para datos que no son transaccionales ni relacionales: configuración guardada de
diseños del editor 3D (posición del estampado, color, textura, capas) y/o registro de
eventos de uso del editor.

### 6.1 Crear el cluster

1. Crear cuenta en [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Build a Database → M0 (Free)** → elegir proveedor/región (cualquiera cercana).
3. **Database Access**: crear un usuario con contraseña (no usar el usuario admin de la
   cuenta para la aplicación).
4. **Network Access**: agregar `0.0.0.0/0` (permitir acceso desde cualquier IP) — es
   necesario porque Render no tiene IP fija en el free tier. En un entorno real de producción
   con presupuesto se restringiría a IPs específicas.
5. **Connect → Drivers → Python** → copiar el connection string.

### 6.2 Variables de entorno

```
MONGO_URI=mongodb+srv://usuario:password@cluster0.xxxxx.mongodb.net/nombre_db?retryWrites=true&w=majority
```

### 6.3 Conexión desde Django

```bash
pip install pymongo
```

```python
# apps/models3d/mongo.py
from pymongo import MongoClient
from django.conf import settings

_client = MongoClient(settings.MONGO_URI)
db = _client.get_default_database()

disenos_collection = db["disenos_3d"]
eventos_collection = db["eventos_editor"]
```

```python
# ejemplo de uso en una vista
disenos_collection.insert_one({
    "usuario_id": request.user.id,
    "producto_id": producto.id,
    "configuracion": {
        "color": "azul",
        "estampado_public_id": "disenios/usuario123_arte",
        "posicion": {"x": 0.5, "y": 0.2},
        "escala": 1.2,
    },
    "creado_en": datetime.utcnow(),
})
```

---

## 7. Checklist final antes de sustentar

- [ ] `DEBUG = False` en el backend desplegado.
- [ ] `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS` apuntando a las URLs reales de Vercel/Render.
- [ ] Todas las API keys/secrets están en variables de entorno de cada plataforma, no en el
      código ni en el repositorio.
- [ ] `.env` y `.env.example` — el primero en `.gitignore`, el segundo sí versionado como
      plantilla sin valores reales.
- [ ] Migraciones de Postgres corridas en la base de datos de producción (Neon/Supabase).
- [ ] Cluster de MongoDB Atlas accesible y colecciones creadas.
- [ ] Un push de prueba a `main` dispara los tres redeploys (Vercel, Render backend, Render
      Tshirt3D) sin intervención manual.
- [ ] Sentry recibiendo eventos de prueba desde ambos entornos (backend y frontend).
