"""
Utilidades de caché para ViewSets de DRF.

`cache_view_action` permite cachear respuestas HTTP individuales
de acciones de ViewSet usando la caché configurada en settings.py
(Redis en producción, LocMem en desarrollo).

La caché se invalida automáticamente por TTL. Las llaves incluyen
el prefijo del módulo para evitar colisiones entre apps.

OWASP A05:2021 — Seguridad de Configuración:
  - Nunca cachear vistas protegidas por @login_required.
  - Los datos de usuario individual NUNCA se cachean.
  - Solo se cachean endpoints públicos de solo lectura.
"""

from __future__ import annotations

import hashlib
from functools import wraps

from django.core.cache import cache
from django.http import HttpResponseBase


def cache_view_action(timeout: int = 300, prefix: str = 'v'):
    """Decorador para cachear el resultado de una acción de ViewSet.

    Genera una llave única basada en la URL completa (path + query params),
    lo que permite cachear por combinación de filtros automáticamente.

    Args:
        timeout: TTL en segundos (default: 300 = 5 minutos).
        prefix: Prefijo de la llave de caché (default: 'v' = view).

    Usage:
        @action(detail=False, methods=['get'])
        @cache_view_action(timeout=300, prefix='catalog_featured')
        def featured(self, request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            cache_key = _make_cache_key(request, prefix)
            response = cache.get(cache_key)
            if response is not None:
                return response
            response = view_func(self, request, *args, **kwargs)
            if isinstance(response, HttpResponseBase) and response.status_code == 200:
                response.render()
                cache.set(cache_key, response, timeout)
            return response
        return wrapper
    return decorator


def _make_cache_key(request, prefix: str) -> str:
    """Genera una llave de caché única basada en la URL completa."""
    path = request.get_full_path()
    raw = f"{prefix}:{path}"
    return f"view:{hashlib.md5(raw.encode()).hexdigest()}"
