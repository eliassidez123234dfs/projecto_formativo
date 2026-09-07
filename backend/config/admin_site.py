# =============================================================================
#  ARCHIVO: admin_site.py
#  PROPÓSITO: Personalización del sitio de administración de Django.
#             Restringe el acceso al panel /admin exclusivamente a
#             superusuarios con estado 'Activo', y personaliza los títulos
#             del interfaz administrativo para la marca del proyecto.
#
#  REGLA DE NEGOCIO CUBIERTA:
#  - RN-019: Acceso al panel de administración restringido a superusuarios
#    activos. Los usuarios con permiso 'staff' sin 'is_superuser=True' no
#    pueden acceder aunque tengan roles administrativos en la lógica de negocio.
#
#  PATRÓN DE DISEÑO: Strategy / Monkey Patching
#  - Se guarda el método original has_permission y se reemplaza por una
#    función personalizada que añade validaciones extra (superuser + estado).
#  - El reemplazo se realiza en tiempo de importación (monkey patching).
# =============================================================================

from django.contrib import admin

# Guardar referencia al método original (no se usa, pero queda disponible
# por si se necesita restaurar la conducta por defecto).
original_has_permission = admin.site.has_permission


# =============================================================================
#  superuser_only_has_permission
#  Valida tres condiciones en orden:
#    1. El usuario está autenticado (is_authenticated).
#    2. El usuario tiene el atributo is_superuser=True.
#    3. El usuario tiene estado 'Activo' en el sistema.
#  Si alguna falla, deniega el acceso al panel de administración.
# =============================================================================
def superuser_only_has_permission(request):
    return (
        request.user.is_authenticated
        and getattr(request.user, 'is_superuser', False)
        and request.user.estado == 'Activo'
    )


# ── Aplicar la personalización ──
# Se sobrescribe el método has_permission del admin site para usar nuestra
# función restrictiva, y se cambian los títulos del panel por la marca.
admin.site.has_permission = superuser_only_has_permission
admin.site.site_header = 'RED Estampación - Administración'
admin.site.site_title = 'RED Admin'
admin.site.index_title = 'Panel de Administración'
