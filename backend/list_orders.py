import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import django
django.setup()
from apps.orders.models import Order

qs = Order.objects.all().values('id','image_url','image_url','cloudinary_public_id','notes')
print('TOTAL', qs.count())
for o in qs:
    print(o)
