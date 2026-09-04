# ==============================================================================
#  ARCHIVO: validators.py (apps/users/)
#  PROPÓSITO: Validadores reutilizables del módulo de usuarios.
#             Centraliza reglas de validación para evitar duplicación (DRY)
#             entre serializadores y vistas.
#
#  PRINCIPIO SOLID APLICADO:
#  - Single Responsibility: Cada validador se enfoca en UNA regla de negocio.
#  - Dependency Inversion: Los serializadores dependen de estas funciones
#    abstractas en lugar de implementar su propia validación.
#
#  PATRONES DE DISEÑO:
#  - Strategy Pattern: Cada función de validación encapsula un algoritmo
#    (regla de negocio) intercambiable. validate_password_strength y
#    validate_passwords_match son estrategias concretas.
#  - Template Method: Las excepciones específicas (InvalidPasswordFormat)
#    estandarizan el formato de error hacia el frontend.
# ==============================================================================

import re

from django.contrib.auth.hashers import is_password_usable

from .exceptions import InvalidPasswordFormatException


# =============================================================================
#  VALIDACIÓN DE CONTRASEÑA (RN-001)
# =============================================================================
# Requisitos mínimos de seguridad para contraseñas según RN-001:
#   - Mínimo 8 caracteres.
#   - Al menos una letra mayúscula.
#   - Al menos un número.
#   - Al menos un carácter especial (!@#$%^&*(),.?":{}|<>).
#
#  Patrón: Strategy — encapsula la política de seguridad de contraseñas
#  y puede ser intercambiada sin modificar los serializadores.
# =============================================================================

PASSWORD_SPECIAL_CHARS = r'[!@#$%^&*(),.?":{}|<>]'

def validate_password_strength(password):
    """
    Valida que la contraseña cumpla los requisitos mínimos (RN-001).
    
    Args:
        password: str — Contraseña a validar.
    
    Returns:
        str — La misma contraseña si es válida.
    
    Raises:
        InvalidPasswordFormatException — Si no cumple los requisitos.
    """
    errors = []
    if not password:
        raise InvalidPasswordFormatException(
            'La contraseña es obligatoria.',
            user_message='La contraseña es obligatoria.',
            context={'field': 'contrasena'}
        )
    if len(password) < 8:
        errors.append('Mínimo 8 caracteres.')
    if not re.search(r'[A-Z]', password):
        errors.append('Debe incluir una mayúscula.')
    if not re.search(r'\d', password):
        errors.append('Debe incluir un número.')
    if not re.search(PASSWORD_SPECIAL_CHARS, password):
        errors.append('Debe incluir un carácter especial.')
    if errors:
        raise InvalidPasswordFormatException(
            ' | '.join(errors),
            user_message=' | '.join(errors),
            context={'field': 'contrasena'}
        )
    return password


# =============================================================================
#  VALIDACIÓN CRUZADA DE CONTRASEÑAS
# =============================================================================
# Verifica que dos campos de contraseña (contraseña y confirmación) coincidan.
# Se aplica en registro y cambio de contraseña.
# =============================================================================

def validate_passwords_match(password, confirmacion, field_name='contrasena'):
    """
    Verifica que dos contraseñas coincidan (validación cruzada).
    
    Args:
        password: str — Contraseña principal.
        confirmacion: str — Confirmación de contraseña.
        field_name: str — Nombre del campo para el mensaje de error.
    
    Raises:
        serializers.ValidationError — Si no coinciden.
    """
    from rest_framework import serializers
    if password != confirmacion:
        raise serializers.ValidationError('Las contraseñas no coinciden.')


# =============================================================================
#  VERIFICACIÓN DE HASH DE CONTRASEÑA
# =============================================================================
# Verifica si una contraseña ya está hasheada. Si no lo está, aplica
# make_password automáticamente (defensa en profundidad para evitar
# almacenamiento en texto plano).
# =============================================================================

def ensure_password_hashed(password):
    """
    Retorna la contraseña hasheada si no lo está ya.
    
    Args:
        password: str — Contraseña en texto plano o hasheada.
    
    Returns:
        str — Contraseña hasheada de forma segura.
    
    Patrón: Decorator / Defensive Programming — garantiza que nunca
    se almacene una contraseña en texto plano, sin importar cómo se
    llame al código.
    """
    if password and not is_password_usable(password):
        from django.contrib.auth.hashers import make_password
        return make_password(password)
    return password
