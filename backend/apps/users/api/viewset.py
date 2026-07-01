import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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
    Usuario, Token_Verificacion, Cambio_Email, 
    Log_Auditoria, Historial_Estado_Usuario
)

from .serializers import (
    UsuarioSerializer, UsuarioDetailSerializer, RegistroSerializer,
    LoginSerializer, VerificacionEmailSerializer, ReenvioVerificacionSerializer,
    RecuperacionPasswordSerializer, NuevaPasswordSerializer,
    CambioPasswordSerializer, ActualizarPerfilSerializer, LogAuditoriaSerializer
)


class RegistroViewSet(viewsets.ViewSet):
    """ViewSet para registro de nuevos usuarios (RF-001, RF-003, RF-009)"""
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def registro(self, request):
        """Endpoint de registro (RF-001)"""
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
    
    # Funcion la cual verifica el email
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def verificar_email(self, request):
        """Endpoint para verificar email (RF-009)"""
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
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def reenviar_verificacion(self, request):
        """Endpoint para reenviar email de verificación (RF-003, RN-006)"""
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
    

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def recuperar_password(self, request):
        """Endpoint para solicitar recuperación de contraseña (RF-002)"""
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
    

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def nueva_password(self, request):
        """Endpoint para establecer nueva contraseña (RF-002)"""
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
    

    def _send_email(self, asunto, mensaje, destinatarios):
        try:
            send_mail(
                asunto,
                mensaje,
                settings.DEFAULT_FROM_EMAIL,
                destinatarios,
                fail_silently=False
            )
            return True
        except Exception as exc:
            logger.exception('Error al enviar email a %s: %s', destinatarios, exc)
            return False

    def _enviar_email_verificacion(self, usuario, token=None):
        """Enviar email de verificación"""
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
        """Enviar email de recuperación de contraseña"""
        enlace = f"{settings.FRONTEND_URL}/nueva-password?token={token}"
        asunto = "Recupera tu contraseña"
        mensaje = f"""
        Hola {usuario.usuario},
        
        Para recuperar tu contraseña, haz clic en el siguiente enlace:
        {enlace}
        
        Este enlace expira en 1 hora.
        """
        
        return self._send_email(asunto, mensaje, [usuario.correo])


class LoginViewSet(viewsets.ViewSet):
    """ViewSet para autenticación (RF-008, RF-011, RF-012)"""
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
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
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """Endpoint de logout (RF-012, RN-013)"""
        request.session.cycle_key()
        return Response({
            'mensaje': 'Sesión cerrada exitosamente'
        }, status=status.HTTP_200_OK)


class UsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de perfil de usuario (RF-010)"""
    queryset = Usuario.objects.filter(eliminado=False)
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    

    @action(detail=False, methods=['get'])
    def perfil(self, request):
        """Obtener datos del perfil del usuario autenticado"""
        usuario = request.user
        serializer = UsuarioDetailSerializer(usuario)
        return Response(serializer.data)
    
    
    @action(detail=False, methods=['put', 'patch'])
    def actualizar_perfil(self, request):
        """Actualizar perfil del usuario (RF-010)"""
        usuario = request.user
        serializer = ActualizarPerfilSerializer(usuario, data=request.data,partial=True, context={'usuario': usuario} )
        
        if serializer.is_valid():
            usuario = serializer.save()
            return Response({
                'mensaje': 'Perfil actualizado exitosamente',
                'usuario': UsuarioSerializer(usuario).data
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def cambiar_password(self, request):
        """Cambiar contraseña del usuario autenticado (RF-010)"""
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
