import logging

import cloudinary
import cloudinary.api
import cloudinary.utils

logger = logging.getLogger('django')

RESOURCE_TYPES = (
    ('image', 'Imágenes'),
    ('raw', 'Archivos (modelos 3D, etc.)'),
    ('video', 'Videos'),
)


def referenced_public_ids():
    """Public_ids que están referenciados en la BD (ProductImage, Model3D, Model3DImage)."""
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


def _augment_resources(resources, resource_type):
    referenced = referenced_public_ids()

    def _thumbnail(res):
        try:
            return cloudinary.utils.cloudinary_url(
                res['public_id'],
                width=240,
                height=240,
                crop='fill',
                resource_type=res.get('resource_type') or resource_type,
            )[0]
        except Exception:
            return res.get('secure_url') or ''

    for res in resources:
        res['thumbnail'] = _thumbnail(res)
        res['size_mb'] = round((res.get('bytes') or 0) / 1024 / 1024, 2)
        res['is_referenced'] = res['public_id'] in referenced
    return resources


def list_resources(resource_type='image', per_page=12, next_cursor='', prefix=''):
    """Devuelve un dict con los recursos (aumentados), next_cursor y total_count."""
    clean_prefix = (prefix or '').strip()
    try:
        expr = f"resource_type:{resource_type}"
        if clean_prefix:
            if 'tshirtify' in clean_prefix.lower() or '/' in clean_prefix:
                expr += f" AND (public_id:{clean_prefix}* OR folder:{clean_prefix}*)"
            else:
                expr += f" AND public_id:{clean_prefix}*"
        
        search = (
            cloudinary.Search()
            .expression(expr)
            .sort_by('created_at', 'desc')
            .max_results(per_page)
        )
        if next_cursor:
            search = search.next_cursor(next_cursor)
        
        result = search.execute()
        resources = result.get('resources', [])
        return {
            'resources': _augment_resources(resources, resource_type),
            'next_cursor': result.get('next_cursor') or '',
            'total_count': int(result.get('total_count') or 0),
            'error': None,
        }
    except Exception as exc:
        logger.warning('Cloudinary search error, fallback to resources API: %s', exc)
        try:
            kwargs = {'resource_type': resource_type, 'type': 'upload', 'max_results': per_page}
            if clean_prefix:
                kwargs['prefix'] = clean_prefix
            if next_cursor:
                kwargs['next_cursor'] = next_cursor
            result = cloudinary.api.resources(**kwargs)
            return {
                'resources': _augment_resources(result.get('resources', []), resource_type),
                'next_cursor': result.get('next_cursor') or '',
                'total_count': int(result.get('total_count') or 0),
                'error': None,
            }
        except Exception as exc2:
            logger.warning('Cloudinary list error: %s', exc2)
            return {'resources': [], 'next_cursor': '', 'total_count': 0, 'error': str(exc2)}


def delete_resources(public_ids, resource_type='image'):
    """Elimina recursos en Cloudinary. Devuelve (deleted_ids, error)."""
    try:
        result = cloudinary.api.delete_resources(public_ids, resource_type=resource_type, type='upload')
        deleted = {
            pid for pid, st in (result.get('deleted') or {}).items() if st == 'deleted'
        }
        return deleted, None
    except Exception as exc:
        logger.warning('Cloudinary delete error: %s', exc)
        return set(), str(exc)