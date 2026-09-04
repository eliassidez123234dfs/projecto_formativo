from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from ..models import Usuario


class UsuarioTokenRefreshSerializer(TokenRefreshSerializer):
    """Serializador de refresh que usa el modelo Usuario en lugar de auth.User.

    Los tokens se emiten en LoginViewSet con RefreshToken.for_user(Usuario),
    así que el refresh debe buscar en la tabla `usuarios`. Si el usuario ya no
    existe (fue eliminado/baneado), se devuelve un 401 en vez de un 500.
    """

    def validate(self, attrs):
        refresh = RefreshToken(attrs['refresh'])

        user_id = refresh.payload.get(api_settings.USER_ID_CLAIM, None)
        if user_id:
            try:
                user = Usuario.objects.get(
                    **{api_settings.USER_ID_FIELD: int(user_id)}
                )
            except (Usuario.DoesNotExist, TypeError, ValueError):
                raise AuthenticationFailed(
                    self.error_messages['no_active_account'],
                    'no_active_account',
                )

            if user.eliminado or user.estado != 'Activo':
                raise AuthenticationFailed(
                    self.error_messages['no_active_account'],
                    'no_active_account',
                )

        return {'access': str(refresh.access_token)}


class UsuarioTokenRefreshView(TokenRefreshView):
    serializer_class = UsuarioTokenRefreshSerializer
