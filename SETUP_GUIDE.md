# 🚀 Guía Completa de Setup - Proyecto Formativo

## 📋 Requisitos Previos

Antes de empezar, asegúrate de tener instalado:

- **Python 3.11+** → [Descargar](https://www.python.org/downloads/)
- **Node.js 18+** → [Descargar](https://nodejs.org/)
- **Git** → [Descargar](https://git-scm.com/)

Verifica las versiones:
```bash
python --version
node --version
npm --version
```

---

## 🐍 Backend Setup (Django)

### 1️⃣ Navegar a la carpeta del backend

```bash
cd /home/elias/projects/proyecto_formativo/backend
```

### 2️⃣ Crear e Activar Entorno Virtual

**En Linux/macOS:**
```bash
python -m venv venv
source venv/bin/activate
```

**En Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

### 3️⃣ Instalar Dependencias

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Nota:** Se agregó `django-ratelimit==4.1.0` al archivo `requirements.txt` para limitar requests por IP

### 4️⃣ Crear Base de Datos (Migraciones)

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5️⃣ Crear Superusuario (Admin)

```bash
python manage.py createsuperuser
```

Responde las preguntas:
- Username: `admin` (o el que prefieras)
- Email: `admin@example.com`
- Password: `tu_password_seguro`

### 6️⃣ Iniciar Servidor Django

```bash
python manage.py runserver
```

✅ Backend disponible en: **http://localhost:8000**

### URLs Importantes del Backend

- 🏠 Home: http://localhost:8000/
- 🔐 Admin: http://localhost:8000/admin/ (usuario creado)
- 📡 API: http://localhost:8000/api/
- 🔑 Auth: http://localhost:8000/api/auth/registro/
- 👤 Login: http://localhost:8000/api/login/login/
- 📧 Contacto: http://localhost:8000/api/contacto/

---

## ⚛️ Frontend Setup (React + Vite)

### 1️⃣ Navegar a la carpeta del frontend (en otra terminal)

```bash
cd /home/elias/projects/proyecto_formativo/frontend
```

### 2️⃣ Instalar Dependencias

```bash
npm install
```

### 3️⃣ Iniciar Servidor de Desarrollo

```bash
npm run dev
```

✅ Frontend disponible en: **http://localhost:5173**

### Comandos Disponibles

```bash
npm run dev      # Iniciar servidor de desarrollo
npm run build    # Construir para producción
npm run preview  # Previsualizar build
npm run lint     # Ejecutar ESLint
```

---

## 🔄 Flujo Completo de Ejecución

### **Terminal 1: Backend (Puerto 8000)**
```bash
cd backend
source venv/bin/activate  # En Windows: venv\Scripts\activate
python manage.py runserver
```
Esperaras ver:
```
Starting development server at http://127.0.0.1:8000/
```

### **Terminal 2: Frontend (Puerto 5173)**
```bash
cd frontend
npm run dev
```
Esperaras ver:
```
VITE v8.0.10  ready in XXX ms

➜  Local:   http://localhost:5173/
```

---

## 🌐 Acceso a la Aplicación

Una vez que ambos servidores estén corriendo:

### **Rutas Frontend:**

| Ruta | Descripción |
|------|-------------|
| `/` | Página de inicio (Landing) |
| `/login` | Iniciar sesión |
| `/register` | Registrarse |
| `/auth` | Auth (selector login/registro) |
| `/dashboard` | Panel de usuario (requiere autenticación) |
| `/email` | Verificar email |
| `/password` | Recuperar contraseña |

### **Rutas Backend API:**

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/registro/` | POST | Registrar usuario |
| `/api/login/login/` | POST | Iniciar sesión |
| `/api/usuarios/` | GET | Listar usuarios |
| `/api/usuarios/{id}/` | GET | Detalles usuario |
| `/api/token/` | POST | Obtener JWT token |
| `/api/token/refresh/` | POST | Refrescar token |
| `/api/contacto/` | POST | Enviar mensaje contacto |

---

## 📁 Estructura de Carpetas

```
proyecto_formativo/
├── backend/
│   ├── venv/                 # Entorno virtual (crear tras instalar)
│   ├── apps/                 # Apps Django
│   ├── config/               # Configuración Django
│   ├── manage.py
│   ├── requirements.txt
│   ├── db.sqlite3            # BD SQLite (creada tras migrations)
│   └── .env                  # Variables de entorno (creado)
│
├── frontend/
│   ├── node_modules/         # Dependencias npm (crear tras instalar)
│   ├── src/
│   │   ├── pages/            # Páginas React
│   │   ├── styles/           # Estilos CSS
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── .env                  # Variables de entorno (creado)
│
└── README.md                 # Documentación principal
```

---

## 🔧 Configuración de Variables de Entorno

### Backend (.env)
Se ha creado automáticamente `/backend/.env` con:
```
SECRET_KEY=django-insecure-projecto-formativo-dev-key-local
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173,...
FRONTEND_URL=http://localhost:5173
```

**Para usar servidor de emails real:**
1. Edita `/backend/.env`
2. Cambia `EMAIL_BACKEND` de `console` a SMTP real
3. Proporciona credenciales Gmail o Sendgrid

### Frontend (.env)
Se ha creado automáticamente `/frontend/.env` con:
```
VITE_API_BASE_URL=http://localhost:8000/api/
VITE_MEDIA_URL=http://localhost:8000/media/
```

---

## ⚠️ Problemas Comunes y Soluciones

### ❌ Error: `ModuleNotFoundError: No module named 'django_ratelimit'`
**Solución:** Falta instalar dependencias
```bash
pip install -r requirements.txt
```

### ❌ Error: "Connection refused" en frontend
**Solución:** Backend no está ejecutándose. Asegúrate de tener las 2 terminales corriendo

### ❌ Error: "CORS policy" en consola
**Solución:** Verifica que `CORS_ALLOWED_ORIGINS` incluya `http://localhost:5173`

### ❌ Database locked
**Solución:** Elimina `db.sqlite3` y vuelve a hacer migrations:
```bash
rm db.sqlite3
python manage.py migrate
```

### ❌ Puerto 8000 o 5173 ya en uso
**Solución:** Ejecuta con puerto diferente:
```bash
# Backend en puerto diferente
python manage.py runserver 8001

# Frontend en puerto diferente
npm run dev -- --port 5174
```

---

## 📊 Base de Datos

### Para desarrollo (por defecto):
- **SQLite** - Archivo local `db.sqlite3`
- Sin configuración adicional requerida

### Para producción (opcional):
1. Instala PostgreSQL
2. Edita `.env`:
```
DB_NAME=proyecto_formativo
DB_USER=postgres
DB_PASSWORD=tu_password
DB_HOST=localhost
DB_PORT=5432
```
3. Descomenta `DATABASES` en `settings.py`

---

## 🧪 Probar la API

### Usando curl:

**Registro:**
```bash
curl -X POST http://localhost:8000/api/auth/registro/ \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "testuser",
    "correo": "test@example.com",
    "contrasena": "Password123!",
    "confirmar_contrasena": "Password123!"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/login/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "correo": "test@example.com",
    "contrasena": "Password123!"
  }'
```

### Usando Postman:
1. Abre [Postman](https://www.postman.com/downloads/)
2. Crea request POST a `http://localhost:8000/api/auth/registro/`
3. Tab "Body" → raw JSON
4. Envía datos de usuario

---

## 🎨 Estilos CSS Corregidos

✅ **Problemas solucionados:**
- Altura mínima en formularios mobile (768px) ahora es 700px
- El contenedor `.auth-container` mantiene altura correcta en responsive
- Formularios mobile se muestran sin problemas de layout

**Archivos CSS modificados:**
- `/frontend/src/styles/Auth.css` - Media query 768px corregida
- `/frontend/src/styles/Dashboard.css` - Sin cambios (funciona correctamente)
- `/frontend/src/App.css` - Sin cambios (funciona correctamente)

---

## 📝 Resumen de Cambios

### ✅ Backend
- ✅ Agregado `django-ratelimit==4.1.0` a `requirements.txt`
- ✅ Creado archivo `.env` con configuración lista

### ✅ Frontend
- ✅ Corregido CSS responsivo en Auth.jsx
- ✅ Creado archivo `.env` con URLs de API
- ✅ Sin errores de sintaxis en componentes React

### ✅ Documentación
- ✅ Creada esta guía de setup completa
- ✅ Instrucciones para 2 terminales simultáneas

---

## 🎯 Próximos Pasos

1. ✅ Ejecutar Backend en Terminal 1
2. ✅ Ejecutar Frontend en Terminal 2
3. ✅ Acceder a http://localhost:5173
4. ✅ Registrarse y explorar la aplicación

---

## 📞 Soporte

Si tienes problemas:
1. Verifica que Python 3.11+ y Node 18+ estén instalados
2. Confirma que ambos servidores estén corriendo (2 terminales)
3. Limpia caché: `ctrl+shift+r` en navegador
4. Reinicia los servidores

---

**¡Listo! Tu aplicación está lista para desarrollar.** 🎉
