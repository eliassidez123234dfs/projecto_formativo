"""ViewSets for user registration, authentication, and profile management (RF-001 to RF-012)."""

import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.db.models import Q
import secrets
from datetime import timedelta

from apps.carts.models import Cart

from ..services.email_service import EmailService

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
            if not EmailService.send_verification_email(usuario, nuevo_token):
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
            if not EmailService.send_password_reset_email(usuario, token):
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
    


class LoginViewSet(viewsets.ViewSet):
    """ViewSet para autenticación (RF-008, RF-011, RF-012)"""
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def login(self, request):
        """Endpoint de login con JWT (RF-008, RF-011)"""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.validated_data['usuario']

        # Migrar carrito anónimo al usuario y ciclar sesión
        if request.session.session_key:
            session_cart = Cart.objects.filter(session_key=request.session.session_key).first()
            if session_cart:
                user_cart = Cart.objects.filter(user=usuario).first()
                if not user_cart:
                    user_cart = Cart.objects.create(user=usuario)
                for item in session_cart.items.all():
                    existing = user_cart.items.filter(product=item.product, variant=item.variant).first()
                    if existing:
                        existing.quantity += item.quantity
                        existing.save()
                    else:
                        item.cart = user_cart
                        item.save()
                if not session_cart.user or session_cart.user_id != usuario.id:
                    session_cart.delete()
        request.session.cycle_key()

        # Generar tokens JWT con token_version
        refresh = RefreshToken.for_user(usuario)
        refresh['token_version'] = usuario.token_version
        access_token = refresh.access_token
        access_token['token_version'] = usuario.token_version

        response = Response({
            'mensaje': 'Login exitoso',
            'usuario': UsuarioSerializer(usuario).data,
            'access': str(access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)

        # Establecer cookies httpOnly para los tokens
        secure = not settings.DEBUG
        response.set_cookie(
            'access_token', str(access_token),
            max_age=900, httponly=True, secure=secure, samesite='Lax',
            path='/'
        )
        response.set_cookie(
            'refresh_token', str(refresh),
            max_age=604800, httponly=True, secure=secure, samesite='Lax',
            path='/api/token/refresh/'
        )

        return response
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def logout(self, request):
        """Endpoint de logout (RF-012, RN-013) - invalida token JWT"""
        request.session.cycle_key()

        # Blacklistear el refresh token si se envía en el body o cookie
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

        # Eliminar cookies de tokens
        response.delete_cookie('access_token', path='/')
        response.delete_cookie('refresh_token', path='/api/token/refresh/')

        return response


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
