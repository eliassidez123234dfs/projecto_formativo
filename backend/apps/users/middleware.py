import uuid
import logging

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class RequestIDMiddleware(MiddlewareMixin):
    """Agrega un ID único a cada request para trazabilidad"""

    def process_request(self, request):
        request.request_id = str(uuid.uuid4())[:8]

    def process_response(self, request, response):
        response['X-Request-ID'] = getattr(request, 'request_id', 'unknown')
        return response


class ExceptionLoggingMiddleware(MiddlewareMixin):
    """Logea excepciones no manejadas con contexto adicional"""

    def process_exception(self, request, exception):
        request_id = getattr(request, 'request_id', 'N/A')
        user = getattr(request, 'user', None)
        user_info = f'User: {user}' if user and user.is_authenticated else 'Anonymous'
        logger.error(
            'Unhandled exception [%s] %s: %s',
            request_id, user_info, exception, exc_info=True
        )
        return None


class ContentSecurityPolicyMiddleware(MiddlewareMixin):
    """Agrega Content-Security-Policy header a todas las respuestas"""

    def process_response(self, request, response):
        csp = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob: https://res.cloudinary.com; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-src 'none'; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self' https://sandbox.wompi.co; "
        )
        response['Content-Security-Policy'] = csp
        return response
