import os
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()

from django.test import Client

client = Client()

payload = {
    'status': 'pending',
    'imageUrl': 'https://res.cloudinary.com/demo/image/upload/v123/test.png',
    'cloudinaryPublicId': 'demo/test',
    'notes': 'Prueba automatizada desde script'
}

resp = client.post('/api/orders/', data=json.dumps(payload), content_type='application/json')
print('STATUS', resp.status_code)
print(resp.content.decode('utf-8'))
