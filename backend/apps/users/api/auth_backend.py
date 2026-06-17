from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken
from rest_framework_simplejwt.settings import api_settings
from ..models import Usuario


class UsuarioJWTAuthentication(JWTAuthentication):
    """JWT Authentication personalizado que usa el modelo Usuario
    en lugar del auth.User por defecto."""

    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken('Token contains no recognizable user identification')

        try:
            user = Usuario.objects.get(**{api_settings.USER_ID_FIELD: int(user_id)})
        except Usuario.DoesNotExist:
            raise AuthenticationFailed('User not found', code='user_not_found')

        return user
