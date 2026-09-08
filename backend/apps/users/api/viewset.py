"""
ViewSet de Usuarios — Módulo de autenticación y gestión de perfil.

Proporciona endpoints para:
  - Registro de nuevos usuarios con verificación de email.
  - Autenticación JWT (login/logout).
  - Recuperación de contraseña por token.
  - Gestión del perfil propio (lectura, actualización, cambio de contraseña).

Patrón de diseño: ViewSet (DRF) con acciones personalizadas (@action).
Cada ViewSet encapsula un dominio de usuario específico y maneja su
propia lógica de transacciones y comunicación por email.
"""
import logging

from rest_framework import viewsets, status, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.db import transaction
from django.db.models import Q
import secrets
from datetime import timedelta

from apps.carts.models import Cart

logger = logging.getLogger(__name__)

from ..models import (
    Usuario, Token_Verificacion, 
    Log_Auditoria, Historial_Estado_Usuario
)

from .serializers import (
    UsuarioSerializer, UsuarioDetailSerializer, RegistroSerializer,
    LoginSerializer, VerificacionEmailSerializer, ReenvioVerificacionSerializer,
    RecuperacionPasswordSerializer, NuevaPasswordSerializer,
    CambioPasswordSerializer, ActualizarPerfilSerializer, LogAuditoriaSerializer
)
from apps.users.services.email_service import EmailService


# ═══════════════════════════════════════════════════════════════════════
# RegistroViewSet — Registro, verificación y recuperación de contraseña
# ═══════════════════════════════════════════════════════════════════════
class RegistroViewSet(viewsets.ViewSet):
    """ViewSet para registro de nuevos usuarios (RF-001, RF-003, RF-009).
    
    Acciones públicas (AllowAny, con throttling anti-spam):
      - registro:              Crear cuenta + enviar email de verificación.
      - verificar_email:       Activar cuenta con token del correo.
      - reenviar_verificacion: Reenviar email de verificación (máx 3 en 24h).
      - recuperar_password:    Solicitar enlace de recuperación (token 1h).
      - nueva_password:        Establecer nueva contraseña con token.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    # ── Registro de usuario (RF-001) ──
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def registro(self, request):
        """Crea un nuevo usuario en estado 'Inactivo' con email no verificado.
        Envía email de verificación de forma asíncrona (no bloquea si falla)."""
        serializer = RegistroSerializer(data=request.data)
        if serializer.is_valid():
            with transaction.atomic():
                usuario = serializer.save()
                
                # Enviar email de verificación (no bloquea el registro si falla)
                email_enviado = self._enviar_email_verificacion(usuario)
                if not email_enviado:
                    logger.warning('No se pudo enviar email de verificación a %s', usuario.correo)
            
            return Response({
                'mensaje': 'Registro exitoso. Verifica tu correo para activar la cuenta.',
                'usuario': UsuarioSerializer(usuario).data,
                'email_enviado': email_enviado,
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ── Verificación de email (RF-009, RN-004) ──
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verificar_email(self, request):
        """Activa la cuenta marcando email_verificado=True y estado='Activo'.
        El token de un solo uso se marca como usado después de la verificación."""
        serializer = VerificacionEmailSerializer(data=request.data)
        if serializer.is_valid():
            token = serializer.validated_data['token']
            token_obj = Token_Verificacion.objects.get(token=token)
            
            usuario = token_obj.usuario
            usuario.email_verificado = True
            usuario.estado = 'Activo'  # RN-004
            usuario.save()
            
            # Marcar token como usado
            token_obj.usado = True
            token_obj.save()
            
            return Response({
                'mensaje': 'Email verificado exitosamente. Ya puedes iniciar sesión.',
                'usuario': UsuarioSerializer(usuario).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ── Reenvío de verificación (RF-003, RN-006) ──
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reenviar_verificacion(self, request):
        """Genera un nuevo token de verificación y reenvía el email.
        Límite: máximo 3 reenvíos en 24 horas por usuario (RN-006)."""
        serializer = ReenvioVerificacionSerializer(data=request.data)
        if serializer.is_valid():
            usuario = Usuario.objects.get(correo=serializer.validated_data['correo'])
            
            # Crear nuevo token
            fecha_expiracion = timezone.now() + timedelta(hours=24)
            nuevo_token = Token_Verificacion.objects.create(
                usuario=usuario,
                token=secrets.token_urlsafe(32),
                tipo='Verificacion_Email',
                fecha_expiracion=fecha_expiracion
            )
            
            # Enviar email
            if not self._enviar_email_verificacion(usuario, nuevo_token.token):
                return Response({
                    'error': 'No se pudo enviar el correo de verificación. Intenta más tarde.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'mensaje': 'Email de verificación reenviado. Revisa tu bandeja de entrada.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ── Solicitud de recuperación de contraseña (RF-002, RN-005) ──
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def recuperar_password(self, request):
        """Crea un token de recuperación (expira en 1 hora) y envía email
        con enlace al frontend para establecer nueva contraseña."""
        serializer = RecuperacionPasswordSerializer(data=request.data)
        if serializer.is_valid():
            usuario = Usuario.objects.get(correo=serializer.validated_data['correo'])
            
            # Crear token de recuperación (RN-005: expira en 1 hora)
            fecha_expiracion = timezone.now() + timedelta(hours=1)
            token = Token_Verificacion.objects.create(
                usuario=usuario,
                token=secrets.token_urlsafe(32),
                tipo='Recuperacion_Password',
                fecha_expiracion=fecha_expiracion
            )
            
            # Enviar email
            if not self._enviar_email_recuperacion(usuario, token.token):
                return Response({
                    'error': 'No se pudo enviar el correo de recuperación. Intenta más tarde.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'mensaje': 'Se ha enviado un enlace de recuperación a tu correo.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ── Establecimiento de nueva contraseña (RF-002) ──
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def nueva_password(self, request):
        """Establece la nueva contraseña usando el token de recuperación.
        Resetea intentos fallidos y desbloquea la cuenta si estaba bloqueada.
        El token se marca como usado (de un solo uso)."""
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
            
            # Marcar token como usado (RN-005: uso único)
            token_obj.usado = True
            token_obj.save()
            
            return Response({
                'mensaje': 'Contraseña actualizada exitosamente.'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ── Métodos auxiliares de email ──
    def _send_email(self, asunto, mensaje, destinatarios):
        """Envía email plano usando el servicio centralizado."""
        return EmailService.send_plain_email(asunto, mensaje, destinatarios)

    def _enviar_email_verificacion(self, usuario, token=None):
        """Construye y envía el email de verificación de cuenta.
        Si no se proporciona token, busca el más reciente no usado."""
        if not token:
            token_obj = usuario.tokens_verificacion.filter(
                tipo='Verificacion_Email',
                usado=False
            ).first()
            token = token_obj.token if token_obj else None
        
        if token:
            enlace = f"{settings.BACKEND_URL}/api/auth/verificar-email/?token={token}"
            logger.info('Enlace de verificación para %s: %s', usuario.correo, enlace)
            asunto = "Verifica tu cuenta"
            mensaje = f"""
            Hola {usuario.usuario},
            
            Para completar tu registro, haz clic en el siguiente enlace:
            {enlace}
            
            Este enlace expira en 24 horas.
            """

            return self._send_email(asunto, mensaje, [usuario.correo])

        logger.error('No se encontró token de verificación para el usuario %s', usuario.id)
        return False
    

    def _enviar_email_recuperacion(self, usuario, token):
        """Construye y envía el email de recuperación de contraseña."""
        enlace = f"{settings.FRONTEND_URL}/nueva-password?token={token}"
        asunto = "Recupera tu contraseña"
        mensaje = f"""
        Hola {usuario.usuario},
        
        Para recuperar tu contraseña, haz clic en el siguiente enlace:
        {enlace}
        
        Este enlace expira en 1 hora.
        """
        
        return self._send_email(asunto, mensaje, [usuario.correo])


# ═══════════════════════════════════════════════════════════════════════
# LoginViewSet — Autenticación JWT y migración de carrito
# ═══════════════════════════════════════════════════════════════════════
class LoginViewSet(viewsets.ViewSet):
    """ViewSet para autenticación (RF-008, RF-011, RF-012).
    
    Acciones:
      - create (POST): Login con JWT. Migra carrito anónimo al usuario.
      - logout (POST): Invalida la sesión actual.
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AnonRateThrottle]
    
    # ── Login con JWT (RF-008) ──
    def create(self, request):
        """Autentica al usuario y retorna tokens JWT.
        
        Lógica de migración de carrito:
        1. Si existe carrito de sesión (anónimo) y carrito del usuario → fusionar.
        2. Si solo existe carrito de sesión → asignarlo al usuario.
        3. Si no existe ningún carrito → crear uno nuevo.
        """
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
                        # Fusionar carrito de sesión en carrito del usuario
                        for item in session_cart.items.all():
                            existing = user_cart.items.filter(product=item.product, variant=item.variant).first()
                            if existing:
                                existing.quantity += item.quantity
                                existing.save()
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
    
    # ── Logout (RF-012) ──
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """Cierra la sesión actual rotando la clave de sesión Django."""
        request.session.cycle_key()
        return Response({
            'mensaje': 'Sesión cerrada exitosamente'
        }, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════════════
# UsuarioViewSet — Gestión del perfil propio (RF-010)
# ═══════════════════════════════════════════════════════════════════════
class UsuarioViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """ViewSet para gestión de perfil de usuario (RF-010).
    
    Solo permite acceder al perfil propio via @action, no expone CRUD.
    Acciones autenticadas (IsAuthenticated):
      - perfil:           Obtiene los datos detallados del usuario.
      - actualizar_perfil: Actualiza nombre y correo (requiere contraseña para cambio de email).
      - cambiar_password:  Cambia la contraseña (requiere contraseña actual).
    """
    queryset = Usuario.objects.filter(eliminado=False)
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # ── Lectura del perfil (RF-010) ──
    @action(detail=False, methods=['get'])
    def perfil(self, request):
        """Retorna los datos detallados del usuario autenticado."""
        usuario = request.user
        serializer = UsuarioDetailSerializer(usuario)
        return Response(serializer.data)
    
    # ── Actualización del perfil (RF-010) ──
    @action(detail=False, methods=['put', 'patch'])
    def actualizar_perfil(self, request):
        """Actualiza nombre de usuario y correo.
        Cambio de correo requiere contraseña actual (seguridad)."""
        usuario = request.user
        serializer = ActualizarPerfilSerializer(usuario, data=request.data,partial=True, context={'usuario': usuario} )
        
        if serializer.is_valid():
            usuario = serializer.save()
            return Response({
                'mensaje': 'Perfil actualizado exitosamente',
                'usuario': UsuarioSerializer(usuario).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # ── Cambio de contraseña (RF-010) ──
    @action(detail=False, methods=['post'])
    def cambiar_password(self, request):
        """Cambia la contraseña del usuario autenticado.
        Requiere la contraseña actual para confirmar la operación."""
        usuario = request.user
        serializer = CambioPasswordSerializer(data=request.data,context={'usuario': usuario})
        
        if serializer.is_valid():
            from django.contrib.auth.hashers import make_password
            usuario.contrasena = make_password(serializer.validated_data['contrasena_nueva'])
            usuario.save()
            
            return Response({
                'mensaje': 'Contraseña actualizada exitosamente'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
