import re
from urllib.parse import urlparse

from django.db.models.signals import pre_delete, pre_save
from django.dispatch import receiver

from cloudinary import uploader

from .models import ProductImage


def _public_id_from_url(url):
    path = urlparse(url).path
    m = re.search(r'/upload/v\d+/(.+)', path)
    if not m:
        return None
    public_id_with_ext = m.group(1)
    if '.' in public_id_with_ext:
        return public_id_with_ext.rsplit('.', 1)[0]
    return public_id_with_ext


def _destroy_cloudinary(instance):
    if not instance.image:
        return
    try:
        public_id = _public_id_from_url(instance.image.url)
        if public_id:
            uploader.destroy(public_id, invalidate=True)
    except Exception:
        pass


@receiver(pre_delete, sender=ProductImage)
def delete_cloudinary_image_on_delete(sender, instance, **kwargs):
    _destroy_cloudinary(instance)


@receiver(pre_save, sender=ProductImage)
def delete_cloudinary_image_on_update(sender, instance, **kwargs):
    if not instance.pk:
        return
    try:
        old = ProductImage.objects.get(pk=instance.pk)
    except ProductImage.DoesNotExist:
        return
    if old.image and old.image.url != instance.image.url:
        _destroy_cloudinary(old)
