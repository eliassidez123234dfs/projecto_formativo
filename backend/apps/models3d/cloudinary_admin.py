import logging
from urllib.parse import urlencode

import cloudinary
import cloudinary.api
import cloudinary.utils

from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.shortcuts import render

from apps.models3d.models import CloudinaryResource

logger = logging.getLogger('django')

# Tipos de recurso disponibles en la Admin API de Cloudinary.
RESOURCE_TYPES = (
    ('image', 'Imágenes'),
    ('raw', 'Archivos (modelos 3D, etc.)'),
    ('video', 'Videos'),
)

# Origen de los public_ids referenciados en la BD (para mostrar si un recurso
# está todavía en uso y evitar borrados accidentales de imágenes de productos).
def _referenced_public_ids():
    from apps.products.models import ProductImage
    from apps.models3d.models import Model3D, Model3DImage

    ids = set()
    for image in ProductImage.objects.all().only('image'):
        if image.image:
            ids.add(str(image.image.name))
    ids.update(
        pid for pid in Model3D.objects.values_list('cloudinary_public_id', flat=True) if pid
    )
    ids.update(
        pid for pid in Model3DImage.objects.values_list('cloudinary_public_id', flat=True) if pid
    )
    return ids


@admin.register(CloudinaryResource)
class CloudinaryResourceAdmin(admin.ModelAdmin):
    change_list_template = 'admin/models3d/cloudinaryresource/change_list.html'

    # Sin formularios de crear/editar: la tabla "phantom" no existe en BD.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return True

    def get_urls(self):
        return super().get_urls()

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
            action = request.POST.get('action')
            resource_type = (request.POST.get('resource_type') or resource_type)
            public_ids = request.POST.getlist('public_ids') or (
                [request.POST['public_id']] if request.POST.get('public_id') else []
            )
            public_ids = [pid for pid in public_ids if pid]

            if action == 'delete' and public_ids:
                try:
                    result = cloudinary.api.delete_resources(
                        public_ids, resource_type=resource_type
                    )
                    deleted = {
                        pid for pid, status in (result.get('deleted') or {}).items() if status == 'deleted'
                    }
                    if deleted:
                        messages.success(
                            request,
                            f'Se eliminaron {len(deleted)} recurso(s) de Cloudinary.'
                        )
                    else:
                        messages.warning(request, 'No se pudo eliminar ningún recurso.')
                except Exception as exc:
                    logger.warning('Cloudinary delete error: %s', exc)
                    messages.error(
                        request, f'Error al eliminar en Cloudinary: {exc}'
                    )

            # Volver a la misma lista con los filtros aplicados.
            params = {'resource_type': resource_type, 'per_page': per_page}
            if prefix:
                params['q'] = prefix
            return HttpResponseRedirect(request.path + '?' + urlencode(params))

        # ---- GET: listado en tiempo real contra la Admin API ----
        try:
            kwargs = {'resource_type': resource_type, 'max_results': per_page}
            if prefix:
                kwargs['prefix'] = prefix
            if next_cursor:
                kwargs['next_cursor'] = next_cursor
            result = cloudinary.api.resources(**kwargs)
            resources = result.get('resources', [])
            result_next = result.get('next_cursor') or ''
        except Exception as exc:
            logger.warning('Cloudinary list error: %s', exc)
            resources = []
            result_next = ''
            context.setdefault('messages', None)
            messages.error(
                request,
                f'No se pudieron cargar los recursos de Cloudinary: {exc}',
            )

        referenced = _referenced_public_ids()

        def _thumbnail(res):
            try:
                url = cloudinary.utils.cloudinary_url(
                    res['public_id'],
                    width=240,
                    height=240,
                    crop='fill',
                    resource_type=res.get('resource_type') or resource_type,
                )[0]
            except Exception:
                url = res.get('secure_url') or ''
            return url

        for res in resources:
            res['thumbnail'] = _thumbnail(res)
            res['size_mb'] = round((res.get('bytes') or 0) / 1024 / 1024, 2)
            res['is_referenced'] = res['public_id'] in referenced

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
            'has_next': bool(result_next),
            'next_cursor_url': (
                request.path + '?' + urlencode({**base_params, 'next_cursor': result_next})
                if result_next else None
            ),
            'base_params': base_params,
            'title': 'Gestor Cloudinary',
            'cl': self,
            'opts': self.model._meta,
        })

        return render(
            request,
            self.change_list_template,
            context,
        )