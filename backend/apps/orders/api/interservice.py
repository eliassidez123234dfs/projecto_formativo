"""
Endpoints inter-servicio: consultas que el microservicio Spring Boot hace
sobre Django. NO usan JWT de usuario (no hay un usuario detrás de la llamada,
es máquina-a-máquina); se autentican con el header `X-Internal-Token`
comparado contra `settings.INTERNAL_API_TOKEN`.

 Consumidor: InterServiceClient (com.example.servicio.client)
"""
import hmac

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from apps.orders.models import OrderItem


def token_interno_valido(request) -> bool:
    """Valida el header X-Internal-Token en tiempo constante (compare_digest).

    Si INTERNAL_API_TOKEN no está configurado en el entorno, la comparación
    falla siempre: el endpoint queda cerrado (fail-closed) en vez de abierto
    con un token por defecto conocido.
    """
    esperado = settings.INTERNAL_API_TOKEN
    recibido = request.headers.get('X-Internal-Token', '')
    if not esperado or not recibido:
        return False
    return hmac.compare_digest(str(recibido), str(esperado))


def no_autorizado() -> JsonResponse:
    return JsonResponse(
        {'error': 'Token interno invalido o ausente'},
        status=401,
    )


@require_GET
def check_product_orders(request, product_id: int):
    """¿Existen líneas de orden que referencian este producto?

    Lo consume ProductoServiceImpl.purgarProducto antes de un hard delete.
    Respuesta: {"has_orders": bool, "order_count": int, "product_id": int}
    """
    if not token_interno_valido(request):
        return no_autorizado()

    count = OrderItem.objects.filter(product_id=product_id).count()
    return JsonResponse({
        'has_orders': count > 0,
        'order_count': count,
        'product_id': product_id,
    })
