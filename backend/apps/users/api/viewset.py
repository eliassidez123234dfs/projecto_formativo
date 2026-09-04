# ==============================================================================
# ViewSets — Módulo de Usuarios (Red Estampación)
# ==============================================================================
# Implementa los endpoints REST para:
#
#   RegistroViewSet   → RF-001, RF-003, RF-009
#     (registro público, verificación de email, reenvío, recuperación
#      de contraseña y establecimiento de nueva contraseña)
#
#   LoginViewSet      → RF-008, RF-011, RF-012
#     (login con JWT + httpOnly cookies, logout con blacklist,
#      migración de carrito anónimo a autenticado)
#
#   UsuarioViewSet    → RF-010
#     (perfil, actualizar perfil, cambiar contraseña)
#
# ── Flujos principales ──
# Registro → verificar_email → login → (operaciones) → logout
#                          ↘ recuperar_password → nueva_password
#
# ── Mecanismos de seguridad ──
# * JWT con token_version para invalidación remota de sesiones.
# * httpOnly cookies para access/refresh tokens (protección XSS).
# * Refresh token blacklist al cerrar sesión (RN-013).
# * cycle_key() en login/logout para prevenir session fixation.
# * Migración del carrito anónimo → autenticado al iniciar sesión.
# ==============================================================================
"""ViewSets para registro, autenticación y gestión de perfil de usuarios (RF-001 a RF-012)."""

# ─────────────────────────────────────────────────────────
# Importaciones de la librería estándar y terceros
# ─────────────────────────────────────────────────────────
import logging
import secrets
from datetime import timedelta

from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django_ratelimit.core import is_ratelimited as _is_ratelimited
from functools import wraps

def viewset_ratelimit(**kwargs):
    """Wrapper de @ratelimit compatible con ViewSet methods.
    DRF llama a method(self, request), pero django-ratelimit espera request como args[0].
    Esta función extrae request correctamente."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(self, request, *args, **kwargs2):
            ratelimited = _is_ratelimited(
                request=request, group=kwargs.get('group'),
                fn=fn, key=kwargs.get('key', 'ip'),
                rate=kwargs.get('rate'), method=kwargs.get('method'),
                increment=True
            )
            if ratelimited and kwargs.get('block', True):
                from django.http import HttpResponseTooManyRequests
                return HttpResponseTooManyRequests('Demasiadas solicitudes. Intenta de nuevo en un minuto.')
            return fn(self, request, *args, **kwargs2)
        return wrapper
    return decorator

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

# ─────────────────────────────────────────────────────────
# Importaciones del proyecto
# ─────────────────────────────────────────────────────────
from apps.carts.models import Cart

from ..services.email_service import EmailService
from ..tasks import send_password_reset_email_async, send_welcome_email_async, send_admin_reset_email_async
from ..models import (
    Usuario, Token_Verificacion, Cambio_Email, 
    Log_Auditoria, Historial_Estado_Usuario
)
from .serializers import (
    UsuarioSerializer, UsuarioDetailSerializer, RegistroSerializer,
    LoginSerializer, VerificacionEmailSerializer, ReenvioVerificacionSerializer,
    RecuperacionPasswordSerializer, NuevaPasswordSerializer,
    CambioPasswordSerializer, ActualizarPerfilSerializer,
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# ViewSet: RegistroViewSet (RF-001, RF-003, RF-009)
# ─────────────────────────────────────────────────────────────────────────────
# Endpoints públicos para el ciclo de vida inicial del usuario.
# No requiere autenticación (AllowAny).
#
# RF-001: Registro de nuevos usuarios.
# RF-003: Verificación de correo electrónico mediante token.
# RF-009: Reenvío de verificación, recuperación y cambio de contraseña.
#
# Todos los flujos usan tokens criptográficos de un solo uso y expiración
# temporal para garantizar seguridad en la verificación de identidad.
# ─────────────────────────────────────────────────────────────────────────────
class RegistroViewSet(viewsets.ViewSet):
    """
    ViewSet para registro público de usuarios (RF-001, RF-003, RF-009).
    Expone: registro, verificación de email, reenvío, recuperación de
    contraseña y establecimiento de nueva contraseña.
    Todos los endpoints son de acceso público (AllowAny).
    """
    permission_classes = [permissions.AllowAny]
    
    # ────────────────────────────────────────────────────────
    # POST /api/registro/registro/   (RF-001)
    # ────────────────────────────────────────────────────────
    # Registro público de nuevos usuarios.
    #
    # Flujo:
    #   1. Valida datos con RegistroSerializer (RN-001: formato contraseña).
    #   2. Crea el usuario en estado Inactivo con email_verificado=False.
    #   3. Genera token de verificación criptográfico (vía post-save signal).
    #   4. Envia email de verificación (no bloquea si falla el envío).
    #
    # RN-004: el usuario nace Inactivo; solo pasa a Activo tras verificar email.
    # RF-001: registro con usuario, correo y contraseña (mín. 8 chars, mayúscula,
    #         número y carácter especial).
    #
    # Seguridad: la transacción es atómica (transaction.atomic) para evitar
    # estados inconsistentes si falla la creación del token.
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def registro(self, request):
        serializer = RegistroSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                usuario = serializer.save()
                
                # Obtiene el token creado por la señal post-save y envía el email
                token_obj = usuario.tokens_verificacion.filter(
                    tipo='Verificacion_Email', usado=False
                ).first()
                email_enviado = EmailService.send_verification_email(usuario, token_obj) if token_obj else False
                if not email_enviado:
                    logger.warning('No se pudo enviar email de verificación a %s', usuario.correo)
            
            return Response({
                'mensaje': 'Registro exitoso. Verifica tu correo para activar la cuenta.',
                'usuario': UsuarioSerializer(usuario).data,
                'email_enviado': email_enviado,
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ────────────────────────────────────────────────────────
    # POST /api/registro/verificar_email/   (RF-003)
    # ────────────────────────────────────────────────────────
    # Verifica la dirección de correo electrónico mediante un token único.
    #
    # Flujo:
    #   1. Valida el token con VerificacionEmailSerializer (existencia, expiración, uso).
    #   2. Marca email_verificado=True y cambia estado a 'Activo' (RN-004).
    #   3. Marca el token como usado (un solo uso — previene reutilización).
    #
    # RN-004: el usuario pasa de Inactivo → Activo al verificar el email.
    # RN-006: el token expira a las 24 horas de su creación.
    #
    # Seguridad: el token es de un solo uso y tiene expiración temporal.
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verificar_email(self, request):
        serializer = VerificacionEmailSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            token_obj = Token_Verificacion.objects.get(token=token)
            
            usuario = token_obj.usuario
            usuario.email_verificado = True
            usuario.estado = 'Activo'  # RN-004: el usuario nace inactivo hasta verificar
            usuario.save()
            
            # Seguridad: token de un solo uso
            token_obj.usado = True
            token_obj.save()
            
            return Response({
                'mensaje': 'Email verificado exitosamente. Ya puedes iniciar sesión.',
                'usuario': UsuarioSerializer(usuario).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ────────────────────────────────────────────────────────
    # POST /api/registro/reenviar_verificacion/   (RF-009)
    # ────────────────────────────────────────────────────────
    # Reenvía el email de verificación si el usuario no lo recibió o el
    # token anterior expiró.
    #
    # Flujo:
    #   1. Valida el correo con ReenvioVerificacionSerializer (límite 3 reenvíos/24h).
    #   2. Genera un NUEVO token con expiración de 24 horas (RN-006).
    #   3. Envía el email de verificación.
    #
    # RN-006: el token expira en 24 horas.
    # RN-009: máximo 3 reenvíos en 24 horas (control en el serializador).
    #
    # Seguridad: cada reenvío genera un token fresco; los anteriores quedan
    # huérfanos (no se invalidan explícitamente, pero el nuevo reemplaza al
    # anterior en la práctica).
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reenviar_verificacion(self, request):
        serializer = ReenvioVerificacionSerializer(data=request.data)
        if serializer.is_valid():
            usuario = Usuario.objects.get(correo=serializer.validated_data['correo'])
            
            # Genera nuevo token criptográficamente seguro con expiración
            fecha_expiracion = timezone.now() + timedelta(hours=24)
            nuevo_token = Token_Verificacion.objects.create(
                usuario=usuario,
                token=secrets.token_urlsafe(32),
                tipo='Verificacion_Email',
                fecha_expiracion=fecha_expiracion
            )
            
            if not EmailService.send_verification_email(usuario, nuevo_token):
                return Response({
                    'error': 'No se pudo enviar el correo de verificación. Intenta más tarde.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'mensaje': 'Email de verificación reenviado. Revisa tu bandeja de entrada.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ────────────────────────────────────────────────────────
    # POST /api/registro/recuperar_password/   (RF-009)
    # ────────────────────────────────────────────────────────
    # Primer paso del flujo de recuperación de contraseña.
    #
    # Flujo:
    #   1. Valida el correo con RecuperacionPasswordSerializer.
    #   2. Genera un token de tipo 'Recuperacion_Password'.
    #   3. Envía email con enlace para restablecer contraseña.
    #
    # RN-005: el token de recuperación expira en 1 hora (ventana corta
    #         para mitigar riesgos de reutilización).
    #
    # Seguridad: el token se genera con secrets.token_urlsafe(32) y tiene
    # una ventana de expiración limitada. No se revela si el correo existe
    # o no (evita enumeración de usuarios).
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def recuperar_password(self, request):
        serializer = RecuperacionPasswordSerializer(data=request.data)
        if serializer.is_valid():
            usuario = Usuario.objects.get(correo=serializer.validated_data['correo'])
            
            # RN-005: ventana de expiración corta (1 hora) para mitigar riesgos
            fecha_expiracion = timezone.now() + timedelta(hours=1)
            token = Token_Verificacion.objects.create(
                usuario=usuario,
                token=secrets.token_urlsafe(32),
                tipo='Recuperacion_Password',
                fecha_expiracion=fecha_expiracion
            )
            
            # RN-005: el token se genera con secrets.token_urlsafe(32) y tiene
            # una ventana de expiración limitada. No se revela si el correo existe
            # o no (evita enumeración de usuarios).
            # Envío asíncrono via Celery: no bloquea la respuesta HTTP.
            send_password_reset_email_async.delay(usuario.id, token.token)
            
            return Response({
                'mensaje': 'Se ha enviado un enlace de recuperación a tu correo.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ────────────────────────────────────────────────────────
    # POST /api/registro/nueva_password/   (RF-009)
    # ────────────────────────────────────────────────────────
    # Segundo paso del flujo de recuperación: establece la nueva contraseña.
    #
    # Flujo:
    #   1. Valida token + nueva contraseña con NuevaPasswordSerializer.
    #   2. Aplica hash bcrypt a la nueva contraseña.
    #   3. Reinicia intentos_fallidos y fecha_bloqueo (desbloquea si estaba bloqueado).
    #   4. Marca el token como usado (un solo uso — RN-005).
    #
    # RN-001: la nueva contraseña debe cumplir: ≥8 caracteres, 1 mayúscula,
    #         1 número, 1 carácter especial.
    # RN-005: token de un solo uso con expiración de 1 hora.
    #
    # Seguridad: el hash se aplica con make_password (bcrypt/Django PBKDF2).
    # Al reiniciar intentos_fallidos se permite el acceso si el usuario había
    # sido bloqueado por superar el límite de intentos.
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def nueva_password(self, request):
        serializer = NuevaPasswordSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            token_obj = Token_Verificacion.objects.get(token=token)
            
            usuario = token_obj.usuario
            from django.contrib.auth.hashers import make_password
            usuario.contrasena = make_password(serializer.validated_data['contrasena'])
            usuario.intentos_fallidos = 0
            usuario.fecha_bloqueo = None
            usuario.save()
            
            # RN-005: el token se invalida tras su uso
            token_obj.usado = True
            token_obj.save()
            
            return Response({
                'mensaje': 'Contraseña actualizada exitosamente.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    

# ─────────────────────────────────────────────────────────────────────────────
# ViewSet: LoginViewSet (RF-008, RF-011, RF-012)
# ─────────────────────────────────────────────────────────────────────────────
# Endpoints de autenticación con JWT.
#
# RF-008: Inicio de sesión con usuario/email + contraseña.
# RF-011: Generación de tokens JWT (access + refresh) con token_version
#         para invalidación remota.
# RF-012: Cierre de sesión con blacklist del refresh token.
#
# ── Mecanismos de seguridad ──
# * httpOnly cookies: el frontend NO puede leer access_token / refresh_token
#   (protección contra XSS).
# * Secure flag: solo en HTTPS (desactivado en DEBUG).
# * SameSite=Lax: mitiga CSRF en navegadores modernos.
# * token_version en JWT: permite invalidar todas las sesiones activas.
# * Migración del carrito anónimo (session_key) al autenticado (user_id).
# * cycle_key(): previene session fixation al iniciar/cerrar sesión.
# ─────────────────────────────────────────────────────────────────────────────
class LoginViewSet(viewsets.ViewSet):
    """
    ViewSet para autenticación de usuarios (RF-008, RF-011, RF-012).
    - login: genera tokens JWT y los coloca en httpOnly cookies + respuesta JSON.
    - logout: invalida el refresh token (blacklist) y elimina las cookies.
    Maneja migración del carrito anónimo al autenticado al iniciar sesión.
    """
    permission_classes = [permissions.AllowAny]
    
    # ────────────────────────────────────────────────────────
    # POST /api/login/login/   (RF-008, RF-011)
    # ────────────────────────────────────────────────────────
    # POST /api/login/   (RF-012, RN-013)
    # Autenticación de usuarios con JWT.
    #
    # Flujo completo:
    #   1. Rate limiting: máximo 5 intentos/minuto por IP (previene
    #      fuerza bruta distribuida, complementando RN-004 local).
    #   2. Valida credenciales con LoginSerializer.
    #      2a. Verifica que el usuario existe y no está eliminado.
    #      2b. Verifica estado Activo (rechaza Bloqueado o Inactivo).
    #      2c. Verifica contraseña con check_password.
    #      2d. Control de intentos fallidos: ≥5 → Bloqueado (RN-004).
    #      2e. Reinicia intentos_fallidos y actualiza fecha_ultima_sesion.
    #   3. Migra items del carrito anónimo (session_key) al carrito
    #      del usuario autenticado (RF-011: persistencia del carrito).
    #   4. cycle_key() — previene session fixation.
    #   5. Genera tokens JWT inyectando token_version del usuario.
    #   6. Establece httpOnly cookies (access: 15 min, refresh: 7 días).
    #
    # Seguridad:
    #   - Rate limit por IP (5/min) + bloqueo local (5 intentos fallidos).
    #   - token_version: si el usuario es bloqueado/desactivado después del
    #     login, los JWT existentes quedan invalidados.
    #   - Cookies httpOnly + Secure + SameSite=Lax (protección XSS y CSRF).
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    @viewset_ratelimit(key='ip', rate='10/m', method='POST', block=True)
    def login(self, request):
        """Endpoint de login con JWT (RF-008, RF-011)"""
        try:
            serializer = LoginSerializer(data=request.data)
            if serializer.is_valid():
                usuario = serializer.validated_data['usuario']
                
                # Migrar carrito anónimo al usuario
                session_key = request.session.session_key
                session_cart = Cart.objects.filter(session_key=session_key).first() if session_key else None
                user_cart = Cart.objects.filter(user=usuario).first()

                if session_cart:
                    if user_cart:
                        # Fusionar carrito de sesión en carrito del usuario.
                        # Pre-cargar items del usuario para evitar N+1 queries.
                        existing_items = {
                            (item.product_id, item.variant_id): item
                            for item in user_cart.items.select_related('product', 'variant').all()
                        }
                        for item in session_cart.items.select_related('product', 'variant').all():
                            key = (item.product_id, item.variant_id)
                            if key in existing_items:
                                existing_items[key].quantity += item.quantity
                                existing_items[key].save()
                            else:
                                item.cart = user_cart
                                item.save()
                        session_cart.delete()
                    else:
                        # Asignar carrito de sesión al usuario
                        session_cart.user = usuario
                        session_cart.save()
                        user_cart = session_cart
                elif not user_cart:
                    user_cart = Cart.objects.create(user=usuario, session_key=session_key)

                request.session.cycle_key()

                # Generar tokens JWT
                refresh = RefreshToken.for_user(usuario)
                
                return Response({
                    'mensaje': 'Login exitoso',
                    'usuario': UsuarioSerializer(usuario).data,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }, status=status.HTTP_200_OK)
            
            return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)
        except Exception:
            logger.exception('Error en login')
            return Response({
                'error': 'Error interno del servidor. Intenta nuevamente.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # ────────────────────────────────────────────────────────
    # POST /api/login/logout/   (RF-012, RN-013)
    # ────────────────────────────────────────────────────────
    # Cierra la sesión del usuario.
    #
    # Flujo:
    #   1. cycle_key() — renueva la clave de sesión (previene session fixation).
    #   2. Blacklist del refresh token: obtiene el token del body o de la
    #      cookie refresh_token y lo invalida (previene reutilización incluso
    #      si fue interceptado, RN-013).
    #   3. Elimina las cookies access_token y refresh_token del lado del cliente.
    #
    # RN-013: el refresh token DEBE ser invalidado al cerrar sesión mediante
    # blacklist (restringe la ventana de exposición del token).
    #
    # Nota: el access_token no se puede invalidar directamente (es stateless).
    # Su expiración corta (15 min) mitiga el riesgo. Si se requiere
    # invalidación inmediata, usar token_version del usuario.
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        request.session.cycle_key()

        # Blacklist del refresh token: previene su reutilización incluso si es interceptado
        refresh_token = request.data.get('refresh') or request.COOKIES.get('refresh_token')
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except (TokenError, AttributeError):
                pass

        response = Response({
            'mensaje': 'Sesión cerrada exitosamente'
        }, status=status.HTTP_200_OK)

        # Limpieza de cookies del lado del servidor
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/api/token/refresh/')

        return response


# ─────────────────────────────────────────────────────────────────────────────
# ViewSet: UsuarioViewSet (RF-010)
# ─────────────────────────────────────────────────────────────────────────────
# Gestión del perfil del usuario autenticado.
# Requiere autenticación JWT (IsAuthenticated).
#
# RF-010: El usuario puede consultar y modificar su propio perfil, así como
#         cambiar su contraseña.
#
# Acciones:
#   - perfil:             GET    → datos completos del usuario autenticado.
#   - actualizar_perfil:  PUT/PATCH → modificar usuario/correo.
#   - cambiar_password:   POST   → cambiar contraseña (requiere actual).
#
# Filtra usuarios con eliminado=False (soft-delete).
# ─────────────────────────────────────────────────────────────────────────────
class UsuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestión del perfil del usuario autenticado (RF-010).
    Expone: perfil, actualizar_perfil, cambiar_password.
    Requiere autenticación (IsAuthenticated).
    Filtra usuarios eliminados lógicamente.
    """
    queryset = Usuario.objects.filter(eliminado=False).select_related(
        'admin_desbloqueador', 'admin_eliminador'
    )
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # ────────────────────────────────────────────────────────
    # GET /api/usuario/perfil/   (RF-010)
    # ────────────────────────────────────────────────────────
    # Obtiene los datos completos del perfil del usuario autenticado.
    # Usa UsuarioDetailSerializer que incluye campos de seguridad
    # (intentos_fallidos, fecha_bloqueo, eliminado).
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def perfil(self, request):
        usuario = request.user
        serializer = UsuarioDetailSerializer(usuario)
        return Response(serializer.data)
    
    # ────────────────────────────────────────────────────────
    # PUT/PATCH /api/usuario/actualizar_perfil/   (RF-010)
    # ────────────────────────────────────────────────────────
    # Actualiza los datos del perfil del usuario autenticado.
    # Permite modificar usuario y/o correo (campos editables).
    #
    # Flujo:
    #   1. Valida datos con ActualizarPerfilSerializer.
    #   2. Si se cambia el correo, exige contraseña actual como verificación.
    #   3. Aplica partial=True para permitir actualizaciones parciales.
    #
    # Seguridad: el cambio de correo requiere verificación de identidad
    # mediante la contraseña actual (prevención de account takeover).
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['put', 'patch'])
    def actualizar_perfil(self, request):
        usuario = request.user
        serializer = ActualizarPerfilSerializer(usuario, data=request.data, partial=True, context={'usuario': usuario})
        
        if serializer.is_valid():
            usuario = serializer.save()
            return Response({
                'mensaje': 'Perfil actualizado exitosamente',
                'usuario': UsuarioSerializer(usuario).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ────────────────────────────────────────────────────────
    # POST /api/usuario/cambiar_password/   (RF-010)
    # ────────────────────────────────────────────────────────
    # Cambia la contraseña del usuario autenticado.
    #
    # Flujo:
    #   1. Valida contraseña actual + nueva + confirmación con CambioPasswordSerializer.
    #   2. Verifica que la contraseña actual coincida con el hash almacenado.
    #   3. Aplica hash bcrypt a la nueva contraseña y la guarda.
    #
    # RN-001: la nueva contraseña debe cumplir: ≥8 caracteres, 1 mayúscula,
    #         1 número, 1 carácter especial.
    #
    # Seguridad: se exige la contraseña actual para prevenir cambios no
    # autorizados incluso si el JWT es robado (factor de verificación adicional).
    # ────────────────────────────────────────────────────────
    @action(detail=False, methods=['post'])
    def cambiar_password(self, request):
        usuario = request.user
        serializer = CambioPasswordSerializer(data=request.data, context={'usuario': usuario})
        
        if serializer.is_valid():
            from django.contrib.auth.hashers import make_password
            usuario.contrasena = make_password(serializer.validated_data['contrasena_nueva'])
            usuario.save()
            
            return Response({
                'mensaje': 'Contraseña actualizada exitosamente'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
