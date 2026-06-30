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
    """
    ViewSet para gestionar modelos 3D
    """
    queryset = Model3D.objects.prefetch_related('preview_images').all()
    serializer_class = Model3DSerializer
    
    def get_serializer_class(self):
        """Return create/update serializer for mutation, read serializer otherwise."""
        if self.action in ['create', 'update', 'partial_update']:
            return Model3DCreateUpdateSerializer
        return Model3DSerializer
    
    def get_permissions(self):
        """Allow unauthenticated access for read/list actions; require auth for mutations."""
        if self.action in ['list', 'retrieve', 'create', 'active', 'approved', 'preview_images']:
            permission_classes = []
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['get'])
    def preview_images(self, request, pk=None):
        """
        Obtener todas las imágenes de preview de un modelo 3D
        """
        model_3d = self.get_object()
        images = model_3d.preview_images.all()
        serializer = Model3DImageSerializer(images, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_preview_image(self, request, pk=None):
        """
        Agregar una imagen de preview a un modelo 3D
        """
        model_3d = self.get_object()
        serializer = Model3DImageSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(model_3d=model_3d)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """
        Obtener solo los modelos 3D activos
        """
        queryset = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def approved(self, request):
        """
        Obtener solo los modelos 3D aprobados
        """
        queryset = self.queryset.filter(is_approved=True, is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class Model3DImageViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar imágenes de modelos 3D
    """
    queryset = Model3DImage.objects.select_related('model_3d').all()
    serializer_class = Model3DImageSerializer
    
    def get_permissions(self):
        """Allow unauthenticated access for read actions; require auth for mutations."""
        if self.action in ['list', 'retrieve']:
            permission_classes = []
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
