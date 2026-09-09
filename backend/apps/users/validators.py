# ==============================================================================
#  ARCHIVO: validators.py (apps/users/)
#  PROPÓSITO: Validadores reutilizables del módulo de usuarios.
#             Centraliza reglas de validación para evitar duplicación (DRY)
#             entre serializadores y vistas.
# ==============================================================================

import re

from .exceptions import InvalidPasswordFormatException


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
