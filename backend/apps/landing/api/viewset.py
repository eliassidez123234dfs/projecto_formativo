import logging

# =============================================================================
# LANDING - ViewSets para el formulario de contacto (RF-030 a RF-032)
# =============================================================================
# RF-030: Formulario de contacto público
# RF-031: Envío de mensaje (con rate limiting RN-031: 3/h por IP)
# RF-032: Notificación por email al administrador (RN-032)
# =============================================================================

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

from apps.users.services.email_service import EmailService

from ..models import Contacto
from .serializers import (
    ContactoSerializer, ContactoCreateSerializer, 
    ContactoListSerializer, ContactoDetailSerializer
)


class ContactRateThrottle(AnonRateThrottle):
    """Límite de tasa para el formulario de contacto (RN-031).
    
    Máximo 3 envíos por hora por dirección IP para usuarios anónimos.
    Previene abuso del formulario (spam, ataques de fuerza bruta).
    """
    scope = 'contact_form'
    rate = '3/h'  # 3 requests per hour per IP


class ContactoViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar mensajes de contacto (RF-030, RF-031, RF-032).
    
    Acciones públicas:
      - create:  Enviar nuevo mensaje (con rate limiting por IP)
    
    Acciones de administrador (requiere autenticación):
      - list:         Listar todos los mensajes
      - retrieve:     Ver detalle de un mensaje
      - marcar_leido: Marcar como leído
      - eliminar:     Eliminar mensaje
    """
    queryset = Contacto.objects.all()
    permission_classes = [permissions.AllowAny]
    filterset_fields = ['leido']
    ordering_fields = ['fecha_envio']
    ordering = ['-fecha_envio']
    throttle_classes = [ContactRateThrottle]
    
    def get_serializer_class(self):
        """Retorna el serializer adecuado según la acción REST.
        
        - create  → ContactoCreateSerializer (solo campos de envío)
        - list    → ContactoListSerializer (resumen sin mensaje)
        - retrieve → ContactoDetailSerializer (incluye mensaje completo)
        - default → ContactoSerializer
        """
        if self.action == 'create':
            return ContactoCreateSerializer
        elif self.action == 'list': # Muestra todos los contactos
            return ContactoListSerializer
        elif self.action == 'retrieve': # Toma un contacto especifico y muestra el contenido
            return ContactoDetailSerializer
        return ContactoSerializer
    
    def get_queryset(self):
        """Filtra el queryset según permisos del usuario.
        
        Solo administradores pueden listar/ver mensajes.
        Usuarios no autenticados reciben queryset vacío.
        """
        if self.request.user and self.request.user.is_authenticated:
            # Admin puede ver todos
            if hasattr(self.request.user, 'rol') and self.request.user.rol == 'Administrador':
                return Contacto.objects.all().order_by('-fecha_envio')
        # Otros usuarios no pueden listar
        return Contacto.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Crear nuevo mensaje de contacto (RF-031, RN-031)
        Rate limiting: máximo 3 envíos por IP en 60 minutos
        """
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            # Obtener IP del cliente
            ip_origen = self._obtener_ip_cliente(request)
            
            contacto = serializer.save(ip_origen=ip_origen)
            
            # Enviar email al admin de forma asíncrona (RF-032, RN-032)
            EmailService.send_contact_notification(contacto)
            
            return Response({
                'mensaje': 'Mensaje enviado exitosamente. Nos contactaremos pronto.',
                'id': contacto.id
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def marcar_leido(self, request, pk=None):
        """Marcar mensaje como leído (admin)"""
        # Verificar permisos antes de buscar el objeto
        if not hasattr(request.user, 'rol') or request.user.rol != 'Administrador':
            return Response({
                'error': 'No tienes permiso para realizar esta acción'
            }, status=status.HTTP_403_FORBIDDEN)
        
        contacto = self.get_object()
        contacto.leido = True
        contacto.fecha_lectura = timezone.now()
        contacto.save()
        
        return Response({
            'mensaje': 'Mensaje marcado como leído'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'], permission_classes=[permissions.IsAuthenticated])
    def eliminar(self, request, pk=None):
        """Eliminar mensaje de contacto (admin)"""
        # Verificar permisos antes de buscar el objeto
        if not hasattr(request.user, 'rol') or request.user.rol != 'Administrador':
            return Response({
                'error': 'No tienes permiso para realizar esta acción'
            }, status=status.HTTP_403_FORBIDDEN)
        
        contacto = self.get_object()
        contacto.delete()
        
        return Response({
            'mensaje': 'Mensaje eliminado'
        }, status=status.HTTP_204_NO_CONTENT)
    
    def _obtener_ip_cliente(self, request):
        """Obtener IP del cliente para rate limiting"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
