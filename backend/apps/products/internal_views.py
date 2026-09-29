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
| categories/     | Categorías de un producto (lectura y escritura)|
| dependencies/   | Purga en cascada del lado Django de un producto|
"""
import json
import logging

from django.db import transaction
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from apps.carts.models import CartItem
from apps.catalog.models import Category, ProductCategory
from apps.orders.api.interservice import no_autorizado, token_interno_valido

logger = logging.getLogger(__name__)
from apps.products.models import Product, Review

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



# ────────────────────────────────────────────────────────────────────────────
# 5. Categorías de un producto
# ────────────────────────────────────────────────────────────────────────────
def _categorias_de(product_ref):
    """Categorías asignadas al producto, solo las que siguen activas.

    Filtra por is_active para que el frontend no ofrezca marcar una categoría
    que el catálogo ya no usa. Se consulta por product_ref y no por la FK
    porque en la rama java/mongoDB el producto no está en products_product.
    """
    return [
        {'id': rel.category_id, 'name': rel.category.name}
        for rel in ProductCategory.objects
        .filter(product_ref=product_ref)
        .select_related('category')
        .order_by('category__name')
        if rel.category.is_active
    ]


@require_GET
def products_categories(request, product_ref):
    """Categorías de un producto de MongoDB.

    Sustituye a GET /api/products/<id>/ de Django, que no puede resolver un
    ObjectId: products_product está vacío en esta rama y el id del producto no
    existe allí. Spring lo usa para devolver `categorias` dentro de
    ProductoResponse, de modo que el frontend necesite una sola llamada para pintar el
    detalle y el formulario de edición con las casillas ya marcadas.
    """
    if not token_interno_valido(request):
        return no_autorizado()

    ref = (product_ref or '').strip()
    if not ref:
        return JsonResponse({'error': 'Parametro "product_ref" es requerido'}, status=400)

    return JsonResponse({
        'product_ref': ref,
        'categories': _categorias_de(ref),
    })


@csrf_exempt
@require_http_methods(['PUT'])
def products_categories_set(request, product_ref):
    """Reemplaza el conjunto de categorías del producto.

    Es un PUT y no un POST a propósito: lo que el formulario de edición
    significa es "estas son las marcadas". El conjunto recibido es la verdad y
    las que falten se desasignan. Con un POST el cliente tendría que calcular
    la diferencia, que es justo donde se cuelan los productos que se quedan sin
    categorías al guardar.

    Body: {"categoria_ids": [1, 4, 7]}

    Idempotente: reenviar el mismo conjunto no duplica filas ni falla, así que
    Spring puede reintentar sin miedo.
    """
    if not token_interno_valido(request):
        return no_autorizado()

    ref = (product_ref or '').strip()
    if not ref:
        return JsonResponse({'error': 'Parametro "product_ref" es requerido'}, status=400)

    try:
        payload = json.loads(request.body or b'{}')
    except (TypeError, ValueError):
        return JsonResponse({'error': 'JSON invalido'}, status=400)

    if not isinstance(payload, dict):
        return JsonResponse({'error': 'Se esperaba un objeto JSON'}, status=400)

    crudos = payload.get('categoria_ids', [])
    if not isinstance(crudos, list):
        return JsonResponse({'error': '"categoria_ids" debe ser una lista'}, status=400)

    # Se cruzan con las que existen y están activas. Un id que no exista (por
    # ejemplo una categoría desactivada entre la lectura y el guardado) se
    # ignora en lugar de abortar: es preferible guardar el resto de cambios
    # que perderlos todos por un id obsoleto. Los ignorados se devuelven para
    # que quede registrado en el log del servicio.
    validas = set(Category.objects.filter(id__in=crudos, is_active=True)
                  .values_list('id', flat=True))
    ids = sorted(validas)

    with transaction.atomic():
        ProductCategory.objects.filter(product_ref=ref).exclude(category_id__in=ids).delete()
        ProductCategory.objects.bulk_create(
            [ProductCategory(product_ref=ref, category_id=cid) for cid in ids],
            ignore_conflicts=True,
        )

    return JsonResponse({
        'product_ref': ref,
        'categories': _categorias_de(ref),
        'ignorados': sorted(set(crudos) - validas),
    })


# ────────────────────────────────────────────────────────────────────────────
# 6. Archivos de imagen en Cloudinary
# ────────────────────────────────────────────────────────────────────────────
@csrf_exempt
@require_http_methods(['DELETE'])
def products_archivos(request):
    """Borra un archivo de Cloudinary a partir de su public_id.

    MongoDB guarda la referencia (`image`) y Cloudinary guarda el binario.
    Cuando Spring elimina una imagen, su documento ya no existe pero el archivo
    sigue ahí y se sigue pagando, así que avisa por aquí para limpiarlo.

    DELETE /api/internal/products/archivos/?path=products/2026/09/<uuid>
    """
    if not token_interno_valido(request):
        return no_autorizado()

    nombre = (request.GET.get('path') or '').strip()
    if not nombre:
        return JsonResponse({'error': 'Falta el public_id del archivo'}, status=400)
    if not nombre.startswith('products/') or '..' in nombre:
        # Solo dentro de products/: sin esto, este endpoint permitiría borrar
        # cualquier clave del bucket indicando su nombre.
        return JsonResponse({'error': 'Solo se admiten rutas de products/'}, status=400)

    from django.core.files.storage import default_storage

    if not default_storage.exists(nombre):
        # Idempotente: que no exista significa que el objetivo ya se cumplió.
        return JsonResponse({'image': nombre, 'borrado': False})

    try:
        default_storage.delete(nombre)
    except Exception as exc:  # pragma: no cover - depende de Cloudinary
        logger.exception('No se pudo borrar %s de Cloudinary: %s', nombre, exc)
        return JsonResponse({'error': 'No se pudo borrar el archivo'}, status=502)

    return JsonResponse({'image': nombre, 'borrado': True})


# ────────────────────────────────────────────────────────────────────────────
# 7. Purga en cascada del lado Django
# ────────────────────────────────────────────────────────────────────────────
# ────────────────────────────────────────────────────────────────────────────
@require_http_methods(['DELETE'])
def products_dependencies(request, product_ref: str):
    """Borra las filas de Django que apuntan a un producto de MongoDB.

    En la rama java/mongoDB el producto NO vive en products_product: vive en
    la colección `productos` de MongoDB, y su _id es un ObjectId. Por eso
    Spring no puede limpiar estas tablas por sí solo (están en el PostgreSQL
    de Django) y le pide a Django que haga su propia parte de la cascada.

    Cubre las referencias con on_delete=CASCADE, que de otro modo quedarían
    huérfanas apuntando a un producto que ya no existe:
        carts_cartitem           (carrito)
        catalog_productcategory  (categorías)
        products_review          (reseñas)

    Las imágenes y variantes viven en MongoDB y las limpia Spring.
    Los motivos de desaprobación viven en products_productaudit y se
    conservan (SET_NULL), igual que en la rama PostgreSQL.

    Idempotente: si no hay nada que borrar devuelve los contadores en 0 y
    devuelve 200, para que Spring pueda reintentar sin tratarlo como error.
    """
    if not token_interno_valido(request):
        return no_autorizado()

    ref = (product_ref or '').strip()
    if not ref:
        return JsonResponse(
            {'error': 'Parametro "product_ref" es requerido'}, status=400,
        )

    # Los tres borrados van en una sola transacción: si falla el segundo, el
    # primero no debe quedar aplicado. ATOMIC_REQUESTS ya envuelve la vista,
    # pero se explicita porque la cascada es la parte que no puede quedar a
    # medias aunque alguien cambie esa configuración más adelante.
    with transaction.atomic():
        items_carrito, _ = CartItem.objects.filter(product_ref=ref).delete()
        categorias, _ = ProductCategory.objects.filter(product_ref=ref).delete()
        resenas, _ = Review.objects.filter(product_ref=ref).delete()

    total = items_carrito + categorias + resenas

    return JsonResponse({
        'product_ref': ref,
        'cart_items': items_carrito,
        'categories': categorias,
        'reviews': resenas,
        'total': total,
    })
