const KNOWN_STATUSES = {
  400: {
    name: 'Solicitud no válida',
    es: 'La solicitud enviada no se pudo procesar. Recarga la página e intenta de nuevo. Si el problema continúa, contacta a los administradores.',
    en: 'The request could not be processed. Please reload the page and try again. If the problem persists, contact an administrator.',
    devEs: 'El servidor rechazó la solicitud por datos no válidos (HTTP 400 Bad Request). Verifica los campos enviados.',
    devEn: 'The server rejected the request due to invalid data (HTTP 400 Bad Request). Check the fields that were sent.',
  },
  401: {
    name: 'No autorizado',
    es: 'Tu sesión no está activa o el acceso fue rechazado. Inicia sesión nuevamente o contacta a los administradores.',
    en: 'Your session is not active or access was denied. Please sign in again or contact an administrator.',
    devEs: 'El token de autenticación faltó, venció o no es válido (HTTP 401 Unauthorized). Revisa el flujo de login y de refresh del token.',
    devEn: 'The authentication token was missing, expired or invalid (HTTP 401 Unauthorized). Review the login and token refresh flow.',
  },
  403: {
    name: 'Acceso denegado',
    es: 'No tienes permisos para realizar esta acción. Si crees que es un error, contacta a los administradores.',
    en: 'You do not have permission to perform this action. If you believe this is a mistake, contact an administrator.',
    devEs: 'El usuario autenticado no tiene el permiso requerido para este recurso (HTTP 403 Forbidden). Revisa el rol y los permisos.',
    devEn: 'The authenticated user lacks the required permission for this resource (HTTP 403 Forbidden). Review the role and permissions.',
  },
  404: {
    name: 'No encontrado',
    es: 'Lo que buscas no existe o fue movido de lugar. Recarga la página o vuelve al inicio. Si sigues viendo este error, contacta a los administradores.',
    en: 'What you are looking for does not exist or was moved. Reload the page or go back to the home page. If you keep seeing this error, contact an administrator.',
    devEs: 'El recurso solicitado no existe en el servidor (HTTP 404 Not Found). Verifica que el ID o la ruta sean correctos.',
    devEn: 'The requested resource does not exist on the server (HTTP 404 Not Found). Check that the ID or the route is correct.',
  },
  405: {
    name: 'Acción no permitida',
    es: 'Esta acción no está disponible en la página actual. Recarga la página e intenta de nuevo.',
    en: 'This action is not available on the current page. Reload the page and try again.',
    devEs: 'El método HTTP usado no está permitido para este endpoint (HTTP 405 Method Not Allowed). Revisa la ruta y el verbo.',
    devEn: 'The HTTP method used is not allowed for this endpoint (HTTP 405 Method Not Allowed). Check the route and the verb.',
  },
  429: {
    name: 'Demasiadas solicitudes',
    es: 'Has enviado muchas solicitudes en poco tiempo. Espera un momento y vuelve a intentarlo.',
    en: 'Too many requests. Please wait a moment and try again.',
    devEs: 'Se superó el límite de solicitudes para la IP o el usuario (HTTP 429 Too Many Requests). Revisa la configuración de throttling.',
    devEn: 'The request rate limit was exceeded for the IP or the user (HTTP 429 Too Many Requests). Check the throttling configuration.',
  },
  500: {
    name: 'Error del servidor',
    es: 'Algo salió mal de nuestro lado, no en tu equipo. Espera unos segundos y recarga la página. Si el problema continúa, contacta a los administradores.',
    en: 'Something went wrong on our side, not yours. Please wait a few seconds and reload the page. If the problem persists, contact an administrator.',
    devEs: 'El servidor falló al procesar la solicitud (HTTP 500 Internal Server Error). Revisa los archivos de log de errores del backend.',
    devEn: 'The server failed while processing the request (HTTP 500 Internal Server Error). Review the backend error log files.',
  },
  502: {
    name: 'Servidor no disponible',
    es: 'El servidor tardó demasiado en responder. Espera unos segundos y recarga la página.',
    en: 'The server took too long to respond. Please wait a few seconds and reload the page.',
    devEs: 'Un servicio intermedio respondió de forma inválida (HTTP 502 Bad Gateway). Verifica el estado de los servicios dependientes.',
    devEn: 'An intermediate service responded in an invalid way (HTTP 502 Bad Gateway). Check the status of dependent services.',
  },
  503: {
    name: 'Servicio en mantenimiento',
    es: 'El servicio está en mantenimiento o no está disponible por el momento. Espera un momento e intenta de nuevo.',
    en: 'The service is temporarily unavailable. Please wait a moment and try again.',
    devEs: 'El servidor no está disponible temporalmente (HTTP 503 Service Unavailable). Revisa si el servicio está en mantenimiento o sobrecargado.',
    devEn: 'The server is temporarily unavailable (HTTP 503 Service Unavailable). Check whether the service is down for maintenance or overloaded.',
  },
};

const FALLBACK = {
  name: 'Error inesperado',
  es: 'Ocurrió un error inesperado. Recarga la página e intenta de nuevo. Si el problema continúa, contacta a los administradores.',
  en: 'An unexpected error occurred. Please reload the page and try again. If the problem persists, contact an administrator.',
  devEs: 'Ocurrió un error sin código HTTP asociado. Revisa la consola del navegador y los archivos de log del backend.',
  devEn: 'An error occurred without an associated HTTP status code. Check the browser console and the backend log files.',
};

export function getErrorInfo(status) {
  if (status && KNOWN_STATUSES[status]) return KNOWN_STATUSES[status];
  return FALLBACK;
}
