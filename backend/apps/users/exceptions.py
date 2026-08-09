# ==============================================================================
# Excepciones personalizadas — Módulo de Usuarios (Red Estampación)
# ==============================================================================
# Define una jerarquía de excepciones con severidad y código para mantener
# un formato uniforme de errores en toda la API.
#
# Patrón: Jerarquía de excepciones personalizadas (Special Case).
#
# Estructura:
#   BaseAppException (raíz)
#   ├── RegistroBaseException (módulo registro) — códigos REG-001 a REG-019
#   └── UsuarioBaseException (módulo usuarios) — códigos USR-001 a USR-019
#       ├── Autenticación (USR-001 a USR-008)
#       ├── Autorización (USR-009 a USR-011)
#       ├── Perfil (USR-012 a USR-016)
#       └── Integraciones (USR-017 a USR-019)
#
# Cada excepción incluye:
#   - code:        identificador único del error (ej. REG-001, USR-003).
#   - severity:    INFO / WARNING / ERROR / CRITICAL.
#   - message:     mensaje técnico para logs.
#   - user_message: mensaje legible para el usuario final.
#   - context:     datos adicionales del error (campos, valores, etc.).
#   - timestamp:   momento de la ocurrencia.
#   - request_id:  ID de la request que provocó el error.
# ==============================================================================
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _now():
    """Retorna el timestamp actual en formato ISO 8601 (UTC)."""
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')


def _request_id(request=None):
    """Obtiene el request_id del objeto request o genera uno nuevo."""
    if request and hasattr(request, 'request_id'):
        return request.request_id
    return str(uuid.uuid4())


# ═════════════════════════════════════════════════════════════════════════════
# Excepción base: BaseAppException
# ═════════════════════════════════════════════════════════════════════════════
# Clase raíz de toda la jerarquía. Proporciona:
#   - to_dict():   serializa la excepción a diccionario para respuestas JSON.
#   - to_log():    serializa a diccionario para logs estructurados.
#   - Atributos:   code, exception (class name), message, user_message,
#                  severity, context, timestamp, request_id.
#
# Las subclases definen valores por defecto para code, severity, message
# y module, que pueden ser sobreescritos en la instanciación.
# ═════════════════════════════════════════════════════════════════════════════
class BaseAppException(Exception):
    """Excepción base del sistema. Proporciona formato uniforme con código, severidad, mensaje técnico y mensaje para el usuario."""
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


# ═════════════════════════════════════════════════════════════════════════════
# MÓDULO: REGISTRO — Códigos REG-001 a REG-019
# ═════════════════════════════════════════════════════════════════════════════
# Excepciones relacionadas con el flujo de registro de nuevos usuarios:
# validación de campos, duplicidad, integridad de BD y servicios externos.

class RegistroBaseException(BaseAppException):
    """Base para excepciones del módulo de registro. module='registro'."""
    module = 'registro'


class InvalidEmailException(RegistroBaseException):
    """Formato de correo electrónico inválido."""
    code = 'REG-001'
    severity = 'INFO'
    message = 'Formato de correo inválido'


class InvalidPasswordFormatException(RegistroBaseException):
    """La contraseña no cumple los requisitos de seguridad (RN-001)."""
    code = 'REG-002'
    severity = 'INFO'
    message = 'La contraseña no cumple los requisitos mínimos'


class EmptyFieldException(RegistroBaseException):
    """Campo obligatorio no proporcionado."""
    code = 'REG-003'
    severity = 'INFO'
    message = 'Campo obligatorio vacío'


class InvalidPhoneNumberException(RegistroBaseException):
    """Formato de número telefónico inválido."""
    code = 'REG-004'
    severity = 'INFO'
    message = 'Número telefónico inválido'


class InvalidDocumentException(RegistroBaseException):
    """Formato de documento de identidad inválido."""
    code = 'REG-005'
    severity = 'INFO'
    message = 'Documento de identidad inválido'


class EmailAlreadyExistsException(RegistroBaseException):
    """El correo ya está registrado por otro usuario (unicidad)."""
    code = 'REG-006'
    severity = 'WARNING'
    message = 'El correo ya está registrado'


class UsernameAlreadyExistsException(RegistroBaseException):
    """El nombre de usuario ya está registrado (unicidad)."""
    code = 'REG-007'
    severity = 'WARNING'
    message = 'El nombre de usuario ya existe'


class DocumentAlreadyRegisteredException(RegistroBaseException):
    """Documento de identidad ya asociado a otra cuenta."""
    code = 'REG-008'
    severity = 'WARNING'
    message = 'Documento ya asociado a otra cuenta'


class DatabaseConnectionException(RegistroBaseException):
    """Error de conexión a la base de datos relacional."""
    code = 'REG-009'
    severity = 'CRITICAL'
    message = 'No se puede conectar a la base de datos'


class DatabaseTimeoutException(RegistroBaseException):
    """Timeout en operación de base de datos durante el registro."""
    code = 'REG-010'
    severity = 'CRITICAL'
    message = 'Timeout durante operación de registro'


class DatabaseConstraintException(RegistroBaseException):
    """Violación de restricciones de integridad en BD (unicidad, FK, etc.)."""
    code = 'REG-011'
    severity = 'ERROR'
    message = 'Violación de restricciones de base de datos'


class TransactionRollbackException(RegistroBaseException):
    """La transacción atómica de registro fue revertida."""
    code = 'REG-012'
    severity = 'ERROR'
    message = 'La transacción fue revertida'


class EmailServiceUnavailableException(RegistroBaseException):
    """El servicio de envío de correos no está disponible."""
    code = 'REG-013'
    severity = 'WARNING'
    message = 'Servicio de correo no disponible'


class VerificationCodeGenerationException(RegistroBaseException):
    """Error al generar el código o token de verificación."""
    code = 'REG-014'
    severity = 'ERROR'
    message = 'No se pudo generar el código de verificación'


class VerificationCodeDeliveryException(RegistroBaseException):
    """Error al enviar el código de verificación al usuario."""
    code = 'REG-015'
    severity = 'ERROR'
    message = 'No se pudo enviar el código de verificación'


class SmsServiceUnavailableException(RegistroBaseException):
    """Servicio SMS fuera de línea (para verificación por SMS)."""
    code = 'REG-016'
    severity = 'WARNING'
    message = 'Servicio SMS fuera de línea'


class CaptchaValidationException(RegistroBaseException):
    """El captcha ingresado no es válido."""
    code = 'REG-017'
    severity = 'INFO'
    message = 'Captcha inválido'


class SuspiciousRegistrationException(RegistroBaseException):
    """Registro detectado como fraudulento o sospechoso."""
    code = 'REG-018'
    severity = 'WARNING'
    message = 'Registro detectado como fraudulento'


class RateLimitExceededException(RegistroBaseException):
    """Se ha superado el límite de intentos de registro."""
    code = 'REG-019'
    severity = 'WARNING'
    message = 'Demasiados intentos de registro'


# ═════════════════════════════════════════════════════════════════════════════
# MÓDULO: USUARIOS — Códigos USR-001 a USR-019
# ═════════════════════════════════════════════════════════════════════════════
# Excepciones relacionadas con autenticación, autorización, perfil de
# usuario e integraciones con servicios externos.

class UsuarioBaseException(BaseAppException):
    """Base para excepciones del módulo de usuarios. module='usuarios'."""
    module = 'usuarios'


# ──────────────────────────── Autenticación (USR-001 a USR-008) ────────────────────────────

class UserNotFoundException(UsuarioBaseException):
    """El usuario solicitado no existe en la base de datos."""
    code = 'USR-001'
    severity = 'INFO'
    message = 'Usuario no encontrado'


class InvalidCredentialsException(UsuarioBaseException):
    """Las credenciales proporcionadas no coinciden con ningún registro."""
    code = 'USR-002'
    severity = 'INFO'
    message = 'Credenciales incorrectas'


class AccountLockedException(UsuarioBaseException):
    """La cuenta está bloqueada por seguridad (RN-004: ≥5 intentos fallidos o decisión admin)."""
    code = 'USR-003'
    severity = 'WARNING'
    message = 'Cuenta bloqueada'


class AccountDisabledException(UsuarioBaseException):
    """La cuenta está deshabilitada (estado Inactivo)."""
    code = 'USR-004'
    severity = 'WARNING'
    message = 'Cuenta deshabilitada'


class AccountNotVerifiedException(UsuarioBaseException):
    """La cuenta no ha verificado el correo electrónico."""
    code = 'USR-005'
    severity = 'INFO'
    message = 'Cuenta sin verificar'


class SessionExpiredException(UsuarioBaseException):
    """La sesión ha expirado (refresh token expirado o blacklisted)."""
    code = 'USR-006'
    severity = 'INFO'
    message = 'Sesión expirada'


class InvalidTokenException(UsuarioBaseException):
    """El token proporcionado no es válido (malformado, manipulado o inexistente)."""
    code = 'USR-007'
    severity = 'INFO'
    message = 'Token inválido'


class TokenExpiredException(UsuarioBaseException):
    """El token ha superado su fecha de expiración."""
    code = 'USR-008'
    severity = 'INFO'
    message = 'Token expirado'


# ──────────────────────────── Autorización (USR-009 a USR-011) ────────────────────────────

class UnauthorizedAccessException(UsuarioBaseException):
    """El usuario no está autenticado (falta token o es inválido)."""
    code = 'USR-009'
    severity = 'WARNING'
    message = 'Usuario sin autenticación'


class ForbiddenOperationException(UsuarioBaseException):
    """El usuario autenticado no tiene permisos para la operación solicitada."""
    code = 'USR-010'
    severity = 'WARNING'
    message = 'Usuario sin permisos suficientes'


class RoleNotFoundException(UsuarioBaseException):
    """El rol especificado no existe en el sistema."""
    code = 'USR-011'
    severity = 'INFO'
    message = 'Rol inexistente'


# ──────────────────────────── Perfil de usuario (USR-012 a USR-016) ────────────────────────────

class UserProfileNotFoundException(UsuarioBaseException):
    """El perfil del usuario no fue encontrado."""
    code = 'USR-012'
    severity = 'INFO'
    message = 'Perfil no encontrado'


class InvalidProfileDataException(UsuarioBaseException):
    """Los datos del perfil no pasaron las validaciones de negocio."""
    code = 'USR-013'
    severity = 'INFO'
    message = 'Datos de perfil inválidos'


class AvatarUploadException(UsuarioBaseException):
    """Error durante la subida de la imagen de perfil."""
    code = 'USR-014'
    severity = 'ERROR'
    message = 'Error al subir imagen de perfil'


class FileSizeExceededException(UsuarioBaseException):
    """El archivo subido excede el tamaño máximo permitido."""
    code = 'USR-015'
    severity = 'INFO'
    message = 'Archivo excede tamaño permitido'


class UnsupportedFileFormatException(UsuarioBaseException):
    """El formato del archivo subido no está soportado."""
    code = 'USR-016'
    severity = 'INFO'
    message = 'Formato de archivo no soportado'


# ──────────────────────────── Integraciones (USR-017 a USR-019) ────────────────────────────

class ExternalServiceException(UsuarioBaseException):
    """Error general en un servicio externo (API de terceros, CDN, etc.)."""
    code = 'USR-017'
    severity = 'ERROR'
    message = 'Error en servicio externo'


class ApiTimeoutException(UsuarioBaseException):
    """Timeout en la comunicación con una API externa."""
    code = 'USR-018'
    severity = 'ERROR'
    message = 'Timeout en API externa'


class ThirdPartyAuthenticationException(UsuarioBaseException):
    """Error en el proceso de autenticación con un proveedor externo."""
    code = 'USR-019'
    severity = 'WARNING'
    message = 'Error en autenticación externa'
