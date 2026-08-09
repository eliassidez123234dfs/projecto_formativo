# ==============================================================================
# Backend de autenticación JWT personalizado — Módulo de Usuarios
# ==============================================================================
# Extiende JWTAuthentication de SimpleJWT para:
#   1. Usar el modelo Usuario en lugar de auth.User de Django.
#   2. Verificar token_version en cada petición autenticada (invalidación
#      remota de JWT al bloquear/desactivar la cuenta).
#   3. Soportar autenticación dual: header Authorization (Bearer) como
#      método primario y httpOnly cookie (access_token) como fallback.
#
# Flujo de autenticación:
#   1. authenticate() → intenta header Authorization (método estándar).
#   2. Si no hay header → busca la cookie 'access_token'.
#   3. get_user() → obtiene el usuario y verifica token_version.
#   4. Si token_version no coincide → rechaza (token invalidated).
# ==============================================================================
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from ..models import Usuario


# ─────────────────────────────────────────────────────────────────────────────
# Clase: UsuarioJWTAuthentication
# ─────────────────────────────────────────────────────────────────────────────
# Backend de autenticación JWT personalizado que:
#
# - Usa el modelo Usuario (con USERNAME_FIELD='usuario') en lugar del
#   auth.User por defecto de Django.
# - Verifica token_version: cada JWT contiene la versión del token del
#   usuario al momento de la emisión. Si el usuario es bloqueado/desactivado
#   después, su token_version se incrementa y los JWT anteriores quedan
#   automáticamente invalidados (get_user lanza AuthenticationFailed).
# - Autenticación dual:
#     a) Header Authorization: Bearer <token> (método estándar SimpleJWT).
#     b) Cookie httpOnly 'access_token': usada cuando el frontend no puede
#        enviar el header (ej. navegación directa, descarga de archivos).
#
# Patrón: Adapter sobre JWTAuthentication (extiende la funcionalidad base
# añadiendo verificación de token_version y soporte de cookies).
# ─────────────────────────────────────────────────────────────────────────────
class UsuarioJWTAuthentication(JWTAuthentication):
    """JWT Authentication personalizado. Usa el modelo Usuario en lugar del auth.User por defecto, verifica token_version para invalidación remota de JWT y soporta autenticación vía header Authorization o cookie httpOnly."""

    # ── get_user: recupera el usuario desde el JWT validado ──
    # 1. Extrae user_id del token (USER_ID_CLAIM, por defecto 'user_id').
    # 2. Busca el usuario en BD (Usuario.objects.get).
    # 3. Compara token_version del JWT con el del usuario.
    #    - Si coinciden → el token es válido.
    #    - Si NO coinciden → el token fue emitido antes de un bloqueo/
    #      desactivación. Se rechaza con 'token_invalidated'.
    def get_user(self, validated_token):
        """Retrieve user from validated JWT token, checking token_version for invalidation."""
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken('Token contains no recognizable user identification')

        try:
            user = Usuario.objects.get(**{api_settings.USER_ID_FIELD: int(user_id)})
        except Usuario.DoesNotExist:
            raise AuthenticationFailed('User not found', code='user_not_found')

        # Verificar que la versión del token coincida con la del usuario
        token_ver = validated_token.get('token_version', 0)
        if token_ver != user.token_version:
            raise AuthenticationFailed('Token invalidated', code='token_invalidated')

        return user

    # ── authenticate: punto de entrada de la autenticación ──
    # Estrategia de autenticación en dos pasos:
    #
    # Paso 1 (prioritario): header Authorization.
    #   Llama a super().authenticate() que busca el header
    #   'Authorization: Bearer <token>' y valida el JWT.
    #
    # Paso 2 (fallback): cookie httpOnly.
    #   Si no hay header, busca la cookie 'access_token',
    #   la valida y obtiene el usuario.
    #
    # Esto permite que el frontend use cookies para peticiones
    # regulares (protección XSS) y headers para peticiones
    # programáticas (fetch nativo, Postman, etc.).
    def authenticate(self, request):
        """Authenticate user via Authorization header (primary) or httpOnly cookie (fallback)."""
        # Primero intentar el método estándar (header Authorization)
        user = super().authenticate(request)
        if user is not None:
            return user

        # Si no hay header, intentar leer el token de la cookie
        access_token = request.COOKIES.get('access_token')
        if access_token:
            validated_token = self.get_validated_token(access_token)
            user = self.get_user(validated_token)
            return (user, validated_token)

        return None
