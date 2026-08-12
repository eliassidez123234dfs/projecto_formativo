from urllib.parse import urlencode

from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.shortcuts import render

from apps.models3d.cloudinary_service import RESOURCE_TYPES, list_resources, delete_resources
from apps.models3d.models import CloudinaryResource


@admin.register(CloudinaryResource)
class CloudinaryResourceAdmin(admin.ModelAdmin):
    change_list_template = 'admin/models3d/cloudinaryresource/change_list.html'

    # Sin formularios de crear/editar: la tabla "phantom" no existe en BD.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return True

    def changelist_view(self, request, extra_context=None):
        resource_type = request.GET.get('resource_type') or 'image'
        if resource_type not in {'image', 'raw', 'video'}:
            resource_type = 'image'

        per_page = request.GET.get('per_page') or '12'
        try:
            per_page = max(1, min(int(per_page), 50))
        except (TypeError, ValueError):
            per_page = 12

        prefix = (request.GET.get('q') or '').strip()
        next_cursor = request.GET.get('next_cursor') or ''

        context = admin.site.each_context(request)

        # ---- Acciones POST: eliminación (individual o masiva) ----
        if request.method == 'POST':
            resource_type = (request.POST.get('resource_type') or resource_type)
            public_ids = request.POST.getlist('public_ids') or (
                [request.POST['public_id']] if request.POST.get('public_id') else []
            )
            public_ids = [pid for pid in public_ids if pid]

            if public_ids:
                deleted, error = delete_resources(public_ids, resource_type)
                if error:
                    messages.error(request, f'Error al eliminar en Cloudinary: {error}')
                elif deleted:
                    messages.success(
                        request, f'Se eliminaron {len(deleted)} recurso(s) de Cloudinary.'
                    )
                else:
                    messages.warning(request, 'No se pudo eliminar ningún recurso.')

            # Volver a la misma lista con los filtros aplicados.
            params = {'resource_type': resource_type, 'per_page': per_page}
            if prefix:
                params['q'] = prefix
            return HttpResponseRedirect(request.path + '?' + urlencode(params))

        # ---- GET: listado en tiempo real contra la Admin API ----
        payload = list_resources(
            resource_type=resource_type,
            per_page=per_page,
            next_cursor=next_cursor,
            prefix=prefix,
        )
        resources = payload['resources']
        if payload['error']:
            messages.error(
                request,
                f"No se pudieron cargar los recursos de Cloudinary: {payload['error']}",
            )

        base_params = {'resource_type': resource_type, 'per_page': per_page}
        if prefix:
            base_params['q'] = prefix

        context.update({
            'object_list': resources,
            'resource_type': resource_type,
            'resource_types': RESOURCE_TYPES,
            'per_page': per_page,
            'per_page_options': ['12', '24', '36'],
            'q': prefix,
            'has_next': bool(payload['next_cursor']),
            'next_cursor_url': (
                request.path + '?' + urlencode({**base_params, 'next_cursor': payload['next_cursor']})
                if payload['next_cursor'] else None
            ),
            'base_params': base_params,
            'title': 'Gestor Cloudinary',
            'cl': self,
            'opts': self.model._meta,
        })

        return render(request, self.change_list_template, context)