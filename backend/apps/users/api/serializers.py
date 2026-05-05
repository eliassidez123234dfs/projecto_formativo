from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
import re
import uuid

from ..models import Usuario, Token_Verificacion, Cambio_Email, Log_Auditoria, Historial_Estado_Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer básico para Usuario"""
    
    class Meta:
        model = Usuario
        fields = [
            'id', 'usuario', 'correo', 'estado', 'rol', 
            'fecha_registro', 'email_verificado', 'fecha_ultima_sesion'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_ultima_sesion']


class UsuarioDetailSerializer(UsuarioSerializer):
    """Serializer detallado para Usuario"""
    
    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + [
            'intentos_fallidos', 'fecha_bloqueo', 'eliminado', 'fecha_eliminacion'
        ]


class RegistroSerializer(serializers.Serializer):
    """Serializer para el registro de nuevos usuarios (RF-001)"""
    
    usuario = serializers.CharField(max_length=100, required=True)
    correo = serializers.EmailField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    
    def validate_usuario(self, value):
        """Validar que el usuario sea único"""
        if Usuario.objects.filter(usuario=value, eliminado=False).exists():
            raise ValidationError("Este nombre de usuario ya está registrado.")
        if len(value) < 3:
            raise ValidationError("El usuario debe tener al menos 3 caracteres.")
        return value
    
    def validate_correo(self, value):
        """Validar que el correo sea único"""
        if Usuario.objects.filter(correo=value, eliminado=False).exists():
            raise ValidationError("Este correo ya está registrado.")
        return value
    
    def validate_contrasena(self, value):
        """Validar que la contraseña cumple con RN-001
        Mínimo 8 caracteres, mayúscula, número y carácter especial"""
        if len(value) < 8:
            raise ValidationError("La contraseña debe tener al menos 8 caracteres.")
        if not re.search(r'[A-Z]', value):
            raise ValidationError("La contraseña debe incluir al menos una letra mayúscula.")
        if not re.search(r'\d', value):
            raise ValidationError("La contraseña debe incluir al menos un número.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise ValidationError("La contraseña debe incluir al menos un carácter especial.")
        return value
    
    def validate(self, data):
        """Validar que las contraseñas coincidan"""
        if data['contrasena'] != data['confirmar_contrasena']:
            raise ValidationError("Las contraseñas no coinciden.")
        return data
    
    def create(self, validated_data):
        """Crear usuario nuevo (RN-004: inactivo, email no verificado)"""
        usuario = Usuario.objects.create(
            usuario=validated_data['usuario'],
            correo=validated_data['correo'],
            contrasena=make_password(validated_data['contrasena']),
            estado='Inactivo',
            email_verificado=False
        )
        
        # Crear token de verificación (RF-009)
        fecha_expiracion = timezone.now() + timedelta(hours=24)
        Token_Verificacion.objects.create(
            usuario=usuario,
            token=str(uuid.uuid4()),
            tipo='Verificacion_Email',
            fecha_expiracion=fecha_expiracion
        )
        
        return usuario


class LoginSerializer(serializers.Serializer):
    """Serializer para autenticación (RF-008)"""
    
    correo = serializers.EmailField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    
    def validate(self, data):
        """Validar credenciales"""
        try:
            usuario = Usuario.objects.get(correo=data['correo'], eliminado=False)
        except Usuario.DoesNotExist:
            raise ValidationError("Credenciales inválidas.")
        
        # Validar estado (RN-014)
        if usuario.estado == 'Bloqueado':
            raise ValidationError("Tu cuenta está bloqueada. Contacta al administrador.")
        
        if usuario.estado == 'Inactivo':
            raise ValidationError("Tu cuenta no ha sido activada. Verifica tu correo.")
        
        # Validar contraseña
        from django.contrib.auth.hashers import check_password
        if not check_password(data['contrasena'], usuario.contrasena):
            # Incrementar intentos fallidos (RN-010)
            usuario.intentos_fallidos += 1
            if usuario.intentos_fallidos >= 5:
                usuario.estado = 'Bloqueado'
                usuario.fecha_bloqueo = timezone.now()
            usuario.save()
            raise ValidationError("Credenciales inválidas.")
        
        # Reset intentos fallidos al login exitoso
        usuario.intentos_fallidos = 0
        usuario.fecha_ultima_sesion = timezone.now()
        usuario.save()
        
        data['usuario'] = usuario
        return data


class VerificacionEmailSerializer(serializers.Serializer):
    """Serializer para verificación de email (RF-009)"""
    
    token = serializers.CharField(required=True)
    
    def validate_token(self, value):
        """Validar token de verificación"""
        try:
            token_obj = Token_Verificacion.objects.get(
                token=value,
                tipo='Verificacion_Email'
            )
        except Token_Verificacion.DoesNotExist:
            raise ValidationError("Token inválido o expirado.")
        
        # Validar expiración
        if timezone.now() > token_obj.fecha_expiracion:
            raise ValidationError("El token ha expirado.")
        
        # Validar que no haya sido usado
        if token_obj.usado:
            raise ValidationError("Este token ya fue utilizado.")
        
        return value


class ReenvioVerificacionSerializer(serializers.Serializer):
    """Serializer para reenvío de email de verificación (RF-003)"""
    
    correo = serializers.EmailField(required=True)
    
    def validate_correo(self, value):
        """Validar que el usuario existe y no está verificado"""
        try:
            usuario = Usuario.objects.get(correo=value, eliminado=False)
        except Usuario.DoesNotExist:
            raise ValidationError("Usuario no encontrado.")
        
        if usuario.email_verificado:
            raise ValidationError("Este correo ya ha sido verificado.")
        
        # Validar límite de reenvíos (RN-006: máximo 3 en 24 horas)
        hace_24_horas = timezone.now() - timedelta(hours=24)
        reenvios_recientes = Token_Verificacion.objects.filter(
            usuario=usuario,
            tipo='Verificacion_Email',
            fecha_creacion__gte=hace_24_horas
        ).count()
        
        if reenvios_recientes >= 3:
            raise ValidationError("Has alcanzado el límite de reenvíos. Intenta más tarde.")
        
        return value


class RecuperacionPasswordSerializer(serializers.Serializer):
    """Serializer para solicitud de recuperación de contraseña (RF-002)"""
    
    correo = serializers.EmailField(required=True)
    
    def validate_correo(self, value):
        """Validar que el usuario existe"""
        try:
            Usuario.objects.get(correo=value, eliminado=False)
        except Usuario.DoesNotExist:
            raise ValidationError("Usuario no encontrado.")
        
        return value


class NuevaPasswordSerializer(serializers.Serializer):
    """Serializer para establecer nueva contraseña después de recuperación"""
    
    token = serializers.CharField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    
    def validate_token(self, value):
        """Validar token"""
        try:
            token_obj = Token_Verificacion.objects.get(
                token=value,
                tipo='Recuperacion_Password'
            )
        except Token_Verificacion.DoesNotExist:
            raise ValidationError("Token inválido.")
        
        if timezone.now() > token_obj.fecha_expiracion:
            raise ValidationError("El token ha expirado.")
        
        if token_obj.usado:
            raise ValidationError("Este token ya fue utilizado.")
        
        return value
    
    def validate_contrasena(self, value):
        """Validar contraseña (RN-001)"""
        if len(value) < 8:
            raise ValidationError("La contraseña debe tener al menos 8 caracteres.")
        if not re.search(r'[A-Z]', value):
            raise ValidationError("La contraseña debe incluir al menos una letra mayúscula.")
        if not re.search(r'\d', value):
            raise ValidationError("La contraseña debe incluir al menos un número.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise ValidationError("La contraseña debe incluir al menos un carácter especial.")
        return value
    
    def validate(self, data):
        if data['contrasena'] != data['confirmar_contrasena']:
            raise ValidationError("Las contraseñas no coinciden.")
        return data


class CambioPasswordSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña autenticado (RF-010)"""
    
    contrasena_actual = serializers.CharField(max_length=255, required=True, write_only=True)
    contrasena_nueva = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    
    def validate_contrasena_actual(self, value):
        usuario = self.context.get('usuario')
        from django.contrib.auth.hashers import check_password
        if not check_password(value, usuario.contrasena):
            raise ValidationError("Contraseña actual incorrecta.")
        return value
    
    def validate_contrasena_nueva(self, value):
        if len(value) < 8:
            raise ValidationError("La contraseña debe tener al menos 8 caracteres.")
        if not re.search(r'[A-Z]', value):
            raise ValidationError("La contraseña debe incluir al menos una letra mayúscula.")
        if not re.search(r'\d', value):
            raise ValidationError("La contraseña debe incluir al menos un número.")
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            raise ValidationError("La contraseña debe incluir al menos un carácter especial.")
        return value
    
    def validate(self, data):
        if data['contrasena_nueva'] != data['confirmar_contrasena']:
            raise ValidationError("Las contraseñas no coinciden.")
        return data


class ActualizarPerfilSerializer(serializers.ModelSerializer):
    """Serializer para actualizar perfil de usuario (RF-010)"""
    
    contrasena_actual = serializers.CharField(
        max_length=255, 
        required=False, 
        write_only=True,
        help_text="Requerido para cambiar correo o contraseña"
    )
    
    class Meta:
        model = Usuario
        fields = ['usuario', 'correo', 'contrasena_actual']
        read_only_fields = ['id']
    
    def validate(self, data):
        usuario = self.context.get('usuario')
        
        # Si cambia correo, requiere contraseña actual
        if 'correo' in data and data['correo'] != usuario.correo:
            if 'contrasena_actual' not in data:
                raise ValidationError("Debes ingresar tu contraseña actual para cambiar el correo.")
        
        return data


class LogAuditoriaSerializer(serializers.ModelSerializer):
    """Serializer para visualizar logs de auditoría (RF-024)"""
    
    usuario_admin = UsuarioSerializer(read_only=True)
    usuario_afectado = UsuarioSerializer(read_only=True)
    
    class Meta:
        model = Log_Auditoria
        fields = [
            'id', 'usuario_admin', 'usuario_afectado', 'accion',
            'datos_anteriores', 'datos_nuevos', 'fecha_accion', 'ip_admin'
        ]
        read_only_fields = fields
