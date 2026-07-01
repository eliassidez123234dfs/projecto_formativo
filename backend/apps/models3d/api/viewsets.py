# =============================================================================
# MODELOS 3D - ViewSets para gestión de modelos 3D e imágenes de preview
# =============================================================================
# Proporciona endpoints para listar, crear, actualizar y eliminar modelos 3D
# y sus imágenes de preview. Los métodos de lectura son públicos; las
# mutaciones requieren autenticación.
# =============================================================================

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from ..models import Model3D, Model3DImage
from .serializers import (
    Model3DSerializer,
    Model3DCreateUpdateSerializer,
    Model3DImageSerializer
)


class Model3DViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar modelos 3D.
    
    Provee acciones CRUD estándar más:
      - preview_images:    GET  /{pk}/preview_images/      → imágenes de un modelo
      - add_preview_image: POST /{pk}/add_preview_image/   → agregar preview
      - active:            GET  /active/                   → solo modelos activos
      - approved:          GET  /approved/                 → solo modelos aprobados y activos
    
    Permisos:
      - Lectura (list, retrieve, active, approved, preview_images): público
      - Mutación (create, update, partial_update, add_preview_image): IsAuthenticated
    """
    queryset = Model3D.objects.prefetch_related('preview_images').all()
    serializer_class = Model3DSerializer
    
    def get_serializer_class(self):
        """Retorna Model3DCreateUpdateSerializer para mutaciones,
        Model3DSerializer para lecturas.
        El serializer de creación/actualización tiene reglas de validación
        más estrictas (campos requeridos, tamaño de archivo, etc.).
        """
        if self.action in ['create', 'update', 'partial_update']:
            return Model3DCreateUpdateSerializer
        return Model3DSerializer
    
    def get_permissions(self):
        """Asigna permisos según la acción:
        - Acciones de lectura (list, retrieve, active, approved, preview_images): acceso público
        - Acciones de mutación (create, update, partial_update, add_preview_image): solo autenticados
        """
        if self.action in ['list', 'retrieve', 'active', 'approved', 'preview_images']:
            permission_classes = []
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['get'])
    def preview_images(self, request, pk=None):
        """Obtiene todas las imágenes de preview de un modelo 3D específico.
        
        Retorna lista ordenada por el campo 'order' del modelo Model3DImage.
        """
        model_3d = self.get_object()
        images = model_3d.preview_images.all()
        serializer = Model3DImageSerializer(images, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_preview_image(self, request, pk=None):
        """Agrega una imagen de preview a un modelo 3D existente.
        
        Recibe datos de imagen (cloudinary_url, is_main, order, etc.)
        y la asocia automáticamente al modelo especificado por pk.
        Retorna 201 Created con los datos de la imagen creada.
        """
        model_3d = self.get_object()
        serializer = Model3DImageSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(model_3d=model_3d)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Filtra y retorna solo los modelos 3D marcados como activos (is_active=True).
        
        Útil para mostrar en el frontend solo modelos disponibles/publicados.
        """
        queryset = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def approved(self, request):
        """Filtra y retorna modelos 3D aprobados Y activos (is_approved=True, is_active=True).
        
        Muestra solo modelos que han pasado el proceso de aprobación
        y están disponibles para visualización pública.
        """
        queryset = self.queryset.filter(is_approved=True, is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class Model3DImageViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar imágenes de preview de modelos 3D.
    
    CRUD completo sobre Model3DImage. Las acciones de lectura son
    públicas; las mutaciones requieren autenticación.
    """
    queryset = Model3DImage.objects.select_related('model_3d').all()
    serializer_class = Model3DImageSerializer
    
    def get_permissions(self):
        """Asigna permisos: lectura pública, mutaciones solo autenticados."""
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
