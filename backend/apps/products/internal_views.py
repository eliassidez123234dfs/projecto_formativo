"""
Endpoints internos de productos para comunicación servicio-a-servicio.

NO están protegidos por JWT: no hay un usuario detrás de la llamada, es el
microservicio Spring Boot (InterServiceClient) consultando a Django. Se
autentican con el header `X-Internal-Token` contra
`settings.INTERNAL_API_TOKEN`.

Montados bajo /api/internal/products/ (ver config/urls.py) — fuera del
namespace público /api/products/ para que quede claro que no son parte de
la API que consume el frontend.

| Endpoint        | Para qué                                        |
|-----------------|-------------------------------------------------|
| health/         | Verificar que Django responde                  |
| stats/          | Agregados por estado (dashboard de Spring)      |
| recent/         | Sync incremental: qué cambió desde una fecha   |
| exists/         | Detectar referencias duplicadas entre backends |
"""
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.http import require_GET

from apps.orders.api.interservice import no_autorizado, token_interno_valido
from apps.products.models import Product

MAX_LIMIT = 500
DEFAULT_LIMIT = 100


# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────

def _serializar(p: Product) -> dict:
    """Snapshot mínimo para sincronización (evita enviar blobs de imagen)."""
    return {
        'id': p.id,
        'name': p.name,
        'base_price': str(p.base_price),
        'referencia': p.referencia,
        'stock': p.stock,
        'is_active': p.is_active,
        'is_approved': p.is_approved,
        'updated_at': p.updated_at.isoformat(),
    }


# ────────────────────────────────────────────────────────────────────────────
# 1. Health check
# ────────────────────────────────────────────────────────────────────────────
@require_GET
def products_health(request):
    """Spring verifica que Django responde antes de operar.

    Responde 200 si la BD responde; el token se valida igual para no filtrar
    el estado interno a cualquier llamador.
    """
    if not token_interno_valido(request):
        return no_autorizado()

    return JsonResponse({
        'status': 'ok',
        'totalProducts': Product.objects.count(),
        'activeProducts': Product.objects.filter(
            is_active=True, is_approved=True,
        ).count(),
        'timestamp': timezone.now().isoformat(),
    })


# ────────────────────────────────────────────────────────────────────────────
# 2. Estadísticas agregadas
# ────────────────────────────────────────────────────────────────────────────
@require_GET
def products_stats(request):
    """Conteos por estado para el dashboard del microservicio."""
    if not token_interno_valido(request):
        return no_autorizado()

    stats = Product.objects.aggregate(
        total=Count('id'),
        activos=Count('id', filter=Q(is_active=True, is_approved=True)),
        inactivos=Count('id', filter=Q(is_active=False, is_approved=True)),
        borrados=Count('id', filter=Q(is_active=False, is_approved=False)),
        pendientes_aprobacion=Count('id', filter=Q(is_approved=False)),
    )
    return JsonResponse(stats)


# ────────────────────────────────────────────────────────────────────────────
# 3. Sync incremental: qué cambió desde una fecha
# ────────────────────────────────────────────────────────────────────────────
@require_GET
def products_recent(request):
    """Productos con updated_at >= ?since (ISO 8601).

    Query params:
      - since  (requerido) ISO 8601, ej: 2026-09-20T00:00:00Z
      - limit  (opcional)  default 100, tope 500

    Spring usa esto para traer solo el delta en vez de volcar el catálogo
    completo en cada sincronización.
    """
    if not token_interno_valido(request):
        return no_autorizado()

    since_raw = request.GET.get('since')
    if not since_raw:
        return JsonResponse(
            {'error': 'Parametro "since" es requerido (ISO 8601)'}, status=400,
        )

    since = parse_datetime(since_raw)
    if since is None:
        return JsonResponse(
            {'error': 'Formato invalido. Use ISO 8601 (ej: 2026-09-20T00:00:00Z)'},
            status=400,
        )
    # updated_at es timestamptz: sin offset, Django emite un RuntimeWarning
    # y Postgres compara en la zona del servidor.
    if timezone.is_naive(since):
        since = timezone.make_aware(since, timezone.get_current_timezone())

    try:
        limit = min(max(int(request.GET.get('limit', DEFAULT_LIMIT)), 1), MAX_LIMIT)
    except (TypeError, ValueError):
        limit = DEFAULT_LIMIT

    productos = list(
        Product.objects
        .filter(updated_at__gte=since)
        .order_by('-updated_at')[:limit]
    )
    data = [_serializar(p) for p in productos]

    return JsonResponse({
        'count': len(data),
        'since': since.isoformat(),
        'products': data,
    })


# ────────────────────────────────────────────────────────────────────────────
# 4. Referencia duplicada entre backends
# ────────────────────────────────────────────────────────────────────────────
@require_GET
def products_exists(request):
    """¿Existe ya esta referencia? Evita crear el mismo producto dos veces.

    Query param: ref
    """
    if not token_interno_valido(request):
        return no_autorizado()

    ref = request.GET.get('ref', '').strip()
    if not ref:
        return JsonResponse(
            {'error': 'Parametro "ref" es requerido'}, status=400,
        )

    return JsonResponse({
        'referencia': ref,
        'exists': Product.objects.filter(referencia=ref).exists(),
    })
