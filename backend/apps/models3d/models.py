from __future__ import annotations

from django.db import models
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError


class Model3D(models.Model):
    """
    Modelo para almacenar información de modelos 3D con URLs de Cloudinary
    """
    name = models.CharField(max_length=255, unique=True, verbose_name='Nombre del modelo')
    description = models.TextField(blank=True, null=True, verbose_name='Descripción')
    
    # URL de Cloudinary - secure_url
    cloudinary_url = models.URLField(
        max_length=500,
        verbose_name='URL Cloudinary',
        help_text='URL segura del modelo almacenado en Cloudinary'
    )
    
    # Información del archivo
    cloudinary_public_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Public ID Cloudinary',
        help_text='ID público del archivo en Cloudinary'
    )
    
    file_type = models.CharField(
        max_length=20,
        choices=[
            ('png', 'PNG'),
            ('jpg', 'JPG'),
            ('jpeg', 'JPEG'),
            ('webp', 'WEBP'),
            ('glb', 'GLB'),
            ('gltf', 'GLTF'),
            ('obj', 'OBJ'),
            ('fbx', 'FBX'),
            ('dae', 'DAE'),
        ],
        default='glb',
        verbose_name='Tipo de archivo'
    )
    
    file_size = models.BigIntegerField(
        null=True,
        blank=True,
        verbose_name='Tamaño del archivo (bytes)',
        help_text='Tamaño en bytes del archivo almacenado'
    )
    
    # Estado
    is_active = models.BooleanField(default=True, verbose_name='Activo')
    is_approved = models.BooleanField(default=False, verbose_name='Aprobado')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Actualizado el')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Modelo 3D'
        verbose_name_plural = 'Modelos 3D'
        
    def __str__(self) -> str:
        return self.name
    
    def clean(self):
        super().clean()
        if not self.name or not self.name.strip():
            raise ValidationError({'name': 'El nombre es requerido.'})
        if len(self.name) > 255:
            raise ValidationError({'name': 'El nombre no puede superar 255 caracteres.'})
        if not self.cloudinary_url or not self.cloudinary_url.strip():
            raise ValidationError({'cloudinary_url': 'La URL de Cloudinary es requerida.'})
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class CloudinaryResource(models.Model):
    """
    Modelo "fantasma" (managed=False) usado únicamente para registrar en el
    admin un apartado que lista y gestiona TODOS los recursos de Cloudinary
    (imágenes, archivos 3D raw, videos) sin crear tabla en la base de datos.
    El listado se construye en tiempo real contra la Admin API de Cloudinary.
    """
    public_id = models.CharField(max_length=255, blank=True)

    class Meta:
        managed = False
        app_label = 'models3d'
        verbose_name = 'Recurso Cloudinary'
        verbose_name_plural = 'Gestor Cloudinary'


class Model3DImage(models.Model):
    """
    Modelo para almacenar imágenes de vista previa de los modelos 3D desde Cloudinary
    """
    model_3d = models.ForeignKey(
        Model3D,
        on_delete=models.CASCADE,
        related_name='preview_images',
        verbose_name='Modelo 3D'
    )
    
    # URL de Cloudinary para imagen de preview
    cloudinary_url = models.URLField(
        max_length=500,
        verbose_name='URL Cloudinary',
        help_text='URL segura de la imagen de preview en Cloudinary'
    )
    
    cloudinary_public_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Public ID Cloudinary',
        help_text='ID público del archivo en Cloudinary'
    )
    
    is_main = models.BooleanField(default=False, verbose_name='Es imagen principal')
    order = models.PositiveSmallIntegerField(default=1, verbose_name='Orden')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Creado el')
    
    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Imagen del modelo 3D'
        verbose_name_plural = 'Imágenes del modelo 3D'
        constraints = [
            models.UniqueConstraint(
                fields=['model_3d', 'order'],
                name='unique_model3d_image_order'
            ),
        ]
    
    def __str__(self) -> str:
        return f'{self.model_3d.name} - preview {self.order}'
