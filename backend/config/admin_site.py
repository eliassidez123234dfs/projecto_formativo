from django.contrib import admin


original_has_permission = admin.site.has_permission


def superuser_only_has_permission(request):
    return (
        request.user.is_authenticated
        and getattr(request.user, 'is_superuser', False)
        and request.user.estado == 'Activo'
    )


admin.site.has_permission = superuser_only_has_permission
admin.site.site_header = 'RED Estampación - Administración'
admin.site.site_title = 'RED Admin'
admin.site.index_title = 'Panel de Administración'
