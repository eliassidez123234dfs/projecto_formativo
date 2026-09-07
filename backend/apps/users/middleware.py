# ==============================================================================
# Middleware — Módulo de Usuarios (Red Estampación)
# ==============================================================================
# Implementa tres middlewares siguiendo el patrón Chain of Responsibility:
# cada middleware en la cadena procesa la request/response y puede:
#   - Modificar la request (process_request)
#   - Modificar la response (process_response)
#   - Manejar excepciones (process_exception)
#   - Pasar al siguiente middleware de la cadena
#
# Middleware incluidos:
#   1. RequestIDMiddleware          → asigna un ID único a cada request
#                                     para trazabilidad extremo a extremo.
#   2. ExceptionLoggingMiddleware   → captura y logea excepciones no manejadas
#                                     con contexto (user, request_id).
#   3. ContentSecurityPolicyMiddleware → inyecta header CSP para mitigar
#                                     ataques XSS y de inyección de contenido.
# ==============================================================================
import uuid
import logging
import threading

from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)

# ── Almacén thread-local para el request_id ──
# Permite acceder al ID de la request actual desde cualquier lugar
# sin tener que pasar el objeto request como parámetro.
_thread_locals = threading.local()


def get_current_request_id():
    """Retorna el request_id de la petición actual (o None si no hay)."""
    return getattr(_thread_locals, 'request_id', None)


# ─────────────────────────────────────────────────────────────────────────────
# Middleware: RequestIDMiddleware
# ─────────────────────────────────────────────────────────────────────────────
# Asigna un identificador único (request_id) a cada solicitud entrante.
# El ID se incluye en el header de respuesta 'X-Request-ID' para
# correlacionar logs del servidor con peticiones del cliente.
#
# Patrón: Chain of Responsibility (process_request → process_response).
# ─────────────────────────────────────────────────────────────────────────────
class RequestIDMiddleware(MiddlewareMixin):
    """Agrega un ID único a cada request para trazabilidad extremo a extremo (header X-Request-ID)."""

    def process_request(self, request):
        request.request_id = str(uuid.uuid4())[:8]
        _thread_locals.request_id = request.request_id

    def process_response(self, request, response):
        response['X-Request-ID'] = getattr(request, 'request_id', 'unknown')
        return response


# ─────────────────────────────────────────────────────────────────────────────
# Middleware: ExceptionLoggingMiddleware
# ─────────────────────────────────────────────────────────────────────────────
# Captura cualquier excepción no manejada (process_exception) y la registra
# con contexto adicional: request_id, usuario (si está autenticado) y
# traceback completo. Siempre retorna None para que la cadena de middleware
# continúe y el error sea manejado por el manejador de excepciones global.
#
# Patrón: Chain of Responsibility (process_exception → pasa al siguiente).
# ─────────────────────────────────────────────────────────────────────────────
class ExceptionLoggingMiddleware(MiddlewareMixin):
    """Logea excepciones no manejadas con contexto adicional (request_id, usuario autenticado)."""

    def process_exception(self, request, exception):
        request_id = getattr(request, 'request_id', 'N/A')
        user = getattr(request, 'user', None)
        user_info = f'User: {user}' if user and user.is_authenticated else 'Anonymous'
        logger.error(
            'Unhandled exception [%s] %s: %s',
            request_id, user_info, exception, exc_info=True
        )
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Middleware: ContentSecurityPolicyMiddleware
# ─────────────────────────────────────────────────────────────────────────────
# Agrega el header HTTP Content-Security-Policy a todas las respuestas.
# Restringe las fuentes desde las que el navegador puede cargar recursos,
# mitigando ataques XSS, clickjacking e inyección de contenido.
#
# Directivas definidas:
#   - default-src 'self': solo recursos del mismo origen.
#   - script-src 'self': sin scripts externos.
#   - style-src 'self' 'unsafe-inline': estilos propios + inline (necesario
#     para algunos frameworks frontend).
#   - img-src 'self' data: blob: https://res.cloudinary.com: imágenes desde
#     el mismo origen, data URIs, blobs y Cloudinary (hosting de imágenes).
#   - form-action 'self' https://sandbox.wompi.co: formularios solo a mismo
#     origen y Wompi (pasarela de pagos en sandbox).
#   - frame-src 'none', object-src 'none': prevención de clickjacking.
#
# Patrón: Chain of Responsibility (process_response).
# ─────────────────────────────────────────────────────────────────────────────
class ContentSecurityPolicyMiddleware(MiddlewareMixin):
    """Agrega el header Content-Security-Policy a todas las respuestas para mitigar XSS y ataques de inyección de contenido."""

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
