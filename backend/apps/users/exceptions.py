import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _request_id(request=None):
    if request and hasattr(request, 'request_id'):
        return request.request_id
    return str(uuid.uuid4())


class BaseAppException(Exception):
    severity = 'ERROR'

    def __init__(self, message='', user_message=None, context=None, request=None):
        self.code = getattr(self, 'code', 'APP-000')
        self.exception = type(self).__name__
        self.message = message or getattr(self, 'message', '')
        self.user_message = user_message or self.message
        self.context = context or {}
        self.timestamp = _now()
        self.request_id = _request_id(request)
        super().__init__(self.message)

    def to_dict(self):
        return {
            'errorCode': self.code,
            'exception': self.exception,
            'message': self.message,
            'userMessage': self.user_message,
            'severity': self.severity,
            'context': self.context,
            'timestamp': self.timestamp,
            'requestId': self.request_id,
        }

    def to_log(self, request=None, user=None, operation=''):
        return {
            'requestId': self.request_id,
            'userId': str(getattr(user, 'id', '')) if user else '',
            'module': getattr(self, 'module', 'unknown'),
            'operation': operation,
            'exception': self.exception,
            'stackTrace': self.__class__.__name__,
            'timestamp': self.timestamp,
        }


# ──────────────────────────── MÓDULO: REGISTRO ────────────────────────────

class RegistroBaseException(BaseAppException):
    module = 'registro'


class InvalidEmailException(RegistroBaseException):
    code = 'REG-001'
    severity = 'INFO'
    message = 'Formato de correo inválido'


class InvalidPasswordFormatException(RegistroBaseException):
    code = 'REG-002'
    severity = 'INFO'
    message = 'La contraseña no cumple los requisitos mínimos'


class EmptyFieldException(RegistroBaseException):
    code = 'REG-003'
    severity = 'INFO'
    message = 'Campo obligatorio vacío'


class InvalidPhoneNumberException(RegistroBaseException):
    code = 'REG-004'
    severity = 'INFO'
    message = 'Número telefónico inválido'


class InvalidDocumentException(RegistroBaseException):
    code = 'REG-005'
    severity = 'INFO'
    message = 'Documento de identidad inválido'


class EmailAlreadyExistsException(RegistroBaseException):
    code = 'REG-006'
    severity = 'WARNING'
    message = 'El correo ya está registrado'


class UsernameAlreadyExistsException(RegistroBaseException):
    code = 'REG-007'
    severity = 'WARNING'
    message = 'El nombre de usuario ya existe'


class DocumentAlreadyRegisteredException(RegistroBaseException):
    code = 'REG-008'
    severity = 'WARNING'
    message = 'Documento ya asociado a otra cuenta'


class DatabaseConnectionException(RegistroBaseException):
    code = 'REG-009'
    severity = 'CRITICAL'
    message = 'No se puede conectar a la base de datos'


class DatabaseTimeoutException(RegistroBaseException):
    code = 'REG-010'
    severity = 'CRITICAL'
    message = 'Timeout durante operación de registro'


class DatabaseConstraintException(RegistroBaseException):
    code = 'REG-011'
    severity = 'ERROR'
    message = 'Violación de restricciones de base de datos'


class TransactionRollbackException(RegistroBaseException):
    code = 'REG-012'
    severity = 'ERROR'
    message = 'La transacción fue revertida'


class EmailServiceUnavailableException(RegistroBaseException):
    code = 'REG-013'
    severity = 'WARNING'
    message = 'Servicio de correo no disponible'


class VerificationCodeGenerationException(RegistroBaseException):
    code = 'REG-014'
    severity = 'ERROR'
    message = 'No se pudo generar el código de verificación'


class VerificationCodeDeliveryException(RegistroBaseException):
    code = 'REG-015'
    severity = 'ERROR'
    message = 'No se pudo enviar el código de verificación'


class SmsServiceUnavailableException(RegistroBaseException):
    code = 'REG-016'
    severity = 'WARNING'
    message = 'Servicio SMS fuera de línea'


class CaptchaValidationException(RegistroBaseException):
    code = 'REG-017'
    severity = 'INFO'
    message = 'Captcha inválido'


class SuspiciousRegistrationException(RegistroBaseException):
    code = 'REG-018'
    severity = 'WARNING'
    message = 'Registro detectado como fraudulento'


class RateLimitExceededException(RegistroBaseException):
    code = 'REG-019'
    severity = 'WARNING'
    message = 'Demasiados intentos de registro'


# ──────────────────────────── MÓDULO: USUARIOS ────────────────────────────

class UsuarioBaseException(BaseAppException):
    module = 'usuarios'

# Autenticación

class UserNotFoundException(UsuarioBaseException):
    code = 'USR-001'
    severity = 'INFO'
    message = 'Usuario no encontrado'


class InvalidCredentialsException(UsuarioBaseException):
    code = 'USR-002'
    severity = 'INFO'
    message = 'Credenciales incorrectas'


class AccountLockedException(UsuarioBaseException):
    code = 'USR-003'
    severity = 'WARNING'
    message = 'Cuenta bloqueada'


class AccountDisabledException(UsuarioBaseException):
    code = 'USR-004'
    severity = 'WARNING'
    message = 'Cuenta deshabilitada'


class AccountNotVerifiedException(UsuarioBaseException):
    code = 'USR-005'
    severity = 'INFO'
    message = 'Cuenta sin verificar'


class SessionExpiredException(UsuarioBaseException):
    code = 'USR-006'
    severity = 'INFO'
    message = 'Sesión expirada'


class InvalidTokenException(UsuarioBaseException):
    code = 'USR-007'
    severity = 'INFO'
    message = 'Token inválido'


class TokenExpiredException(UsuarioBaseException):
    code = 'USR-008'
    severity = 'INFO'
    message = 'Token expirado'


# Autorización

class UnauthorizedAccessException(UsuarioBaseException):
    code = 'USR-009'
    severity = 'WARNING'
    message = 'Usuario sin autenticación'


class ForbiddenOperationException(UsuarioBaseException):
    code = 'USR-010'
    severity = 'WARNING'
    message = 'Usuario sin permisos suficientes'


class RoleNotFoundException(UsuarioBaseException):
    code = 'USR-011'
    severity = 'INFO'
    message = 'Rol inexistente'


# Perfil de usuario

class UserProfileNotFoundException(UsuarioBaseException):
    code = 'USR-012'
    severity = 'INFO'
    message = 'Perfil no encontrado'


class InvalidProfileDataException(UsuarioBaseException):
    code = 'USR-013'
    severity = 'INFO'
    message = 'Datos de perfil inválidos'


class AvatarUploadException(UsuarioBaseException):
    code = 'USR-014'
    severity = 'ERROR'
    message = 'Error al subir imagen de perfil'


class FileSizeExceededException(UsuarioBaseException):
    code = 'USR-015'
    severity = 'INFO'
    message = 'Archivo excede tamaño permitido'


class UnsupportedFileFormatException(UsuarioBaseException):
    code = 'USR-016'
    severity = 'INFO'
    message = 'Formato de archivo no soportado'


# Integraciones

class ExternalServiceException(UsuarioBaseException):
    code = 'USR-017'
    severity = 'ERROR'
    message = 'Error en servicio externo'


class ApiTimeoutException(UsuarioBaseException):
    code = 'USR-018'
    severity = 'ERROR'
    message = 'Timeout en API externa'


class ThirdPartyAuthenticationException(UsuarioBaseException):
    code = 'USR-019'
    severity = 'WARNING'
    message = 'Error en autenticación externa'
