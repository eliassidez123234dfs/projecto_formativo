from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
import re
import secrets

from ..models import Usuario, Token_Verificacion, Cambio_Email, Log_Auditoria, Historial_Estado_Usuario
from ..exceptions import (
    EmailAlreadyExistsException,
    UsernameAlreadyExistsException,
    InvalidEmailException,
    InvalidPasswordFormatException,
    EmptyFieldException,
    DatabaseConstraintException,
)


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 'usuario', 'correo', 'estado', 'rol',
            'fecha_registro', 'email_verificado', 'fecha_ultima_sesion'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_ultima_sesion']


class UsuarioDetailSerializer(UsuarioSerializer):
    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + [
            'intentos_fallidos', 'fecha_bloqueo', 'eliminado', 'fecha_eliminacion'
        ]


class RegistroSerializer(serializers.Serializer):
    usuario = serializers.CharField(max_length=100, required=True)
    correo = serializers.EmailField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    def validate_usuario(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('El nombre de usuario es obligatorio.')
        if len(value) < 3:
            raise serializers.ValidationError('El usuario debe tener al menos 3 caracteres.')
        if Usuario.objects.filter(usuario=value).exists():
            ex = UsernameAlreadyExistsException(context={'field': 'usuario', 'value': value})
            raise serializers.ValidationError(ex.user_message)
        return value

    def validate_correo(self, value):
        if not value or not value.strip():
            raise EmptyFieldException('correo', user_message='El correo es obligatorio.')
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            ex = InvalidEmailException(context={'field': 'correo', 'value': value})
            raise serializers.ValidationError(ex.user_message)
        if Usuario.objects.filter(correo=value).exists():
            ex = EmailAlreadyExistsException(context={'field': 'correo', 'value': value})
            raise serializers.ValidationError(ex.user_message)
        return value

    def validate_contrasena(self, value):
        if not value:
            raise EmptyFieldException('contrasena', user_message='La contraseña es obligatoria.')
        errors = []
        if len(value) < 8:
            errors.append('Mínimo 8 caracteres.')
        if not re.search(r'[A-Z]', value):
            errors.append('Debe incluir una mayúscula.')
        if not re.search(r'\d', value):
            errors.append('Debe incluir un número.')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            errors.append('Debe incluir un carácter especial.')
        if errors:
            ex = InvalidPasswordFormatException(
                ' | '.join(errors),
                user_message=' | '.join(errors),
                context={'field': 'contrasena'}
            )
            raise serializers.ValidationError(ex.user_message)
        return value

    def validate(self, data):
        if data.get('contrasena') != data.get('confirmar_contrasena'):
            raise serializers.ValidationError('Las contraseñas no coinciden.')
        return data

    def create(self, validated_data):
        try:
            usuario = Usuario.objects.create(
                usuario=validated_data['usuario'],
                correo=validated_data['correo'],
                contrasena=make_password(validated_data['contrasena']),
                estado='Inactivo',
                email_verificado=False
            )
        except IntegrityError as e:
            ex = DatabaseConstraintException(
                str(e),
                user_message='Error al crear el usuario. Intenta de nuevo.',
                context={'error': str(e)}
            )
            if 'usuario' in str(e):
                ex = UsernameAlreadyExistsException(context={'field': 'usuario'})
            elif 'correo' in str(e):
                ex = EmailAlreadyExistsException(context={'field': 'correo'})
            raise serializers.ValidationError(ex.user_message)

        fecha_expiracion = timezone.now() + timedelta(hours=24)
        Token_Verificacion.objects.create(
            usuario=usuario,
            token=secrets.token_urlsafe(32),
            tipo='Verificacion_Email',
            fecha_expiracion=fecha_expiracion
        )

        return usuario


class LoginSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    def validate(self, data):
        try:
            usuario = Usuario.objects.get(correo=data['correo'], eliminado=False)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError('Credenciales inválidas.')

        if usuario.estado == 'Bloqueado':
            raise serializers.ValidationError('Tu cuenta está bloqueada. Contacta al administrador.')

        if usuario.estado == 'Inactivo':
            raise serializers.ValidationError('Tu cuenta no ha sido activada. Verifica tu correo.')

        if not check_password(data['contrasena'], usuario.contrasena):
            if usuario.rol != 'Administrador':
                usuario.intentos_fallidos += 1
                if usuario.intentos_fallidos >= 5:
                    usuario.estado = 'Bloqueado'
                    usuario.fecha_bloqueo = timezone.now()
                usuario.save()
            raise serializers.ValidationError('Credenciales inválidas.')

        usuario.intentos_fallidos = 0
        usuario.fecha_ultima_sesion = timezone.now()
        usuario.save()

        data['usuario'] = usuario
        return data


class VerificacionEmailSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)

    def validate_token(self, value):
        try:
            token_obj = Token_Verificacion.objects.get(
                token=value,
                tipo='Verificacion_Email'
            )
        except Token_Verificacion.DoesNotExist:
            raise serializers.ValidationError('Token inválido o expirado.')

        if timezone.now() > token_obj.fecha_expiracion:
            raise serializers.ValidationError('El token ha expirado.')

        if token_obj.usado:
            raise serializers.ValidationError('Este token ya fue utilizado.')

        return value


class ReenvioVerificacionSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=True)

    def validate_correo(self, value):
        try:
            usuario = Usuario.objects.get(correo=value, eliminado=False)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError('Usuario no encontrado.')

        if usuario.email_verificado:
            raise serializers.ValidationError('Este correo ya ha sido verificado.')

        hace_24_horas = timezone.now() - timedelta(hours=24)
        reenvios_recientes = Token_Verificacion.objects.filter(
            usuario=usuario,
            tipo='Verificacion_Email',
            fecha_creacion__gte=hace_24_horas
        ).count()

        if reenvios_recientes >= 3:
            raise serializers.ValidationError('Has alcanzado el límite de reenvíos. Intenta más tarde.')

        return value


class RecuperacionPasswordSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=True)

    def validate_correo(self, value):
        try:
            Usuario.objects.get(correo=value, eliminado=False)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError('Usuario no encontrado.')
        return value


class NuevaPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    def validate_token(self, value):
        try:
            token_obj = Token_Verificacion.objects.get(
                token=value,
                tipo='Recuperacion_Password'
            )
        except Token_Verificacion.DoesNotExist:
            raise serializers.ValidationError('Token inválido.')

        if timezone.now() > token_obj.fecha_expiracion:
            raise serializers.ValidationError('El token ha expirado.')

        if token_obj.usado:
            raise serializers.ValidationError('Este token ya fue utilizado.')

        return value

    def validate_contrasena(self, value):
        errors = []
        if len(value) < 8:
            errors.append('Mínimo 8 caracteres.')
        if not re.search(r'[A-Z]', value):
            errors.append('Debe incluir una mayúscula.')
        if not re.search(r'\d', value):
            errors.append('Debe incluir un número.')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            errors.append('Debe incluir un carácter especial.')
        if errors:
            raise serializers.ValidationError(' | '.join(errors))
        return value

    def validate(self, data):
        if data['contrasena'] != data['confirmar_contrasena']:
            raise serializers.ValidationError('Las contraseñas no coinciden.')
        return data


class CambioPasswordSerializer(serializers.Serializer):
    contrasena_actual = serializers.CharField(max_length=255, required=True, write_only=True)
    contrasena_nueva = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    def validate_contrasena_actual(self, value):
        usuario = self.context.get('usuario')
        if not check_password(value, usuario.contrasena):
            raise serializers.ValidationError('Contraseña actual incorrecta.')
        return value

    def validate_contrasena_nueva(self, value):
        errors = []
        if len(value) < 8:
            errors.append('Mínimo 8 caracteres.')
        if not re.search(r'[A-Z]', value):
            errors.append('Debe incluir una mayúscula.')
        if not re.search(r'\d', value):
            errors.append('Debe incluir un número.')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', value):
            errors.append('Debe incluir un carácter especial.')
        if errors:
            raise serializers.ValidationError(' | '.join(errors))
        return value

    def validate(self, data):
        if data['contrasena_nueva'] != data['confirmar_contrasena']:
            raise serializers.ValidationError('Las contraseñas no coinciden.')
        return data


class ActualizarPerfilSerializer(serializers.ModelSerializer):
    contrasena_actual = serializers.CharField(
        max_length=255,
        required=False,
        write_only=True,
        help_text='Requerido para cambiar correo'
    )

    class Meta:
        model = Usuario
        fields = ['usuario', 'correo', 'contrasena_actual']
        read_only_fields = ['id']

    def validate(self, data):
        usuario = self.context.get('usuario')
        if 'correo' in data and data['correo'] != usuario.correo:
            if 'contrasena_actual' not in data:
                raise serializers.ValidationError('Debes ingresar tu contraseña actual para cambiar el correo.')
            if not check_password(data['contrasena_actual'], usuario.contrasena):
                raise serializers.ValidationError('Contraseña actual incorrecta.')
        return data


class LogAuditoriaSerializer(serializers.ModelSerializer):
    usuario_admin = UsuarioSerializer(read_only=True)
    usuario_afectado = UsuarioSerializer(read_only=True)

    class Meta:
        model = Log_Auditoria
        fields = [
            'id', 'usuario_admin', 'usuario_afectado', 'accion',
            'datos_anteriores', 'datos_nuevos', 'fecha_accion', 'ip_admin'
        ]
        read_only_fields = fields
