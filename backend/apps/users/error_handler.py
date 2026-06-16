import logging
import traceback
from datetime import datetime, timezone

from django.http import JsonResponse
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework import status

from .exceptions import BaseAppException
from .middleware import get_current_request_id

logger = logging.getLogger(__name__)

SEVERITY_HTTP_STATUS = {
    'INFO': status.HTTP_400_BAD_REQUEST,
    'WARNING': status.HTTP_400_BAD_REQUEST,
    'ERROR': status.HTTP_500_INTERNAL_SERVER_ERROR,
    'CRITICAL': status.HTTP_503_SERVICE_UNAVAILABLE,
}

SEVERITY_LOG_LEVEL = {
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL,
}


def _build_error_response(exc, http_status, request=None):
    if isinstance(exc, BaseAppException):
        error_data = exc.to_dict()
    else:
        error_data = {
            'errorCode': 'APP-500',
            'exception': type(exc).__name__,
            'message': str(exc) or 'Error interno del servidor',
            'userMessage': 'Ocurrió un error inesperado. Intenta más tarde.',
            'severity': 'CRITICAL',
            'context': {},
            'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z') + 'Z',
            'requestId': get_current_request_id() or '',
        }

    return JsonResponse(error_data, status=http_status)


def custom_exception_handler(exc, context):
    request = context.get('request') if isinstance(context, dict) else getattr(context, 'request', None)

    if isinstance(exc, BaseAppException):
        http_status = SEVERITY_HTTP_STATUS.get(exc.severity, status.HTTP_500_INTERNAL_SERVER_ERROR)
        log_level = SEVERITY_LOG_LEVEL.get(exc.severity, logging.ERROR)

        log_entry = exc.to_log(request=request, user=getattr(request, 'user', None), operation=request.path if request else '')
        logger.log(log_level, '%s | %s | %s', exc.code, exc.exception, exc.message, extra={'log_entry': log_entry})

        return _build_error_response(exc, http_status, request)

    response = drf_exception_handler(exc, context)

    if response is not None:
        data = response.data
        if isinstance(data, dict):
            first_field = next(iter(data.values())) if data else ''
            first_msg = first_field[0] if isinstance(first_field, list) and first_field else str(first_field)

            error_data = {
                'errorCode': f'DRF-{response.status_code}',
                'exception': type(exc).__name__,
                'message': str(exc),
                'userMessage': first_msg,
                'severity': 'WARNING' if response.status_code < 500 else 'ERROR',
                'context': dict(data) if isinstance(data, dict) else {},
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z') + 'Z',
                'requestId': get_current_request_id() or '',
            }
            return JsonResponse(error_data, status=response.status_code)

        return response

    logger.critical(
        'Unhandled exception | path=%s | exc=%s\n%s',
        request.path if request else 'unknown', exc, traceback.format_exc(),
    )

    return _build_error_response(exc, status.HTTP_500_INTERNAL_SERVER_ERROR, request)
