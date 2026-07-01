# =============================================================================
#  ARCHIVO: urls.py
#  PROPÓSITO: Enrutamiento centralizado del proyecto "Red Estampación".
#             Actúa como Front Controller / Router — todas las peticiones HTTP
#             entran por aquí y se despachan al controlador o vista adecuados.
#
#  PATRÓN DE DISEÑO: Front Controller / Router
#  - La configuración de URLs es el punto de entrada único de la aplicación.
#  - DefaultRouter (DRF) implementa el patrón Router generando automáticamente
#    endpoints CRUD (list, create, retrieve, update, partial_update, destroy)
#    a partir de los ViewSets registrados, más un api-root con todas las rutas.
#  - Las rutas de módulos específicos se incluyen con include() para mantener
#    la modularidad y separación de responsabilidades por app.
#
#  REQUERIMIENTOS CUBIERTOS:
#  - RF-001 a RF-042: Todos los flujos funcionales se enrutan aquí.
#  - RN-001 a RN-019: Las rutas reflejan las reglas de negocio del sistema.
# =============================================================================

# ── Django Core ──
# admin:        Panel de administración Django (restringido por RN-019).
# path, include:  Funciones para definir rutas URL e incluir sub-módulos.
# redirect:     Redirección HTTP (usado en verificación de email).
# settings:     Acceso a constantes del proyecto (FRONTEND_URL, MEDIA_URL, etc).
# static:       Sirve archivos multimedia localmente en desarrollo.
# JsonResponse: Retorna respuestas HTTP en formato JSON (health_check).
# timezone:     Manejo de fechas/horas con zona horaria configurada.
from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.utils import timezone

# ── Personalización del Admin (RN-019) ──
# Sobrescribe admin.site.has_permission para restringir el acceso al panel
# de administración exclusivamente a superusuarios con estado 'Activo'.
# La implementación está en config/admin_site.py.
import config.admin_site  # noqa: F401

# ── Vistas del Panel de Desarrollador ──
from config.views import dev_landing, dev_dashboard

# ── DRF Router — Generación Automática de Rutas REST ──
# DefaultRouter: Al registrar un ViewSet, crea automáticamente los endpoints
# list, create, retrieve, update, partial_update y destroy, más un api-root
# que lista todas las rutas disponibles. Sigue el patrón Router de DRF.
from rest_framework.routers import DefaultRouter

# ── JWT — Autenticación Stateless (RF-008, RN-013) ──
# TokenObtainPairView:  Recibe credenciales y emite access + refresh tokens.
# TokenRefreshView:     Renueva el access token usando el refresh token válido.
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView
)

# ── ViewSets de Usuarios (RF-001, RF-002, RF-003, RF-005) ──
# RegistroViewSet:  Registro de nuevos usuarios con validaciones y envío de email.
# LoginViewSet:     Inicio de sesión con verificación de credenciales.
# UsuarioViewSet:   CRUD del perfil del usuario autenticado (consultar/editar).
from apps.users.api.viewset import (
    RegistroViewSet,
    LoginViewSet,
    UsuarioViewSet
)

# ── ViewSets Administrativos (RF-035, RF-037) ──
# AdminUsuarioViewSet: CRUD de usuarios para administración (solo superusuarios).
# AdminStatsViewSet:   Dashboard con métricas y estadísticas del sistema.
from apps.users.api.admin_viewset import AdminUsuarioViewSet
from apps.users.api.stats_viewset import AdminStatsViewSet

# ── MongoDB — Persistencia No Relacional ──
# SavedDesignViewSet:       Diseños 3D guardados por los usuarios (RF-025).
# AuditLogViewSet:          Registro de auditoría (event sourcing / trazabilidad, RN-018).
# CartSessionViewSet:       Carritos de compra persistentes en MongoDB.
# CommunityTemplateViewSet: Plantillas 3D compartidas por la comunidad (RF-027).
from apps.users.api.mongo_views import (
    SavedDesignViewSet,
    AuditLogViewSet,
    CartSessionViewSet,
    CommunityTemplateViewSet,
)

# ── Landing / Contacto (RF-010) ──
# ContactoViewSet: Formulario de contacto público del sitio web.
from apps.landing.api.viewset import ContactoViewSet

# ── Modelo de Verificación de Email (RN-004) ──
# Token_Verificacion: Almacena tokens de verificación con fecha de expiración.
# Se usa en el flujo de confirmación de correo electrónico al registrarse.
from apps.users.models import Token_Verificacion

# =============================================================================
#  Router Principal (DefaultRouter)
#  DefaultRouter genera automáticamente las rutas estándar de un ViewSet
#  (list, create, retrieve, update, partial_update, destroy) más un endpoint
#  api-root que lista todas las rutas disponibles. Cada registro asocia un
#  prefijo de URL con su ViewSet correspondiente.
# =============================================================================
router = DefaultRouter()

# -------------------------------------------------------------------
#  Autenticación y Usuarios
#  Registro, inicio de sesión, CRUD de usuarios y rutas administrativas
#  para gestión de usuarios y estadísticas del sistema.
# -------------------------------------------------------------------
router.register(r'auth', RegistroViewSet, basename='auth')
router.register(r'login', LoginViewSet, basename='login')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'admin/usuarios', AdminUsuarioViewSet, basename='admin-usuario')
router.register(r'admin/stats', AdminStatsViewSet, basename='admin-stats')

# -------------------------------------------------------------------
#  Landing / Contacto
#  Endpoint público para el formulario de contacto del sitio.
# -------------------------------------------------------------------
router.register(r'contacto', ContactoViewSet, basename='contacto')

# -------------------------------------------------------------------
#  MongoDB — Datos No Relacionales
#  - designs: diseños 3D guardados por los usuarios.
#  - audit-logs: logs de auditoría para trazabilidad (event sourcing).
#  - cart-sessions: carritos de compra persistentes en MongoDB.
#  - templates: plantillas 3D compartidas por la comunidad.
# -------------------------------------------------------------------
router.register(r'designs', SavedDesignViewSet, basename='saved-design')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'cart-sessions', CartSessionViewSet, basename='cart-session')
router.register(r'templates', CommunityTemplateViewSet, basename='community-template')

# =============================================================================
#  Vista de Verificación de Correo Electrónico
#  Endpoint público que recibe un token vía GET, valida su vigencia y marca
#  el usuario como verificado. Redirige al frontend con el resultado.
# =============================================================================
def verificar_email_directo(request):
    token = request.GET.get('token', '')
    if not token:
        return redirect(f"{settings.FRONTEND_URL}/login?error=token-no-encontrado")
    try:
        token_obj = Token_Verificacion.objects.get(
            token=token,
            tipo='Verificacion_Email',
            usado=False
        )
        if timezone.now() > token_obj.fecha_expiracion:
            return redirect(f"{settings.FRONTEND_URL}/login?error=token-expirado")
        usuario = token_obj.usuario
        usuario.email_verificado = True
        usuario.estado = 'Activo'
        usuario.save()
        token_obj.usado = True
        token_obj.save()
        return redirect(f"{settings.FRONTEND_URL}/login?verified=1")
    except Token_Verificacion.DoesNotExist:
        return redirect(f"{settings.FRONTEND_URL}/login?error=token-invalido")

# =============================================================================
#  Health Check — Supervisión de Servicios
#  Endpoint de monitoreo usado por Render, Docker, y otros orquestadores
#  para verificar que la aplicación y sus dependencias responden.
#  Retorna estado de: aplicación, base de datos PostgreSQL y MongoDB.
#  Cumple con RN-019 (monitoreo de infraestructura).
# =============================================================================
def health_check(request):
    # ── Estado de la Base de Datos PostgreSQL ──
    db_status = 'ok'
    db_error = None
    try:
        from django.db import connections
        connections['default'].cursor().execute('SELECT 1')
    except Exception as e:
        db_status = 'error'
        db_error = str(e)

    # ── Estado de MongoDB (si está configurado) ──
    mongo_status = 'not_configured'
    try:
        from pymongo import MongoClient
        from django.conf import settings
        if hasattr(settings, 'MONGO_URI') and settings.MONGO_URI:
            client = MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
            client.admin.command('ping')
            mongo_status = 'ok'
            client.close()
    except Exception:
        mongo_status = 'error'

    overall_status = 'ok' if db_status == 'ok' else 'degraded'

    data = {
        'status': overall_status,
        'timestamp': timezone.now().isoformat(),
        'services': {
            'application': 'ok',
            'database': db_status,
            'mongodb': mongo_status,
        },
        'version': getattr(settings, 'APP_VERSION', '1.0.0'),
        'environment': 'production' if not settings.DEBUG else 'development',
    }
    if db_error:
        data['services']['database_error'] = db_error

    status_code = 200 if overall_status == 'ok' else 503
    return JsonResponse(data, status=status_code)

urlpatterns = [
    # -------------------------------------------------------------------
    #  Health Check — Supervisión
    # -------------------------------------------------------------------
    path('api/health/', health_check, name='health-check'),

    # -------------------------------------------------------------------
    #  Panel de Administración Django
    #  Accesible solo para superusuarios (restringido en admin_site.py).
    # -------------------------------------------------------------------
    path('admin/', admin.site.urls),

    # -------------------------------------------------------------------
    #  Verificación de Correo Electrónico
    #  Ruta pública que recibe el token de verificación enviado por email
    #  y redirige al frontend con el resultado (verified=1 o error=...).
    # -------------------------------------------------------------------
    path('api/auth/verificar-email/', verificar_email_directo, name='verificar-email-directo'),

    # -------------------------------------------------------------------
    #  API REST — Router Principal
    #  Incluye todas las rutas registradas en el DefaultRouter (auth,
    #  usuarios, landing, MongoDB).
    # -------------------------------------------------------------------
    path('api/', include(router.urls)),

    # -------------------------------------------------------------------
    #  JWT — Autenticación Stateless
    #  token_obtain_pair: emite access + refresh token al iniciar sesión.
    #  token_refresh: renueva el access token usando el refresh token.
    # -------------------------------------------------------------------
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # -------------------------------------------------------------------
    #  Productos — CRUD y operaciones de inventario
    # -------------------------------------------------------------------
    path('api/products/', include('apps.products.api.urls')),

    # -------------------------------------------------------------------
    #  Catálogo — Navegación, filtros y búsqueda de productos
    # -------------------------------------------------------------------
    path('api/catalog/', include('apps.catalog.api.urls')),

    # -------------------------------------------------------------------
    #  Modelos 3D — Gestión de archivos .glb/.gltf y vistas previas
    # -------------------------------------------------------------------
    path('api/models3d/', include('apps.models3d.api.urls')),

    # -------------------------------------------------------------------
    #  Carrito de Compras — Gestión del carrito activo del usuario
    # -------------------------------------------------------------------
    path('api/cart/', include('apps.carts.api.urls')),

    # -------------------------------------------------------------------
    #  Carrito — Rutas administrativas (ver carritos de todos los usuarios)
    # -------------------------------------------------------------------
    path('api/admin/carts/', include('apps.carts.api.admin_urls')),

    # -------------------------------------------------------------------
    #  Checkout — Proceso de pago e integración con Wompi
    # -------------------------------------------------------------------
    path('api/checkout/', include('apps.checkout.urls')),

    # -------------------------------------------------------------------
    #  Órdenes — Historial y estado de pedidos (usuario y admin)
    # -------------------------------------------------------------------
    path('api/orders/', include('apps.orders.api.urls')),
    path('api/admin/orders/', include('apps.orders.api.admin_urls')),

    # -------------------------------------------------------------------
    #  Panel de Desarrollador
    #  Redirección de raíz al admin + landing informativa y dashboard.
    # -------------------------------------------------------------------
    path('', lambda r: redirect('admin:index'), name='root-redirect'),
    path('dev/landing/', dev_landing, name='dev-landing'),
    path('dev/dashboard/', dev_dashboard, name='dev-dashboard'),
]

# -------------------------------------------------------------------
#  Archivos Multimedia en Desarrollo
#  Sirve los archivos de MEDIA_ROOT a través de MEDIA_URL cuando DEBUG=True.
#  En producción Cloudinary se encarga del almacenamiento y servido.
# -------------------------------------------------------------------

# Media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
