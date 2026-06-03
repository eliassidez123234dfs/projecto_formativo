from rest_framework import serializers
from ..models import Model3D, Model3DImage


class Model3DImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Model3DImage
        fields = (
            'id',
            'cloudinary_url',
            'cloudinary_public_id',
            'is_main',
            'order',
            'created_at'
        )
        read_only_fields = ('id', 'created_at', 'cloudinary_public_id')


class Model3DSerializer(serializers.ModelSerializer):
    preview_images = Model3DImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Model3D
        fields = (
            'id',
            'name',
            'description',
            'cloudinary_url',
            'cloudinary_public_id',
            'file_type',
            'file_size',
            'is_active',
            'is_approved',
            'preview_images',
            'created_at',
            'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'cloudinary_public_id')


class Model3DCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializador para crear/actualizar modelos 3D
    """
    class Meta:
        model = Model3D
        fields = (
            'name',
            'description',
            'cloudinary_url',
            'cloudinary_public_id',
            'file_type',
            'file_size',
            'is_active',
            'is_approved'
        )
