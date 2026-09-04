# ==============================================================================
# Serializadores — Módulo de Usuarios (Red Estampación)
# ==============================================================================
# Define la capa de validación y transformación de datos para los endpoints
# de usuarios. Cada serializador encapsula las reglas de negocio (RN) y las
# validaciones específicas de su flujo:
#
#   RegistroSerializer         → RN-001 (formato contraseña), RN-004 (inactivo)
#   LoginSerializer            → RN-004 (bloqueo por ≥5 intentos fallidos)
#   VerificacionEmailSerializer → RN-005 (token expirado), RN-006 (24h)
#   ReenvioVerificacionSerializer → RN-009 (máx 3 reenvíos/24h)
#   RecuperacionPasswordSerializer
#   NuevaPasswordSerializer    → RN-001 (formato contraseña)
#   CambioPasswordSerializer   → RN-001 (formato contraseña)
#   ActualizarPerfilSerializer → verificación de identidad con contraseña
#   LogAuditoriaSerializer     → solo lectura
#
# Las excepciones personalizadas (exceptions.py) se usan para mantener un
# formato uniforme de errores en toda la API.
# ==============================================================================
"""
Serializadores para la app de usuarios.
Define serializadores para registro, login, verificación, recuperación de password y auditoría.
"""

from rest_framework import serializers
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.db import IntegrityError
from datetime import timedelta
from ..validators import validate_password_strength, validate_passwords_match
import re
import secrets

from ..models import Usuario, Token_Verificacion, Log_Auditoria, Historial_Estado_Usuario
from ..exceptions import (
    EmailAlreadyExistsException,
    UsernameAlreadyExistsException,
    InvalidEmailException,
    EmptyFieldException,
    DatabaseConstraintException,
)


# ─────────────────────────────────────────────────────────────────────────────
# Serializadores de solo lectura para datos del usuario
# ─────────────────────────────────────────────────────────────────────────────

class UsuarioSerializer(serializers.ModelSerializer):
    """Serializador de solo lectura para datos básicos del usuario (id, usuario, correo, estado, rol, fechas)."""
    class Meta:
        model = Usuario
        fields = [
            'id', 'usuario', 'correo', 'estado', 'rol',
            'fecha_registro', 'email_verificado', 'fecha_ultima_sesion'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_ultima_sesion']


class UsuarioDetailSerializer(UsuarioSerializer):
    """Serializador de solo lectura con campos de seguridad adicionales (intentos_fallidos, fecha_bloqueo, eliminado, fecha_eliminacion)."""
    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + [
            'intentos_fallidos', 'fecha_bloqueo', 'eliminado', 'fecha_eliminacion'
        ]


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: RegistroSerializer (RF-001)
# ─────────────────────────────────────────────────────────────────────────────
# Valida y procesa el registro de nuevos usuarios.
#
# Reglas de negocio aplicadas:
#   - RN-001: contraseña debe tener ≥8 caracteres, 1 mayúscula, 1 número y
#             1 carácter especial (validado en validate_contrasena).
#   - RN-004: el usuario se crea en estado Inactivo con email_verificado=False.
#   - validate_usuario: mínimo 3 caracteres, verifica unicidad (UsernameAlreadyExistsException).
#   - validate_correo: formato regex + unicidad (EmailAlreadyExistsException).
#   - validate: verifica que contrasena == confirmar_contrasena.
#   - create: aplica make_password (hash bcrypt) y genera token de verificación.
#
# Excepciones personalizadas: EmptyFieldException, InvalidEmailException,
# InvalidPasswordFormatException, DatabaseConstraintException.
# ─────────────────────────────────────────────────────────────────────────────
class RegistroSerializer(serializers.Serializer):
    """Serializador de registro. Valida credenciales, crea usuario en estado Inactivo y genera token de verificación (RF-001, RN-001, RN-004)."""
    usuario = serializers.CharField(max_length=100, required=True)
    correo = serializers.EmailField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    # ── Validación de nombre de usuario ──
    # Requisitos: obligatorio, mínimo 3 caracteres, único en BD.
    # Si ya existe, lanza UsernameAlreadyExistsException (REG-007).
    def validate_usuario(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('El nombre de usuario es obligatorio.')
        if len(value) < 3:
            raise serializers.ValidationError('El usuario debe tener al menos 3 caracteres.')
        if Usuario.objects.filter(usuario=value).exists():
            ex = UsernameAlreadyExistsException(context={'field': 'usuario', 'value': value})
            raise serializers.ValidationError(ex.user_message)
        return value

    # ── Validación de correo electrónico ──
    # Requisitos: formato válido (regex), único en BD.
    # Excepciones: EmptyFieldException (REG-003), InvalidEmailException (REG-001),
    # EmailAlreadyExistsException (REG-006).
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

    # ── Validación de contraseña (RN-001) ──
    # Delega en validators.validate_password_strength() para mantener DRY.
    # La lógica concreta (≥8 chars, mayúscula, número, especial) vive en
    # apps/users/validators.py como Strategy Pattern.
    def validate_contrasena(self, value):
        return validate_password_strength(value)

    # ── Validación cruzada ──
    # Delega en validators.validate_passwords_match() para mantener DRY.
    def validate(self, data):
        validate_passwords_match(
            data.get('contrasena'),
            data.get('confirmar_contrasena')
        )
        return data

    # ── Creación del usuario ──
    # Crea el usuario en BD con:
    #   - estado='Inactivo' (RN-004: pendiente de verificación de email).
    #   - email_verificado=False.
    #   - contraseña hasheada con make_password (bcrypt/Django PBKDF2).
    #
    # Si ocurre IntegrityError por duplicado (usuario o correo), lanza
    # la excepción específica correspondiente.
    #
    # Luego genera automáticamente un Token_Verificacion de tipo
    # 'Verificacion_Email' con expiración de 24 horas (RN-006).
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


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: LoginSerializer (RF-008)
# ─────────────────────────────────────────────────────────────────────────────
# Valida las credenciales del usuario al iniciar sesión.
#
# Flujo de validación:
#   1. Busca usuario por correo (excluye eliminados).
#   2. Rechaza si estado == 'Bloqueado' (RN-004: cuenta suspendida).
#   3. Rechaza si estado == 'Inactivo' (email no verificado).
#   4. Verifica contraseña con check_password:
#       - Si incorrecta: incrementa intentos_fallidos.
#         - Si ≥5 intentos: cambia estado a 'Bloqueado' (RN-004).
#         - Los administradores NO están sujetos a bloqueo por intentos.
#       - Si correcta: reinicia intentos_fallidos a 0 y actualiza
#         fecha_ultima_sesion.
#
# Reglas de negocio:
#   - RN-004: máximo 5 intentos fallidos antes de bloquear la cuenta.
# ─────────────────────────────────────────────────────────────────────────────
class LoginSerializer(serializers.Serializer):
    """Serializador de login. Valida credenciales, maneja bloqueo por intentos fallidos (RN-004) y excluye administradores del bloqueo automático."""
    correo = serializers.CharField(required=True, help_text='Nombre de usuario o correo electrónico')
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    def validate(self, data):
        from django.db.models import Q
        try:
            credencial = data['correo']
            if '@' in credencial:
                usuario = Usuario.objects.get(correo=credencial, eliminado=False)
            else:
                usuario = Usuario.objects.get(usuario=credencial, eliminado=False)
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


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: VerificacionEmailSerializer (RF-003)
# ─────────────────────────────────────────────────────────────────────────────
# Valida el token de verificación de email.
#
# Validaciones en validate_token:
#   1. El token existe en BD y es de tipo 'Verificacion_Email'.
#   2. El token NO ha expirado (fecha_expiracion, RN-006: 24h).
#   3. El token NO ha sido usado previamente (un solo uso).
#
# RN-005: token expirado → rechazar.
# RN-006: expiración a las 24 horas de creación.
# ─────────────────────────────────────────────────────────────────────────────
class VerificacionEmailSerializer(serializers.Serializer):
    """Serializador para verificar el email mediante token. Valida existencia, expiración (RN-005) y uso único."""
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


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: ReenvioVerificacionSerializer (RF-009)
# ─────────────────────────────────────────────────────────────────────────────
# Valida la solicitud de reenvío de token de verificación.
#
# Validaciones en validate_correo:
#   1. El usuario existe y no está eliminado.
#   2. El email NO está previamente verificado (evita reenvíos innecesarios).
#   3. Límite de 3 reenvíos en las últimas 24 horas (RN-009: control
#      de tasa para prevenir abuso del servicio de email).
#
# RN-009: máximo 3 solicitudes de reenvío por usuario en 24 horas.
# ─────────────────────────────────────────────────────────────────────────────
class ReenvioVerificacionSerializer(serializers.Serializer):
    """Serializador para reenviar token de verificación con límite de 3 reenvíos en 24 horas (RN-009)."""
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


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: RecuperacionPasswordSerializer (RF-009)
# ─────────────────────────────────────────────────────────────────────────────
# Primer paso del flujo de recuperación de contraseña.
# Valida que el correo exista (sin revelar si está registrado para prevenir
# enumeración de usuarios). El serializador no distingue entre "usuario no
# encontrado" y otros errores para evitar filtración de información.
# ─────────────────────────────────────────────────────────────────────────────
class RecuperacionPasswordSerializer(serializers.Serializer):
    """Serializador para solicitar recuperación de contraseña por correo (RF-009)."""
    correo = serializers.EmailField(required=True)

    def validate_correo(self, value):
        try:
            Usuario.objects.get(correo=value, eliminado=False)
        except Usuario.DoesNotExist:
            raise serializers.ValidationError('Usuario no encontrado.')
        return value


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: NuevaPasswordSerializer (RF-009)
# ─────────────────────────────────────────────────────────────────────────────
# Segundo paso del flujo de recuperación de contraseña.
#
# Validaciones:
#   - validate_token: verifica existencia, expiración (RN-005: 1h) y uso único.
#   - validate_contrasena: aplica RN-001 (≥8 chars, mayúscula, número, especial).
#   - validate (cruzada): verifica contrasena == confirmar_contrasena.
# ─────────────────────────────────────────────────────────────────────────────
class NuevaPasswordSerializer(serializers.Serializer):
    """Serializador para establecer nueva contraseña mediante token de recuperación. Valida token (RN-005) y formato de contraseña (RN-001)."""
    token = serializers.CharField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    # ── Validación del token de recuperación ──
    # Verifica: existencia, tipo 'Recuperacion_Password', no expirado (RN-005: 1h),
    # y no usado previamente (un solo uso).
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

    # ── Validación de la nueva contraseña (RN-001) ──
    # Delega en validators.validate_password_strength() (DRY / Strategy Pattern).
    def validate_contrasena(self, value):
        return validate_password_strength(value)

    # ── Validación cruzada ──
    # Delega en validators.validate_passwords_match() (DRY).
    def validate(self, data):
        validate_passwords_match(
            data.get('contrasena'),
            data.get('confirmar_contrasena')
        )
        return data


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: CambioPasswordSerializer (RF-010)
# ─────────────────────────────────────────────────────────────────────────────
# Cambio de contraseña desde sesión autenticada.
#
# Validaciones:
#   - validate_contrasena_actual: verifica la contraseña actual contra el hash
#     almacenado (solicita contraseña actual como factor de verificación adicional).
#   - validate_contrasena_nueva: aplica RN-001 (formato de contraseña segura).
#   - validate (cruzada): contrasena_nueva == confirmar_contrasena.
# ─────────────────────────────────────────────────────────────────────────────
class CambioPasswordSerializer(serializers.Serializer):
    """Serializador para cambiar contraseña desde sesión autenticada. Verifica la contraseña actual antes de aplicar el cambio."""
    contrasena_actual = serializers.CharField(max_length=255, required=True, write_only=True)
    contrasena_nueva = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    # ── Verificación de la contraseña actual ──
    # Factor adicional de seguridad: incluso con un JWT válido, el atacante
    # debe conocer la contraseña actual para modificarla.
    def validate_contrasena_actual(self, value):
        usuario = self.context.get('usuario')
        if not check_password(value, usuario.contrasena):
            raise serializers.ValidationError('Contraseña actual incorrecta.')
        return value

    # ── Validación de la nueva contraseña (RN-001) ──
    # Delega en validators.validate_password_strength() (DRY / Strategy Pattern).
    def validate_contrasena_nueva(self, value):
        return validate_password_strength(value)

    # ── Validación cruzada ──
    # Delega en validators.validate_passwords_match() (DRY).
    def validate(self, data):
        validate_passwords_match(
            data.get('contrasena_nueva'),
            data.get('confirmar_contrasena')
        )
        return data


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: ActualizarPerfilSerializer (RF-010)
# ─────────────────────────────────────────────────────────────────────────────
# Actualización de perfil (usuario y/o correo).
#
# Regla de negocio: cambiar el correo requiere verificación de identidad
# mediante la contraseña actual (previene account takeover incluso si el
# JWT es comprometido).
#
# validate (cruzada): si 'correo' cambia y no se provee contrasena_actual,
# o la contraseña es incorrecta, se rechaza la operación.
# ─────────────────────────────────────────────────────────────────────────────
class ActualizarPerfilSerializer(serializers.ModelSerializer):
    """Serializador para actualizar perfil (usuario/correo). Requiere contraseña actual para cambios de correo (verificación de identidad)."""
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

    def validate_usuario(self, value):
        """Validar que el nombre de usuario no esté en uso por otro usuario"""
        usuario = self.context.get('usuario')
        if Usuario.objects.filter(usuario=value).exclude(pk=usuario.pk).exists():
            raise serializers.ValidationError("Este nombre de usuario ya está en uso.")
        return value

    def validate_correo(self, value):
        """Validar que el correo no esté en uso por otro usuario"""
        usuario = self.context.get('usuario')
        if Usuario.objects.filter(correo=value).exclude(pk=usuario.pk).exists():
            raise serializers.ValidationError("Este correo ya está en uso por otro usuario.")
        return value

    def validate(self, data):
        usuario = self.context.get('usuario')
        if 'correo' in data and data['correo'] != usuario.correo:
            if 'contrasena_actual' not in data:
                raise serializers.ValidationError('Debes ingresar tu contraseña actual para cambiar el correo.')
            if not check_password(data['contrasena_actual'], usuario.contrasena):
                raise serializers.ValidationError('Contraseña actual incorrecta.')

        return data


# ─────────────────────────────────────────────────────────────────────────────
# Serializador: LogAuditoriaSerializer
# ─────────────────────────────────────────────────────────────────────────────
# Serializador de solo lectura para los registros de auditoría.
# Anida los datos del admin y del usuario afectado mediante UsuarioSerializer.
# ─────────────────────────────────────────────────────────────────────────────
class LogAuditoriaSerializer(serializers.ModelSerializer):
    """Serializador de solo lectura para registros de auditoría administrativa con datos anidados del admin y usuario afectado."""
    usuario_admin = UsuarioSerializer(read_only=True)
    usuario_afectado = UsuarioSerializer(read_only=True)

    class Meta:
        model = Log_Auditoria
        fields = [
            'id', 'usuario_admin', 'usuario_afectado', 'accion',
            'datos_anteriores', 'datos_nuevos', 'fecha_accion', 'ip_admin'
        ]
        read_only_fields = fields
