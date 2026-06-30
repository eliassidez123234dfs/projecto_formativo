from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from ..models import Usuario


class UsuarioJWTAuthentication(JWTAuthentication):
    """JWT Authentication personalizado que usa el modelo Usuario
    en lugar del auth.User por defecto, con soporte para token_version."""

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

    def authenticate(self, request):
        """Authenticate user via Authorization header or httpOnly cookie fallback."""
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
