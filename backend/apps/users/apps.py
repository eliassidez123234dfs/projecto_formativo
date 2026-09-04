import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class UsersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.users'

    def ready(self):
        from .mongodb import is_mongo_connected
        from .mongo_service import ensure_indexes
        try:
            if is_mongo_connected() is False:
                from .mongodb import get_mongo_client
                get_mongo_client()
            ensure_indexes()
        except Exception as exc:
            logger.warning('No se pudieron inicializar índices MongoDB: %s', exc)
