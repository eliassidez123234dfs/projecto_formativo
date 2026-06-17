import uuid
import logging
import threading
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

_thread_local = threading.local()


def get_current_request_id():
    return getattr(_thread_local, 'request_id', None)


class RequestIDMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request_id = request.META.get('HTTP_X_REQUEST_ID') or str(uuid.uuid4())
        request.request_id = request_id
        _thread_local.request_id = request_id

    def process_response(self, request, response):
        request_id = getattr(request, 'request_id', None)
        if request_id:
            response['X-Request-ID'] = request_id
        return response


class ExceptionLoggingMiddleware(MiddlewareMixin):
    def process_exception(self, request, exception):
        request_id = getattr(request, 'request_id', 'unknown')
        user_id = getattr(request.user, 'id', None) if hasattr(request, 'user') else None
        logger.error(
            'Unhandled exception | request_id=%s | user=%s | path=%s | method=%s | exc=%s',
            request_id, user_id, request.path, request.method, exception,
            exc_info=True,
        )
