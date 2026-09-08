"""
Serializers del módulo de Usuarios.

Centraliza la serialización/deserialización de datos para el dominio de usuarios.
Incluye validación de reglas de negocio (RN-001 a RN-014) y prevención de
vulnerabilidades (Mass Assignment, BFLA).

Patrón de diseño: Translator (capa de presentación ↔ capa de dominio).
Cada serializer encapsula las reglas de validación para un contexto específico
(registro, login, cambio de contraseña, actualización de perfil).

SEGURIDAD: Los campos sensibles (rol, is_staff, is_superuser) están
DELIBERADAMENTE AUSENTES en los serializers públicos para prevenir
Mass Assignment (OWASP API3).
"""
from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
import re
import secrets

from ..models import Usuario, Token_Verificacion, Log_Auditoria, Historial_Estado_Usuario


# ═══════════════════════════════════════════════════════════════════════
# Serializers de lectura — Perfil de usuario
# ═══════════════════════════════════════════════════════════════════════

class UsuarioSerializer(serializers.ModelSerializer):
    """Serializer básico para Usuario — campos públicos del perfil."""
    class Meta:
        model = Usuario
        fields = [
            'id', 'usuario', 'correo', 'estado', 'rol', 
            'fecha_registro', 'email_verificado', 'fecha_ultima_sesion'
        ]
        read_only_fields = ['id', 'fecha_registro', 'fecha_ultima_sesion']

class UsuarioDetailSerializer(UsuarioSerializer):
    """Serializer detallado — incluye campos de auditoría y bloqueo."""
    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + [
            'intentos_fallidos', 'fecha_bloqueo', 'eliminado', 'fecha_eliminacion'
        ]


# ═══════════════════════════════════════════════════════════════════════
# RegistroSerializer — Creación de cuenta (RF-001)
# ═══════════════════════════════════════════════════════════════════════
class RegistroSerializer(serializers.Serializer):
    """
    Serializer para el registro de nuevos usuarios (RF-001).

    SEGURIDAD — Mass Assignment / BFLA Prevention:
    ────────────────────────────────────────────────
    Los campos 'rol', 'is_staff', 'is_superuser', 'estado' y 'email_verificado'
    están DELIBERADAMENTE AUSENTES de este serializer.

    ¿Por qué? Exponer el campo 'rol' en el formulario público permitiría a un
    atacante enviar {"rol": "Administrador"} y obtener privilegios elevados sin
    ninguna verificación (OWASP API3: Mass Assignment / BFLA).

    La asignación de roles elevados debe hacerse ÚNICAMENTE por un administrador
    autenticado a través del endpoint separado /api/admin/usuarios/{id}/promote_to_admin/
    que requiere:
      - AdminPermission (JWT válido + rol=Administrador + estado=Activo)
      - Contraseña del admin para confirmar la operación

    Principio: Minimum Privilege (Mínimo Privilegio) + Separation of Concerns.
    OWASP A01: Broken Access Control, OWASP API3: Mass Assignment.
    """

    usuario = serializers.CharField(max_length=100, required=True)
    correo = serializers.EmailField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)

    def validate_usuario(self, value):
        """Valida unicidad y formato del nombre de usuario."""
        if Usuario.objects.filter(usuario=value, eliminado=False).exists():
            raise ValidationError("Este nombre de usuario ya está registrado.")
        if len(value) < 3:
            raise ValidationError("El usuario debe tener al menos 3 caracteres.")
        # Regex: solo alfanuméricos, guiones y guiones bajos
        if not re.match(r'^[a-zA-Z0-9_-]+$', value):
            raise ValidationError("El usuario solo puede contener letras, números, _ y -.")
        return value

    def validate_correo(self, value):
        """Valida unicidad y formato del correo (RFC 5322 simplificado)."""
        if Usuario.objects.filter(correo=value, eliminado=False).exists():
            raise ValidationError("Este correo ya está registrado.")
        if not re.match(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$', value):
            raise ValidationError("El formato del correo no es válido.")
        return value

    def validate_contrasena(self, value):
        """
        Valida la contraseña según RN-001:
        Mínimo 8 caracteres, mayúscula, número y carácter especial.
        """
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
        """Valida que las contraseñas coincidan."""
        if data['contrasena'] != data['confirmar_contrasena']:
            raise ValidationError("Las contraseñas no coinciden.")
        return data

    def create(self, validated_data):
        """
        Crea el usuario con estado 'Inactivo' y email no verificado (RN-004).
        Genera token de verificación de 24 horas (RF-009).
        El rol se asigna automáticamente como 'Usuario' (no expuesto al cliente).
        """
        usuario = Usuario.objects.create(
            usuario=validated_data['usuario'],
            correo=validated_data['correo'],
            contrasena=make_password(validated_data['contrasena']),
            estado='Inactivo',
            email_verificado=False
            # NOTA: 'rol' NO se pasa aquí → usa el default del modelo ('Usuario')
            # Esto previene Mass Assignment: el cliente no puede elegir su rol.
        )

        # Crear token de verificación (RF-009)
        fecha_expiracion = timezone.now() + timedelta(hours=24)
        Token_Verificacion.objects.create(
            usuario=usuario,
            token=secrets.token_urlsafe(32),
            tipo='Verificacion_Email',
            fecha_expiracion=fecha_expiracion
        )

        return usuario


# ═══════════════════════════════════════════════════════════════════════
# LoginSerializer — Autenticación JWT (RF-008)
# ═══════════════════════════════════════════════════════════════════════
class LoginSerializer(serializers.Serializer):
    """Serializer para autenticación (RF-008).
    
    Valida credenciales, estado de la cuenta y política de bloqueo.
    Implementa conteo de intentos fallidos (RN-010) y bloqueo automático.
    """
    
    correo = serializers.EmailField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    
    def validate(self, data):
        """Valida credenciales, estado y aplica política de bloqueo."""
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
            if usuario.rol != 'Administrador':
                # Incrementar intentos fallidos (RN-010): 5 intentos → bloqueo
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


# ═══════════════════════════════════════════════════════════════════════
# Verificación de email y reenvío (RF-009, RF-003)
# ═══════════════════════════════════════════════════════════════════════

class VerificacionEmailSerializer(serializers.Serializer):
    """Serializer para verificación de email (RF-009).
    
    Valida que el token exista, no haya expirado y no haya sido usado.
    """
    
    token = serializers.CharField(required=True)
    
    def validate_token(self, value):
        """Valida integridad y estado del token de verificación."""
        try:
            token_obj = Token_Verificacion.objects.get(
                token=value,
                tipo='Verificacion_Email'
            )
        except Token_Verificacion.DoesNotExist:
            raise ValidationError("Token inválido o expirado.")
        
        if timezone.now() > token_obj.fecha_expiracion:
            raise ValidationError("El token ha expirado.")
        
        if token_obj.usado:
            raise ValidationError("Este token ya fue utilizado.")
        
        return value


class ReenvioVerificacionSerializer(serializers.Serializer):
    """Serializer para reenvío de email de verificación (RF-003).
    
    Valida que el usuario exista, no esté verificado, y que no se
    haya excedido el límite de reenvíos (RN-006: máximo 3 en 24h).
    """
    
    correo = serializers.EmailField(required=True)
    
    def validate_correo(self, value):
        """Valida existencia del usuario, estado de verificación y límite de reenvíos."""
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


# ═══════════════════════════════════════════════════════════════════════
# Recuperación de contraseña (RF-002, RN-005)
# ═══════════════════════════════════════════════════════════════════════

class RecuperacionPasswordSerializer(serializers.Serializer):
    """Serializer para solicitud de recuperación de contraseña (RF-002).
    
    Solo requiere el correo electrónico. El token se genera en la vista.
    """
    
    correo = serializers.EmailField(required=True)
    
    def validate_correo(self, value):
        """Valida que el usuario exista (no revela si existe o no en producción)."""
        try:
            Usuario.objects.get(correo=value, eliminado=False)
        except Usuario.DoesNotExist:
            raise ValidationError("Usuario no encontrado.")
        
        return value

class NuevaPasswordSerializer(serializers.Serializer):
    """Serializer para establecer nueva contraseña después de recuperación.
    
    Valida el token de recuperación (un solo uso, expira en 1h)
    y aplica la misma política de contraseñas que el registro.
    """
    
    token = serializers.CharField(required=True)
    contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    
    def validate_token(self, value):
        """Valida integridad, expiración y uso del token de recuperación."""
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
        """Valida política de contraseñas (RN-001)."""
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


# ═══════════════════════════════════════════════════════════════════════
# Cambio de contraseña autenticado (RF-010)
# ═══════════════════════════════════════════════════════════════════════

class CambioPasswordSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña autenticado (RF-010).
    
    Requiere la contraseña actual para confirmar la operación.
    La nueva contraseña debe cumplir la misma política que el registro.
    """
    
    contrasena_actual = serializers.CharField(max_length=255, required=True, write_only=True)
    contrasena_nueva = serializers.CharField(max_length=255, required=True, write_only=True)
    confirmar_contrasena = serializers.CharField(max_length=255, required=True, write_only=True)
    
    def validate_contrasena_actual(self, value):
        """Verifica que la contraseña actual sea correcta."""
        usuario = self.context.get('usuario')
        from django.contrib.auth.hashers import check_password
        if not check_password(value, usuario.contrasena):
            raise ValidationError("Contraseña actual incorrecta.")
        return value
    
    def validate_contrasena_nueva(self, value):
        """Valida política de contraseñas para la nueva contraseña."""
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


# ═══════════════════════════════════════════════════════════════════════
# Actualización de perfil (RF-010)
# ═══════════════════════════════════════════════════════════════════════

class ActualizarPerfilSerializer(serializers.ModelSerializer):
    """Serializer para actualizar perfil de usuario (RF-010).
    
    Permite cambiar nombre de usuario y correo.
    El cambio de correo requiere contraseña actual como medida de seguridad.
    """
    
    contrasena_actual = serializers.CharField(
        max_length=255, 
        required=False, 
        write_only=True,
        help_text="Requerido para cambiar correo"
    )
    
    class Meta:
        model = Usuario
        fields = ['usuario', 'correo', 'contrasena_actual']
        read_only_fields = ['id']
    
    def validate_usuario(self, value):
        """Valida que el nombre de usuario no esté en uso por otro usuario."""
        usuario = self.context.get('usuario')
        if Usuario.objects.filter(usuario=value).exclude(pk=usuario.pk).exists():
            raise ValidationError("Este nombre de usuario ya está en uso.")
        return value
    
    def validate_correo(self, value):
        """Valida que el correo no esté en uso por otro usuario."""
        usuario = self.context.get('usuario')
        if Usuario.objects.filter(correo=value).exclude(pk=usuario.pk).exists():
            raise ValidationError("Este correo ya está en uso por otro usuario.")
        return value
    
    def validate(self, data):
        """Si cambia correo, requiere contraseña actual para confirmar."""
        usuario = self.context.get('usuario')
        
        if 'correo' in data and data['correo'] != usuario.correo:
            if 'contrasena_actual' not in data:
                raise ValidationError("Debes ingresar tu contraseña actual para cambiar el correo.")
            from django.contrib.auth.hashers import check_password
            if not check_password(data['contrasena_actual'], usuario.contrasena):
                raise ValidationError("La contraseña actual es incorrecta.")
        
        return data


# ═══════════════════════════════════════════════════════════════════════
# LogAuditoriaSerializer — Auditoría (RF-024)
# ═══════════════════════════════════════════════════════════════════════

class LogAuditoriaSerializer(serializers.ModelSerializer):
    """Serializer para visualizar logs de auditoría (RF-024).
    
    Muestra información del admin que realizó la acción, el usuario
    afectado, los datos anteriores/nuevos y la IP de origen.
    """
    
    usuario_admin = UsuarioSerializer(read_only=True)
    usuario_afectado = UsuarioSerializer(read_only=True)
    
    class Meta:
        model = Log_Auditoria
        fields = [
            'id', 'usuario_admin', 'usuario_afectado', 'accion',
            'datos_anteriores', 'datos_nuevos', 'fecha_accion', 'ip_admin'
        ]
        read_only_fields = fields
