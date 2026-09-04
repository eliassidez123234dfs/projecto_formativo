# =============================================================================
#  ARCHIVO: settings.py
#  PROPÓSITO: Configuración principal del proyecto Django "Red Estampación".
#             Define todos los parámetros del framework: apps instaladas,
#             middleware, bases de datos (SQLite/PostgreSQL + MongoDB),
#             autenticación JWT, pasarela de pagos Wompi, almacenamiento
#             Cloudinary, correo electrónico, CORS, seguridad HTTP, etc.
#
#  PATRÓN DE DISEÑO: Config Object / Strategy
#  - La configuración se lee desde variables de entorno (django-environ),
#    siguiendo el patrón de separación de configuración del código
#    (Externalized Configuration — 12 Factor App).
#  - Los valores cambian según el entorno (desarrollo/producción) sin
#    modificar el código fuente (Strategy de entorno).
#
#  REQUERIMIENTOS CUBIERTOS:
#  - RF-001: Registro de usuarios (config de auth, JWT)
#  - RF-008: Inicio de sesión con JWT (SIMPLE_JWT config)
#  - RF-039: Integración con Wompi (WOMPI_* variables)
#  - RF-042: Almacenamiento Cloudinary (CLOUDINARY_STORAGE)
#  - RN-013: Tokens JWT con rotación y blacklist
#  - RN-014: Rate limiting en APIs (DRF throttling)
#  - RN-015: CORS restringido a orígenes permitidos
#  - RN-016: HTTPS forzado (HSTS) en producción
#  - RN-017: Cabeceras de seguridad HTTP (CSP, XSS, Content-Type)
#  - RI-001 a RI-030: Requisitos de información cubiertos por models y config
# =============================================================================

from pathlib import Path
from typing import Any
import os
import sys

# ── django-environ: lectura de variables de entorno ──
# Patrón Externalized Configuration (12 Factor App).
# Los secretos y valores específicos del entorno se inyectan desde .env,
# evitando datos sensibles en el repositorio.
import environ

env: Any = environ.Env()

BASE_DIR = Path(__file__).resolve().parent.parent
environ.Env.read_env(BASE_DIR.parent / '.env')

# =============================================================================
#  NÚCLEO DE SEGURIDAD: SECRET_KEY, DEBUG, ALLOWED_HOSTS
#  SECRET_KEY: Firma criptográfica de sesiones, CSRF, tokens (nunca exponer).
#  DEBUG: False en producción por seguridad (nunca mostrar trazas).
#  ALLOWED_HOSTS: Lista blanca de dominios que pueden servir la app.
# =============================================================================

# ── MODO DE OPERACIÓN ──
ENVIRONMENT = env('ENVIRONMENT', default='development')

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=[])

# =============================================================================
#  APLICACIONES INSTALADAS — ARQUITECTURA MODULAR
#  Organizadas en 4 grupos conceptuales:
#  1. DJANGO_APPS — Núcleo del framework (admin, auth, sesiones, etc.)
#  2. PROJECT_APPS — Módulos de negocio (usuarios, productos, carrito, etc.)
#  3. THIRD_PARTY_APPS — Librerías externas (DRF, JWT, CORS)
#  4. CLOUDINARY_APPS — Almacenamiento en la nube (condicional)
#
#  PATRÓN DE DISEÑO: Modular Monolith (Módulos con baja cohesión cruzada).
#  Cada PROJECT_APP es un módulo independiente con sus propios modelos,
#  vistas, serializadores y URLs. Las dependencias entre módulos se
#  resuelven vía ForeignKeys y llamadas a servicios en apps.users (mongo_service).
# =============================================================================

# ── Módulo base de Django ──
# Proporciona admin, autenticación, sesiones HTTP, mensajes flash,
# content types (relaciones genéricas) y archivos estáticos.
DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

# ── Módulos del negocio ──
# Cada app implementa un dominio específico con alta cohesión interna
# y bajo acoplamiento externo:
# - users:      Gestión de usuarios, autenticación JWT, auditoría, MongoDB
# - products:   Catálogo de productos, variantes, imágenes, reseñas
# - landing:    Formulario de contacto y página de aterrizaje
# - orders:     Pedidos, facturación, ciclo de vida de órdenes
# - carts:      Carrito de compras (sesión anónima y usuario autenticado)
# - catalog:    Navegación, búsqueda, filtros, categorías
# - checkout:   Proceso de pago e integración con Wompi
# - models3d:   Modelos 3D (GLB/GLTF) almacenados en Cloudinary
PROJECT_APPS = [
    'apps.users',
    'apps.products',
    'apps.landing',
    'apps.orders',
    'apps.carts',
    'apps.catalog',
    'apps.checkout',
    'apps.models3d',
    'apps.monitoring',
]

# ── Dependencias externas ──
# - corsheaders:   Middleware para CORS (Cross-Origin Resource Sharing).
#                  Permite que el frontend React (otro origen) consuma la API.
# - rest_framework: Django REST Framework. Capa de API REST sobre Django.
#                   Proporciona ViewSets, Serializadores, Autenticación, etc.
# - simplejwt:     Autenticación stateless basada en JSON Web Tokens (JWT).
#                  token_blacklist: permite revocar tokens (logout, rotación).
# 
# PATRÓN DE DISEÑO: 
# - DRF ViewSets implementan el patrón Resource/Endpoint (cada modelo =
#   un conjunto de endpoints REST).
# - SimpleJWT implementa el patrón Token Authentication (el servidor no
#   mantiene sesión; el cliente presenta un token firmado).
THIRD_PARTY_APPS = [
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'cloudinary_storage',
    'cloudinary',
]

# ── CKEditor (Editor de texto enriquecido) ──
# Configuración del editor WYSIWYG para descripciones de productos
# y contenido administrable desde el panel de admin de Django.
CKEDITOR_CONFIGS = {
    'default': {
        'toolbar': 'Custom',
        'toolbar_Custom': [
            ['Bold', 'Italic', 'Underline'],
            ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock'],
            ['Link', 'Unlink'],
            ['RemoveFormat', 'Source']
        ],
        'autoParagraph': False
    }
}   

CKEDITOR_UPLOAD_PATH = "/media/"

# Fusión final de todas las apps instaladas
INSTALLED_APPS = DJANGO_APPS + PROJECT_APPS + THIRD_PARTY_APPS

# =============================================================================
#  CACHÉ — REDIS (PRODUCCIÓN) / MEMORIA LOCAL (DESARROLLO)
#  Configuración flexible según SESSION_BACKEND:
#  - 'redis': usa Redis como caché y sesiones
#  - 'cached_db': caché Redis + persistencia en DB
#  - 'django_db': solo base de datos Django (sin Redis)
#
#  RN-020: Tolerancia a fallos del sistema de caché.
# =============================================================================
SESSION_BACKEND = env('SESSION_BACKEND', default='django_db')

if SESSION_BACKEND in ['redis', 'cached_db']:
    REDIS_URL = env('REDIS_URL', default='redis://localhost:6379/0')
    INSTALLED_APPS += ['django_redis']
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': REDIS_URL,
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'projecto_formativo',
        }
    }
    if SESSION_BACKEND == 'cached_db':
        SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'
    else:
        SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
else:
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'unique-snowflake',
        }
    }
    SESSION_ENGINE = 'django.contrib.sessions.backends.db'


# =============================================================================
#  CELERY — TAREAS ASÍNCRONAS
#  Delegate tareas pesadas a workers separados para no bloquear el
#  hilo principal de Django (envío de emails, procesamiento 3D, auditoría).
#  OWASP A04:2021 — Reduce superficie de ataque al procesar input offline.
#  OWASP A05:2021 — Broker solo accesible dentro de la red Docker.
# =============================================================================

CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/1')
CELERY_RESULT_BACKEND = env('REDIS_URL', default='redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'America/Bogota'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 300          # 5 min máximo por tarea
CELERY_TASK_SOFT_TIME_LIMIT = 240     # Warning a los 4 min
CELERY_WORKER_PREFETCH_MULTIPLIER = 1 # Prefetch justo 1 tarea (fair scheduling)
CELERY_WORKER_MAX_TASKS_PER_CHILD = 100  # Reciclar worker después de 100 tareas


# =============================================================================
#  MIDDLEWARE — CADENA DE PROCESAMIENTO HTTP
#  Cada middleware es un "filtro" por el que pasa toda petición/respuesta.
#  El orden es CRUCIAL: las capas externas (seguridad, CORS, request ID)
#  deben ejecutarse antes que las internas (sesión, auth, mensajes).
#
#  PATRÓN DE DISEÑO: Chain of Responsibility / Pipeline
#  Cada middleware decide si procesa la request, la modifica, o la pasa
#  al siguiente. La respuesta viaja en sentido inverso por la misma cadena.
#
#  Flujo (orden de ejecución):
#  1. RequestIDMiddleware — Asigna UUID único a cada request (trazabilidad)
#  2. CorsMiddleware — Cabeceras CORS para peticiones cross-origin
#  3. SecurityMiddleware — HTTPS, HSTS, cabeceras de seguridad básicas
#  4. SessionMiddleware — Restaura/crea sesión vía cookie
#  5. CommonMiddleware — URL rewriting y redirects
#  6. CsrfViewMiddleware — Protección CSRF en formularios POST
#  7. AuthenticationMiddleware — Asocia request.user (sesión Django)
#  8. MessageMiddleware — Mensajes flash entre requests
#  9. XFrameOptionsMiddleware — Protección contra clickjacking (X-Frame-Options)
#  10. ContentSecurityPolicyMiddleware — CSP personalizada (previene XSS)
#  11. ExceptionLoggingMiddleware — Captura y logea excepciones no manejadas
#
#  RN-017: Seguridad HTTP (HSTS, CSP, XSS, Content-Type)
# =============================================================================
MIDDLEWARE = [
    'apps.users.middleware.RequestIDMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.users.middleware.ContentSecurityPolicyMiddleware',
    'apps.users.middleware.ExceptionLoggingMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'config/templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

AUTH_USER_MODEL = 'users.Usuario'

# =============================================================================
#  BASE DE DATOS PRINCIPAL — Configuración flexible
#  DB_TYPE: sqlite | postgres_local | postgres_docker | neon
#   - 'sqlite': base de datos local SQLite (desarrollo rápido)
#   - 'postgres_local': PostgreSQL instalado localmente
#   - 'postgres_docker': PostgreSQL en contenedor Docker
#   - 'neon': PostgreSQL en la nube (Neon)
#
#  REQUERIMIENTOS:
#  - RI-001 a RI-019: Persistencia de usuarios, tokens, auditoría
#  - RI-020 a RI-028: Persistencia de productos, pedidos, carritos
#  - RI-030: Persistencia de formularios de contacto
#  - RI-031: Persistencia de modelos 3D
#
#  PATRÓN DE DISEÑO: Repository (acceso a DB via ORM Django).
# =============================================================================

DB_TYPE = env('DB_TYPE', default='sqlite')

if DB_TYPE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif DB_TYPE in ['postgres_local', 'postgres_docker', 'neon']:
    DATABASE_URL = env('DATABASE_URL', default='')
    if DATABASE_URL:
        DATABASES = {
            'default': env.db('DATABASE_URL'),
        }
        DATABASES['default']['ATOMIC_REQUESTS'] = True
    else:
        # Fallback a SQLite si no hay DATABASE_URL
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
else:
    # Fallback por defecto
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# =============================================================================
#  Validadores de Contraseña
#  Reglas de seguridad obligatorias: el usuario no puede usar atributos
#  personales, la contraseña debe tener longitud mínima, no puede ser una
#  contraseña común ni completamente numérica.
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
# configurar ahora donde se encuentra el static root
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
STATIC_URL = '/static/' # contienen css, js esto se crea automaticamente cuando hagamos lo de react

#ahora se indica donde se van a guardar las imagenes de media
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
MEDIA_URL = '/media/' # la imagen se guarda en una url (local) o CDN (Cloudinary)

# Cloudinary configuration (imágenes de productos)
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': env('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': env('CLOUDINARY_API_SECRET', default=''),
}

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

import cloudinary
cloudinary.config(
    cloud_name=CLOUDINARY_STORAGE['CLOUD_NAME'],
    api_key=CLOUDINARY_STORAGE['API_KEY'],
    api_secret=CLOUDINARY_STORAGE['API_SECRET'],
    secure=True,
) 


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =============================================================================
#  DJANGO REST FRAMEWORK (DRF) — CAPA DE API REST
#  Configuración global de todas las APIs HTTP del sistema.
#
#  PATRÓN DE DISEÑO: 
#  - ViewSet/ModelViewSet: cada endpoint REST se asigna a métodos CRUD
#    sobre un modelo (list, create, retrieve, update, destroy).
#  - Serializer: traduce datos entre modelos Python y JSON/HTTP.
#    Actúa como Translator (capa de presentación ↔ capa de dominio).
#  - Authentication/ Permission: implementan Strategy de seguridad.
#    Se puede cambiar el esquema de auth sin modificar las vistas.
#
#  COMPONENTES CONFIGURADOS:
#  - EXCEPTION_HANDLER: Manejador personalizado que produce respuestas
#    JSON uniformes con código de error, mensaje, severidad y requestId.
#    Ver error_handler.py líneas 47-86.
#  - DEFAULT_PERMISSION_CLASSES: AllowAny por defecto. El control de
#    acceso se implementa por vista (IsAuthenticated, AdminPermission).
#  - DEFAULT_AUTHENTICATION_CLASSES: JWT personalizado (con token_version)
#    + sesión Django (para el admin / browsable API en desarrollo).
#  - DEFAULT_PAGINATION_CLASS: PageNumberPagination, 20 ítems/página.
#  - DEFAULT_THROTTLE_CLASSES: Rate limiting por usuario y anónimo.
#    RN-014: Límites de 1000 req/h (anónimo) y 10000 req/h (autenticado).
#  - DEFAULT_RENDERER_CLASSES: Solo JSON (sin navegador API HTML en prod).
# =============================================================================
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'apps.users.error_handler.custom_exception_handler',

    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],

    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.users.api.auth_backend.UsuarioJWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],

    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,

    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],

    'DEFAULT_THROTTLE_RATES': {
        'anon': '1000/hour',
        'user': '10000/hour',
        'contact_form': '3/hour',
        'client_errors': '30/minute',
    }
}

# =============================================================================
#  JWT (JSON WEB TOKENS) — RN-013, RF-008
#  Autenticación stateless: el servidor NO guarda sesión; el cliente
#  presenta un token JWT firmado que contiene la identidad del usuario.
#
#  PATRÓN DE DISEÑO: Token-Based Authentication (Stateless).
#  - ACCESS_TOKEN_LIFETIME=15min: vida corta para minimizar daño si se filtra.
#  - REFRESH_TOKEN_LIFETIME=7días: permite renovar sin pedir credenciales.
#  - ROTATE_REFRESH_TOKENS=True: cada renovación genera un nuevo refresh.
#  - BLACKLIST_AFTER_ROTATION=True: el refresh anterior se invalida (logout).
#  - UPDATE_LAST_LOGIN: registra fecha_ultima_sesion en cada login.
#  - ALGORITHM=HS256: HMAC con SHA-256, simétrico (firmado con SECRET_KEY).
#  - token_version: campo personalizado en Usuario que permite invalidar
#    TODOS los tokens de un usuario (cambio de estado, bloqueo).
#    Ver auth_backend.py líneas 24-26.
# =============================================================================
from datetime import timedelta

SIMPLE_JWT = {
    # RN-013: Access token corto (15 min) para limitar ventana de uso si es robado.
    # OWASP API2:2023 — Broken Authentication
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JTI_CLAIM': 'jti',
    'TOKEN_TYPE_CLAIM': 'token_type',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_USER_CLASS': 'apps.users.Usuario',
}

# =============================================================================
#  CORS (CROSS-ORIGIN RESOURCE SHARING) — RN-015
#  Permite que el frontend React (Vite en localhost, Vercel/Render en prod)
#  consuma la API desde un ORIGEN diferente (cross-origin).
#  Sin CORS, el navegador bloquearía las peticiones por política del mismo origen.
#  CORS_ALLOW_CREDENTIALS=True habilita cookies httpOnly para JWT.
# =============================================================================
CORS_ALLOWED_ORIGINS = env.list(
    'CORS_ALLOWED_ORIGINS',
    default=[
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://192.168.1.93:5173',
        'http://192.168.137.7:5173',
    ]
)
CORS_ALLOW_CREDENTIALS = True

# =============================================================================
#  SEGURIDAD HTTP — RN-016, RN-017
#  Cabeceras que protegen contra ataques comunes:
#  - HSTS (HTTP Strict Transport Security): fuerza HTTPS por 1 año en prod.
#    SECURE_HSTS_PRELOAD: permite inclusión en lista preload de navegadores.
#  - XSS Filter: activa el filtro de Cross-Site Scripting del navegador.
#  - Content-Type NoSniff: evita MIME sniffing (ataques de polución).
#  - Referrer Policy 'same-origin': solo envía Referer al mismo origen.
#  - Cookies de sesión/CSRF:
#    * Dev (HTTP): SameSite=Lax, Secure=False
#    * Prod (HTTPS): SameSite=None, Secure=True (cookies entre dominios)
# =============================================================================
SECURE_HSTS_SECONDS = env.int('SECURE_HSTS_SECONDS', default=0 if DEBUG else 31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'

# Redirect HTTP a HTTPS en produccion (OWASP A02:2021 - Cryptographic Failures)
SECURE_SSL_REDIRECT = not DEBUG
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# SameSite/ Secure cookies: HTTP (dev) -> Lax, HTTPS (prod) -> None + Secure
if DEBUG:
    SESSION_COOKIE_SAMESITE = 'Lax'
    CSRF_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
else:
    SESSION_COOKIE_SAMESITE = 'None'
    CSRF_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# =============================================================================
#  URLs del Frontend y Backend
#  Se usan para construir enlaces en correos electrónicos (verificación,
#  restablecimiento de contraseña) y redirecciones post-pago.
# =============================================================================
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')
BACKEND_URL = env('BACKEND_URL', default='http://localhost:8000')

# =============================================================================
#  CORREO ELECTRÓNICO — EmailService
#  Soporta EMAIL_BACKEND=console|smtp o la clase Django completa en .env.
#  Usado por EmailService (services/email_service.py) para:
#  - Verificación de email al registrarse (RF-003)
#  - Recuperación de contraseña (RF-009)
#  - Notificaciones de administración (RF-018, RF-023)
#  - Notificaciones de contacto (RF-031)
# =============================================================================
_email_backend_env = env('EMAIL_BACKEND', default='').strip()
if _email_backend_env.lower() == 'console':
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
elif _email_backend_env.lower() == 'smtp':
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
elif _email_backend_env:
    EMAIL_BACKEND = _email_backend_env
else:
    if env('EMAIL_HOST_USER', default=''):
        EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    else:
        EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

EMAIL_HOST = env('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_USE_SSL = env.bool('EMAIL_USE_SSL', default=False)
EMAIL_TIMEOUT = env.int('EMAIL_TIMEOUT', default=10)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='noreply@sistema.com')

# =============================================================================
#  MONGODB — BASE DE DATOS NO RELACIONAL (POLYGLOT PERSISTENCE)
#  Configuración flexible según USE_MONGODB:
#  - 'true': habilita MongoDB para diseños 3D, logs, carritos
#  - 'false': usa solo Django ORM (PostgreSQL/SQLite)
#
#  Complementa a PostgreSQL para datos no estructurados o con esquema variable:
#  - saved_designs:  Configuraciones completas de diseños 3D (JSON anidado).
#  - audit_logs:     Logs de eventos del sistema (Event Sourcing).
#  - cart_sessions:  Carritos de compra persistentes (multi-dispositivo).
#  - community_templates: Plantillas 3D compartidas por la comunidad.
#
#  PATRÓN DE DISEÑO: Polyglot Persistence / CQRS parcial.
# =============================================================================
USE_MONGODB = env.bool('USE_MONGODB', default=False)
if USE_MONGODB:
    MONGODB_URI = env('MONGODB_URI', default='mongodb://localhost:27017/projecto_formativo')
    MONGODB_NAME = env('MONGODB_NAME', default='projecto_formativo')
else:
    MONGODB_URI = ''
    MONGODB_NAME = ''

# =============================================================================
#  REGLAS DE CONTRASEÑA — RN-001
#  Validación adicional del lado del servidor que COMPLEMENTA los
#  validadores nativos de Django. Se aplican en:
#  - Registro de usuario (RegistroSerializer.validate_contrasena)
#  - Cambio de contraseña (CambioPasswordSerializer)
#  - Recuperación de contraseña (NuevaPasswordSerializer)
#  - Creación de usuario por admin (AdminUsuarioViewSet.create)
#  Requisitos: 8+ caracteres, mayúscula, número, carácter especial.
# =============================================================================
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_NUMBER = True
PASSWORD_REQUIRE_SPECIAL = True

# =============================================================================
#  CSRF TRUSTED ORIGINS — ORÍGENES CONFIABLES
#  Lista de dominios permitidos para solicitudes POST con CSRF.
#  Necesario cuando el frontend está en un puerto/dominio diferente.
#  Sin esta configuración, Django rechazaría solicitudes POST del frontend
#  con error 403 CSRF. Incluye IPs locales de desarrollo y puertos Vite/React.
# =============================================================================
CORS_ORIGIN_WHITELIST = env.list(
    'CORS_ORIGIN_WHITELIST',
    default=[
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'http://127.0.0.1:5174',
        'http://localhost:5174',
        'http://192.168.1.93:5173',
        'http://192.168.137.7:5173',
    ]
)

CSRF_TRUSTED_ORIGINS = env.list(
    'CSRF_TRUSTED_ORIGINS',
    default=[
        'http://127.0.0.1:5173',
        'http://localhost:5173',
        'http://127.0.0.1:5174',
        'http://localhost:5174',
        'http://192.168.1.93:5173',
        'http://192.168.137.7:5173',
    ]
)

# =============================================================================
#  WOMPI — PASARELA DE PAGOS (RF-039, RF-040, RF-041)
#  Integración con Wompi, la pasarela de pagos colombiana.
#  Maneja el ciclo de pago: creación de transacción → redirección al
#  checkout de Wompi → webhook con resultado → actualización de orden.
#
#  FLUJO DE PAGO:
#  1. Frontend → create_payment() [checkout/views.py:172-237]
#     - Crea transacción en Wompi con monto, referencia, email.
#     - Wompi devuelve URL de redirección para el checkout.
#  2. Usuario → Paga en el checkout de Wompi (externo).
#  3. Wompi → Webhook POST a /api/checkout/webhook/ [views.py:294-429]
#     - Valida firma HMAC-SHA256 (verify_webhook_signature).
#     - Si APPROVED: cambia orden a "pagado".
#     - Si DECLINED/REJECTED: cambia orden a "cancelado", restaura stock.
#  4. Frontend → Consulta payment-status [views.py:240-291].
#
#  WOMPI_API_URL: Sandbox (pruebas) o producción.
#  WOMPI_INTEGRITY_KEY: Genera firma SHA-256 para integridad.
#  WOMPI_WEBHOOK_SECRET: Secreto para HMAC de webhooks.
# =============================================================================
WOMPI_PUBLIC_KEY = env('WOMPI_PUBLIC_KEY', default='')
WOMPI_PRIVATE_KEY = env('WOMPI_PRIVATE_KEY', default='')
WOMPI_INTEGRITY_KEY = env('WOMPI_INTEGRITY_KEY', default='')
WOMPI_API_URL = env('WOMPI_API_URL', default='https://sandbox.wompi.co')
WOMPI_WEBHOOK_SECRET = env('WOMPI_WEBHOOK_SECRET', default='')
WOMPI_REDIRECT_URL = env('WOMPI_REDIRECT_URL', default=f'{FRONTEND_URL}/checkout/resultado')

# =============================================================================
#  CLOUDINARY — ALMACENAMIENTO MULTIMEDIA EN LA NUBE (RF-042)
#  Configuración flexible según USE_CLOUDINARY:
#  - 'true': usa Cloudinary para almacenamiento multimedia
#  - 'false': usa almacenamiento local
#
#  Reemplaza el almacenamiento local de archivos multimedia por Cloudinary:
#  - Imágenes de productos (ProductImage)
#  - Modelos 3D (Model3D) en formato GLB/GLTF
#  - Imágenes de diseño capturadas desde el editor 3D
#  
#  Ventajas: CDN global, transformaciones de imagen (redimensionar, recortar),
#  respaldo automático, URLs optimizadas para caché.
# =============================================================================
USE_CLOUDINARY = env.bool('USE_CLOUDINARY', default=True)

CLOUDINARY_STORAGE = {
    'CLOUD_NAME': env('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': env('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': env('CLOUDINARY_API_SECRET', default=''),
}

try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api

    cloudinary.config(
        cloud_name=CLOUDINARY_STORAGE['CLOUD_NAME'],
        api_key=CLOUDINARY_STORAGE['API_KEY'],
        api_secret=CLOUDINARY_STORAGE['API_SECRET'],
        secure=True,
    )

    if USE_CLOUDINARY and CLOUDINARY_STORAGE['CLOUD_NAME'] and CLOUDINARY_STORAGE['API_KEY'] and 'test' not in sys.argv:
        STORAGES = {
            "default": {
                "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
            },
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
            },
        }
    else:
        # Fallback a almacenamiento local
        STORAGES = {
            "default": {
                "BACKEND": "django.core.files.storage.FileSystemStorage",
            },
            "staticfiles": {
                "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
            },
        }
except ImportError:
    # Fallback si cloudinary no está instalado
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

# -------------------- Logging / Monitoreo de errores --------------------
# Configuración flexible según LOG_OUTPUT y LOG_LEVEL
# LOG_OUTPUT: console | file | both
# LOG_LEVEL: DEBUG | INFO | WARNING | ERROR | CRITICAL
LOG_OUTPUT = env('LOG_OUTPUT', default='console')
LOG_LEVEL = env('LOG_LEVEL', default='INFO')
LOG_DIR = env('LOG_DIR', default='logs')

LOGS_DIR = BASE_DIR / LOG_DIR
LOGS_DIR.mkdir(exist_ok=True)

# Configurar handlers según LOG_OUTPUT
handlers_config = {
    'console': {
        'class': 'logging.StreamHandler',
        'formatter': 'verbose',
    },
}

if LOG_OUTPUT in ['file', 'both']:
    handlers_config['app_file'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'app.log'),
        'maxBytes': 5 * 1024 * 1024,
        'backupCount': 3,
        'formatter': 'verbose',
        'encoding': 'utf-8',
    }
    handlers_config['errors_file'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'errors.log'),
        'maxBytes': 5 * 1024 * 1024,
        'backupCount': 5,
        'formatter': 'verbose',
        'encoding': 'utf-8',
    }
    handlers_config['requests_file'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'requests.log'),
        'maxBytes': 5 * 1024 * 1024,
        'backupCount': 3,
        'formatter': 'verbose',
        'encoding': 'utf-8',
    }
    handlers_config['client_errors_file'] = {
        'class': 'logging.handlers.RotatingFileHandler',
        'filename': str(LOGS_DIR / 'client_errors.log'),
        'maxBytes': 5 * 1024 * 1024,
        'backupCount': 5,
        'formatter': 'verbose',
        'encoding': 'utf-8',
    }

# Configurar loggers según LOG_OUTPUT
django_handlers = []
django_request_handlers = []
django_server_handlers = []
client_errors_handlers = []
root_handlers = []

if LOG_OUTPUT in ['console', 'both']:
    django_handlers.append('console')
    client_errors_handlers.append('console')
    root_handlers.append('console')

if LOG_OUTPUT in ['file', 'both']:
    django_handlers.append('app_file')
    django_request_handlers.extend(['errors_file', 'requests_file'])
    django_server_handlers.append('requests_file')
    client_errors_handlers.append('client_errors_file')
    root_handlers.append('app_file')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} | {message}',
            'style': '{',
        },
    },
    'handlers': handlers_config,
    'loggers': {
        'django': {
            'handlers': django_handlers if django_handlers else ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'django.request': {
            'handlers': django_request_handlers if django_request_handlers else ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.server': {
            'handlers': django_server_handlers if django_server_handlers else ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        'client_errors': {
            'handlers': client_errors_handlers if client_errors_handlers else ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
        '': {
            'handlers': root_handlers if root_handlers else ['console'],
            'level': LOG_LEVEL,
        },
    },
}