# ==============================================================================
# Manejador uniforme de errores — Red Estampación
# ==============================================================================
# Implementa un manejador de excepciones global (custom_exception_handler)
# que reemplaza al default de Django REST Framework.
#
# Patrón: Estrategia de manejo de errores (Strategy).
# - Convierte cualquier excepción en una respuesta JSON con formato uniforme.
# - Clasifica errores por severidad (INFO/WARNING/ERROR/CRITICAL).
# - Mapea severidad a código HTTP y nivel de log.
#
# Formato de respuesta uniforme:
#   {
#     "errorCode": "REG-001",
#     "exception": "InvalidEmailException",
#     "message": "Formato de correo inválido",
#     "userMessage": "El correo ingresado no es válido.",
#     "severity": "INFO",
#     "context": { ... },
#     "timestamp": "2026-06-30T12:00:00Z",
#     "requestId": "a1b2c3d4"
#   }
# ==============================================================================
import logging
import traceback
from datetime import datetime, timezone

from django.http import JsonResponse
from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework import status

from .exceptions import BaseAppException
from .middleware import get_current_request_id

logger = logging.getLogger(__name__)

# ── Mapeo de severidad → código HTTP ──
# Determina el código de estado HTTP según la severidad del error.
#   INFO/WARNING → 400 (error del cliente)
#   ERROR        → 500 (error interno)
#   CRITICAL     → 503 (servicio no disponible)
SEVERITY_HTTP_STATUS = {
    'INFO': status.HTTP_400_BAD_REQUEST,
    'WARNING': status.HTTP_400_BAD_REQUEST,
    'ERROR': status.HTTP_500_INTERNAL_SERVER_ERROR,
    'CRITICAL': status.HTTP_503_SERVICE_UNAVAILABLE,
}

# ── Mapeo de severidad → nivel de log ──
SEVERITY_LOG_LEVEL = {
    'INFO': logging.INFO,
    'WARNING': logging.WARNING,
    'ERROR': logging.ERROR,
    'CRITICAL': logging.CRITICAL,
}


# ─────────────────────────────────────────────────────────────────────────────
# Función auxiliar: _build_error_response
# ─────────────────────────────────────────────────────────────────────────────
# Construye una respuesta JSON con el formato de error uniforme.
#
# Si la excepción es una BaseAppException, usa su método to_dict() que
# ya contiene toda la información estructurada (código, mensaje, severidad,
# contexto, timestamp, requestId).
#
# Si es una excepción genérica no controlada, construye un objeto de error
# con código APP-500, severidad CRITICAL y un mensaje genérico para el
# usuario (sin filtrar información sensible).
# ─────────────────────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────────────────────
# Manejador global de excepciones: custom_exception_handler
# ─────────────────────────────────────────────────────────────────────────────
# Reemplaza el exception_handler de DRF. Flujo de decisión:
#
# 1. ¿Es una BaseAppException?
#    → Usa su severidad para determinar HTTP status y nivel de log.
#    → Genera entrada de log estructurada (to_log).
#    → Retorna respuesta JSON con to_dict().
#
# 2. ¿Es una excepción de DRF (ValidationError, etc.)?
#    → Extrae el primer mensaje de error del serializador.
#    → Mapea a formato uniforme con código DRF-{status_code}.
#    → Severidad: WARNING si <500, ERROR si ≥500.
#
# 3. ¿Es una excepción completamente no manejada?
#    → Log CRITICAL con traceback completo.
#    → Retorna 500 Internal Server Error genérico.
#
# Patrón: Chain of Responsibility (cada handler intenta procesar o
# delega al siguiente).
# ─────────────────────────────────────────────────────────────────────────────
def custom_exception_handler(exc, context):
    request = context.get('request') if isinstance(context, dict) else getattr(context, 'request', None)

    # ── Caso 1: Excepción personalizada del sistema (BaseAppException) ──
    if isinstance(exc, BaseAppException):
        http_status = SEVERITY_HTTP_STATUS.get(exc.severity, status.HTTP_500_INTERNAL_SERVER_ERROR)
        log_level = SEVERITY_LOG_LEVEL.get(exc.severity, logging.ERROR)

        log_entry = exc.to_log(request=request, user=getattr(request, 'user', None), operation=request.path if request else '')
        logger.log(log_level, '%s | %s | %s', exc.code, exc.exception, exc.message, extra={'log_entry': log_entry})

        return _build_error_response(exc, http_status, request)

    # ── Caso 2: Excepción de DRF (validación, permisos, etc.) ──
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

    # ── Caso 3: Excepción no manejada (error crítico) ──
    logger.critical(
        'Unhandled exception | path=%s | exc=%s\n%s',
        request.path if request else 'unknown', exc, traceback.format_exc(),
    )

    return _build_error_response(exc, status.HTTP_500_INTERNAL_SERVER_ERROR, request)
