from rest_framework import serializers
from django.core.exceptions import ValidationError
from ..models import Contacto


class ContactoSerializer(serializers.ModelSerializer):
    """Serializer para el modelo Contacto (RI-030)"""
    
    class Meta:
        model = Contacto
        fields = [
            'id', 'nombre', 'correo', 'asunto', 'mensaje',
            'ip_origen', 'fecha_envio', 'leido', 'fecha_lectura'
        ]
        read_only_fields = ['id', 'ip_origen', 'fecha_envio', 'leido', 'fecha_lectura']


class ContactoCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear mensajes de contacto (RF-031)"""
    
    class Meta:
        model = Contacto
        fields = ['nombre', 'correo', 'asunto', 'mensaje']
    
    def validate_nombre(self, value):
        if len(value.strip()) < 2:
            raise ValidationError("El nombre debe tener al menos 2 caracteres.")
        return value
    
    def validate_mensaje(self, value):
        if len(value.strip()) < 10:
            raise ValidationError("El mensaje debe tener al menos 10 caracteres.")
        return value


class ContactoListSerializer(serializers.ModelSerializer):
    """Serializer para listar contactos (admin)"""
    
    class Meta:
        model = Contacto
        fields = [
            'id', 'nombre', 'correo', 'asunto', 'mensaje', 'fecha_envio', 'leido'
        ]


class ContactoDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para contactos (admin)"""
    
    class Meta:
        model = Contacto
        fields = '__all__'
