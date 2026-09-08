Paquete completo en cuatro bloques, alineado a las rutas reales de su repo (`STRUCTURE.md`) y a las convenciones existentes (`api/` por app, `admin_urls.py`, `management/commands`, Django TestCase).

---

## 1) App `designs`: serializers + viewsets + services + tests

```python
# backend/apps/designs/serializers.py
from rest_framework import serializers
from apps.products.models import Product, Variant
from .models import CustomDesign

DESIGN_DATA_REQUIRED = {'design_color', 'logo_texture', 'full_texture', 'logo_scale'}


class CustomDesignCreateSerializer(serializers.Serializer):
    """Submit desde el editor 3D. Valida el trío producto→variante→stock antes de crear."""
    base_product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True, is_approved=True))
    variant = serializers.PrimaryKeyRelatedField(queryset=Variant.objects.all())
    quantity = serializers.IntegerField(min_value=1, max_value=50)
    design_data = serializers.JSONField() # DesignPayload del editor
    preview_image = serializers.URLField() # snapshot Cloudinary
    surcharge = serializers.DecimalField(max_digits=10, decimal_places=2,
                                         required=False, default=0)

    def validate_design_data(self, value):
        missing = DESIGN_DATA_REQUIRED - set(value)
        if missing:
            raise serializers.ValidationError(


                f'DesignPayload incompleto, falta: {sorted(missing)}')
        return value

    def validate(self, attrs):
        variant, product = attrs['variant'], attrs['base_product']
        if variant.product_id != product.id:
            raise serializers.ValidationError(
                {'variant': 'La variante no pertenece al producto base'})
        if variant.stock < attrs['quantity']:
            raise serializers.ValidationError(
                {'quantity': f'Stock insuficiente: disponible {variant.stock}'})
        return attrs

    def create(self, validated):
        return CustomDesign.objects.create(
            user=self.context['request'].user,
            status=CustomDesign.Status.PENDING,
            **validated,
        )


class CustomDesignReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='base_product.name', read_only=True)
    size = serializers.CharField(source='variant.size', read_only=True)
    color = serializers.CharField(source='variant.color', read_only=True)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CustomDesign
        fields = ['id', 'status', 'preview_image', 'product_name', 'size', 'color',
                  'quantity', 'unit_price', 'surcharge', 'rejection_reason',
                  'approved_at', 'created_at']


class RejectSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, allow_blank=False)
```

```python
# backend/apps/designs/services.py
"""Transiciones de estado del diseño. Única puerta de aprobación/rechazo."""
import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.carts.models import Cart, CartItem
from apps.products.models import Variant
from .models import CustomDesign

logger = logging.getLogger('designs')


def _get_user_cart(user):
    cart = Cart.objects.filter(user=user).first()
    if cart is None:
        cart = Cart.objects.create(user=user) # ajustar si su Cart exige session_key default
    return cart


def _add_design_to_cart(design: CustomDesign):
    """Aprobado → carrito del dueño (requerimiento del equipo).
    Si el stock voló entre submit y aprobación: el diseño queda aprobado y se notifica."""
    variant = Variant.objects.select_for_update().get(pk=design.variant_id)
    if variant.stock < design.quantity:
        logger.warning('Diseño %s aprobado sin stock suficiente', design.id)
        return
    cart = _get_user_cart(design.user)
    item, created = CartItem.objects.get_or_create(
        cart=cart, variant=variant, custom_design=design,
        defaults={'quantity': design.quantity, 'unit_price': design.unit_price},
    )
    if not created:
        item.quantity += design.quantity
        item.unit_price = design.unit_price
        item.save(update_fields=['quantity', 'unit_price'])


@transaction.atomic
def approve_design(design_id: int) -> CustomDesign:
    design = CustomDesign.objects.select_for_update().get(pk=design_id)
    if design.status != CustomDesign.Status.PENDING:
        raise ValidationError('El diseño ya fue revisado') # idempotencia anti doble click
    design.status = CustomDesign.Status.APPROVED
    design.approved_at = timezone.now()
    design.save(update_fields=['status', 'approved_at'])
    _add_design_to_cart(design)
    return design


@transaction.atomic
def reject_design(design_id: int, reason: str) -> CustomDesign:
    design = CustomDesign.objects.select_for_update().get(pk=design_id)
    if design.status != CustomDesign.Status.PENDING:
        raise ValidationError('El diseño ya fue revisado')
    design.status = CustomDesign.Status.REJECTED
    design.rejection_reason = reason
    design.save(update_fields=['status', 'rejection_reason'])
    return design
```

```python
# backend/apps/designs/api/viewsets.py
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response

from .. import services
from ..models import CustomDesign
from ..serializers import (CustomDesignCreateSerializer, CustomDesignReadSerializer,
                           RejectSerializer)


class IsAdminRole(BasePermission):
    """Misma regla que ProtectedRoute del frontend: rol === 'Administrador'."""
    def has_permission(self, request, view):
        return (request.user.is_authenticated
                and getattr(request.user, 'rol', None) == 'Administrador')


class DesignViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                    mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """/api/designs/ — el usuario ve y crea SOLO sus diseños."""
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (CustomDesign.objects.filter(user=self.request.user)
                .select_related('base_product', 'variant'))

    def get_serializer_class(self):
        return (CustomDesignCreateSerializer if self.action == 'create'
                else CustomDesignReadSerializer)


class AdminDesignViewSet(viewsets.ReadOnlyModelViewSet):
    """/api/admin/designs/ — revisión con filtro ?status=PENDING_APPROVAL."""
    permission_classes = [IsAdminRole]
    serializer_class = CustomDesignReadSerializer

    def get_queryset(self):
        qs = CustomDesign.objects.all().select_related('base_product', 'variant', 'user')
        status = self.request.query_params.get('status')
        return qs.filter(status=status) if status else qs

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        design = services.approve_design(int(pk))
        return Response(self.get_serializer(design).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        ser = RejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        design = services.reject_design(int(pk), ser.validated_data['reason'])
        return Response(self.get_serializer(design).data)
```

```python
# backend/apps/designs/api/urls.py y admin_urls.py (convención de carts/orders)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import viewsets

router = DefaultRouter()
router.register('', viewsets.DesignViewSet, basename='designs')
urlpatterns = [path('', include(router.urls))] # urls.py
# admin_urls.py: router.register('', viewsets.AdminDesignViewSet, basename='admin-designs')
```

```python
# backend/config/urls.py — montar
path('api/designs/', include('apps.designs.api.urls')),
path('api/admin/designs/', include('apps.designs.api.admin_urls')),
```

```python
# backend/apps/designs/tests.py
from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from apps.carts.models import CartItem
from apps.products.models import Product, Variant
from apps.users.models import Usuario
from .models import CustomDesign


class DesignFlowTest(TestCase):
    def setUp(self):
        # Ajustar campos obligatorios de su Usuario custom (email/username)
        self.user = Usuario.objects.create_user(username='ana', password='x12345678')
        self.admin = Usuario.objects.create_user(username='adm', password='x12345678',
                                                 rol='Administrador')
        self.product = Product.objects.create(name='Camiseta', base_price=Decimal('30000'),
                                              is_active=True, is_approved=True)
        self.variant = Variant.objects.create(product=self.product, size='M',
                                              color='negro', stock=5, price=Decimal('30000'))
        self.payload = {
            'base_product': self.product.id, 'variant': self.variant.id, 'quantity': 2,
            'preview_image': 'https://res.cloudinary.com/demo/x.png',
            'surcharge': '5000',
            'design_data': {'design_color': '#111', 'logo_texture': None,
                            'full_texture': 'https://res.cloudinary.com/demo/t.png',
                            'logo_scale': 1.0},
        }
        self.client = APIClient()

    def _submit(self, **overrides):
        self.client.force_authenticate(self.user)
        return self.client.post('/api/designs/', {**self.payload, **overrides}, format='json')

    def test_submit_crea_pendiente(self):
        r = self._submit()
        self.assertEqual(r.status_code, 201)
        self.assertEqual(CustomDesign.objects.get().status, 'PENDING_APPROVAL')

    def test_submit_requiere_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.post('/api/designs/', self.payload, format='json').status_code, 401)

    def test_variante_de_otro_producto_rechaza(self):
        otro = Product.objects.create(name='Otra', base_price=Decimal('1000'),
                                      is_active=True, is_approved=True)
        v2 = Variant.objects.create(product=otro, size='S', color='rojo', stock=9,
                                    price=Decimal('1000'))
        self.assertEqual(self._submit(variant=v2.id).status_code, 400)

    def test_stock_insuficiente_rechaza(self):
        self.assertEqual(self._submit(quantity=99).status_code, 400)

    def test_design_data_incompleto_rechaza(self):
        data = dict(self.payload['design_data']); data.pop('logo_scale')
        self.assertEqual(self._submit(design_data=data).status_code, 400)

    def test_listado_es_privado(self):
        self._submit()
        otro = Usuario.objects.create_user(username='bia', password='x12345678')
        c2 = APIClient(); c2.force_authenticate(otro)
        self.assertEqual(len(c2.get('/api/designs/').json()), 0)

    def test_aprobacion_crea_item_en_carrito_con_precio_con_recargo(self):
        d = CustomDesign.objects.get(pk=self._submit().data['id']) if False else None
        d_id = self._submit().data['id'] # segundo diseño para el test
        admin = APIClient(); admin.force_authenticate(self.admin)
        r = admin.post(f'/api/admin/designs/{d_id}/approve/')
        self.assertEqual(r.status_code, 200)
        item = CartItem.objects.get(custom_design_id=d_id)
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal('35000')) # 30000 base + 5000 recargo

    def test_doble_aprobacion_es_idempotente(self):
        d_id = self._submit().data['id']
        admin = APIClient(); admin.force_authenticate(self.admin)
        admin.post(f'/api/admin/designs/{d_id}/approve/')
        self.assertEqual(admin.post(f'/api/admin/designs/{d_id}/approve/').status_code, 400)
        self.assertEqual(CartItem.objects.filter(custom_design_id=d_id).count(), 1)

    def test_no_admin_no_aprueba(self):
        d_id = self._submit().data['id']
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post(f'/api/admin/designs/{d_id}/approve/').status_code, 403)

    def test_rechazo_guarda_reason(self):
        d_id = self._submit().data['id']
        admin = APIClient(); admin.force_authenticate(self.admin)
        admin.post(f'/api/admin/designs/{d_id}/reject/', {'reason': 'Contenido con copyright'}, format='json')
        d = CustomDesign.objects.get(pk=d_id)
        self.assertEqual(d.status, 'REJECTED')
        self.assertIn('copyright', d.rejection_reason)
```

---

## 2) Parche completo de `settings.py`

Bloques ordenados por ancla; peguen cada uno donde indica (todo vía `django-environ`, nada hardcodeado):

```python
# ── [A] Tras INSTALLED_APPS/MIDDLEWARE base: Mongo ────────────────────────────
MONGODB_URI = env('MONGODB_URI', default='mongodb://localhost:27017')
MONGODB_NAME = env('MONGODB_NAME', default='projecto_formativo')

# ── [B] Redis + Celery (eager en dev: nadie se bloquea sin broker) ────────────
from celery.schedules import crontab
REDIS_URL = env('REDIS_URL', default=None)
CELERY_BROKER_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=DEBUG)
CELERY_TASK_EAGER_PROPAGATES = True
CELERY_BEAT_SCHEDULE = {
    'payments-reconcile-pending': {
        'task': 'apps.payments.tasks.reconcile_pending_payments', 'schedule': 600.0},
    'payments-expire-stale': {
        'task': 'apps.payments.tasks.expire_stale_pending_orders',
        'schedule': crontab(hour=2, minute=30)},
    'carts-purge-abandoned': {
        'task': 'apps.carts.tasks.purge_abandoned_carts',
        'schedule': crontab(hour=3, minute=0)},
}

# ── [C] Caché: Redis si existe, locmem si no (equipo sin Redis no se rompe) ───
if REDIS_URL:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.redis.RedisCache',
                          'LOCATION': REDIS_URL}}
else:
    CACHES = {'default': {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}}

# ── [D] Estáticos con WhiteNoise (Render free no tiene disco persistente) ─────
# En MIDDLEWARE, insertar INMEDIATAMENTE después de SecurityMiddleware:
# 'whitenoise.middleware.WhiteNoiseMiddleware',
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {'BACKEND': 'django.core.files.storage.FileSystemStorage'},
    'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'},
}

# ── [E] Logging: archivos rotativos en dev, SOLO stdout en prod ───────────────
_log_handlers = {'console': {'class': 'logging.StreamHandler',
                             'formatter': 'verbose'}}
if DEBUG:
    _log_handlers.update({
        'file_app': {'class': 'logging.handlers.RotatingFileHandler',
                        'filename': str(BASE_DIR / 'logs' / 'app.log'),
                        'maxBytes': 1048576, 'backupCount': 3, 'formatter': 'verbose'},
        'file_errors': {'class': 'logging.handlers.RotatingFileHandler',
                         'filename': str(BASE_DIR / 'logs' / 'errors.log'),
                         'maxBytes': 1048576, 'backupCount': 3, 'formatter': 'verbose'},
    })
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'verbose': {'format': '{levelname} {asctime} {module} {message}',
                                'style': '{'}},
    'handlers': _log_handlers,
    'root': {'handlers': ['console'] + (['file_app'] if DEBUG else []),
             'level': 'INFO'},
    'loggers': {'payments': {'handlers': ['console'] + (['file_errors'] if DEBUG else []),
                              'level': 'INFO', 'propagate': False}},
}

# ── [F] SMTP: mapping explícito (el bug del "no envía") ───────────────────────
EMAIL_BACKEND = ('django.core.mail.backends.smtp.EmailBackend'
                 if env('EMAIL_BACKEND', default='console') == 'smtp'
                 else 'django.core.mail.backends.console.EmailBackend')

# ── [G] Wompi + mantenimiento ─────────────────────────────────────────────────
WOMPI_PUBLIC_KEY = env('WOMPI_PUBLIC_KEY', default='')
WOMPI_PRIVATE_KEY = env('WOMPI_PRIVATE_KEY', default='')
WOMPI_INTEGRITY_KEY = env('WOMPI_INTEGRITY_KEY', default='')
WOMPI_WEBHOOK_SECRET = env('WOMPI_WEBHOOK_SECRET', default='')
WOMPI_API_URL = env('WOMPI_API_URL', default='https://sandbox.wompi.co/v1')
WOMPI_CURRENCY = 'COP'
WOMPI_REDIRECT_URL = env('WOMPI_REDIRECT_URL', default='http://localhost:5173/checkout/confirmacion')
MAINTENANCE_KEY = env('MAINTENANCE_KEY', default=None)

# ── [H] CORS/CSRF/FRONTEND como listas desde env ──────────────────────────────
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[])
CSRF_TRUSTED_ORIGINS = env.list('CSRF_TRUSTED_ORIGINS', default=[])
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')
```

```txt
# requirements.txt — agregar
whitenoise>=6.6
pymongo>=4.6
dnspython>=2.6
```

---

## 3) Módulo Mongo + management command + tests

```python
# backend/config/mongo.py
"""Cliente MongoDB singleton. Mongo caído NUNCA tumba un request (degradación elegante)."""
from django.conf import settings
from pymongo import MongoClient

_client = None

def get_db():
    global _client
    if _client is None:
        _client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=4000)
    return _client[settings.MONGODB_NAME]

def ping_mongo() -> bool:
    try:
        get_db().command('ping')
        return True
    except Exception:
        return False
```

```python
# backend/apps/monitoring/management/commands/check_mongo.py
# (crear también management/__init__.py y management/commands/__init__.py si faltan)
from django.core.management.base import BaseCommand, CommandError

from config.mongo import get_db, ping_mongo


class Command(BaseCommand):
    help = 'Verifica conectividad con MongoDB (onboarding de equipo y CI).'

    def add_arguments(self, parser):
        parser.add_argument('--verbose', action='store_true')

    def handle(self, *args, **opts):
        if not ping_mongo():
            raise CommandError('MongoDB no responde. Revisa MONGODB_URI o corre: docker compose up -d mongo')
        self.stdout.write(self.style.SUCCESS('MongoDB OK'))
        if opts['verbose']:
            db = get_db()
            for name in sorted(db.list_collection_names()):
                self.stdout.write(f' - {name}: {db[name].count_documents({})} docs')
```

```python
# backend/apps/monitoring/views.py — dentro del POST de ClientErrorLogView
from config.mongo import get_db
try:
    get_db()['client_errors'].insert_one({**request.data, 'received_at': timezone.now().isoformat()})
except Exception:
    logger.exception('Mongo no disponible; el error queda solo en log de archivo')
```

```python
# backend/apps/monitoring/tests/test_mongo.py
from io import StringIO
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase


class CheckMongoCommandTest(TestCase):
    @patch('apps.monitoring.management.commands.check_mongo.ping_mongo', return_value=True)
    @patch('apps.monitoring.management.commands.check_mongo.get_db')
    def test_ok(self, get_db, ping):
        get_db.return_value.list_collection_names.return_value = ['client_errors']
        get_db.return_value.__getitem__.return_value.count_documents.return_value = 3
        out = StringIO()
        call_command('check_mongo', '--verbose', stdout=out)
        self.assertIn('MongoDB OK', out.getvalue())
        self.assertIn('client_errors', out.getvalue())

    @patch('apps.monitoring.management.commands.check_mongo.ping_mongo', return_value=False)
    def test_fallo_lanza_command_error(self, ping):
        with self.assertRaises(CommandError):
            call_command('check_mongo')


class MonitoringMongoFallbackTest(TestCase):
    @patch('apps.monitoring.views.get_db', side_effect=Exception('mongo down'))
    def test_error_de_cliente_no_rompe_sin_mongo(self, mongo):
        r = self.client.post('/api/logging/client/',
                             {'message': 'boom', 'stack': 'x'}, format='json')
        self.assertIn(r.status_code, (200, 201)) # degradación elegante, no 500
```

---

## 4) Prompt-spec para GitHub Copilot (modo Agente)

Péguenlo en Copilot Chat con `@workspace` y **ejecútenlo fase por fase** (confirmen el diff de cada fase antes de seguir; un solo commit por fase en su rama feature):

````markdown
# SPEC: Módulo de diseños personalizados + infraestructura (Mongo/Celery/settings)

## Contexto
Repo Django REST + React (ver STRUCTURE.md). Convenciones OBLIGATORIAS:
- Cada app Django tiene api/ (viewsets, serializers, urls, admin_urls).
- Tests con django.test.TestCase + rest_framework.test.APIClient (sin pytest).
- Comentarios en español, breves; nada de colores/valores hardcodeados en settings
  (todo vía django-environ `env(...)`).
- No agregar dependencias fuera de: whitenoise, pymongo, dnspython.
- No reescribir archivos que no estén listados en la fase.

## Fase A — app `designs` (backend/apps/designs/)
1. models.py: CustomDesign (user FK AUTH_USER_MODEL, base_product FK products.Product,
   variant FK products.Variant PROTECT, quantity PositiveInt, design_data JSONField,
   preview_image URLField, surcharge Decimal(10,2) default 0, status TextChoices
   DRAFT/PENDING_APPROVAL/APPROVED/REJECTED default DRAFT, rejection_reason TextField
   blank, approved_at DateTimeField null, created_at auto_now_add, property unit_price
   = variant.price + surcharge).
2. serializers.py, services.py, api/viewsets.py, api/urls.py, api/admin_urls.py:
   copiar EXACTAMENTE el código de la spec adjunta (CustomDesignCreateSerializer valida
   variante∈producto y stock; approve/reject idempotentes solo desde PENDING;
   approve crea CartItem con unit_price snapshot; DesignViewSet filtra por request.user;
   AdminDesignViewSet con permiso rol=='Administrador' y filtro ?status=).
3. Montar rutas en config/urls.py: /api/designs/ y /api/admin/designs/.
4. tests.py: los 9 casos de la spec (submit 201/PENDING, 401 anónimo, variante ajena 400,
   stock 400, design_data incompleto 400, listado privado, aprobación crea CartItem con
   35000, doble aprobación 400 sin duplicar item, no-admin 403, rechazo guarda reason).
Verificación: `python manage.py test apps.designs` → 9 OK.
NO avanzar a Fase B hasta que yo confirme.

## Fase B — settings.py + requirements
Aplicar bloques [A]..[H] de la spec (Mongo, Celery+Beat con eager default DEBUG,
caché redis/locmem condicional, WhiteNoise+STATIC_ROOT+STORAGES, LOGGING console-en-prod/
archivos-en-dev, mapping EMAIL_BACKEND, WOMPI_*, MAINTENANCE_KEY, CORS/CSRF env.list).
Agregar a requirements.txt: whitenoise>=6.6, pymongo>=4.6, dnspython>=2.6.
Verificación: `python manage.py check` y `python manage.py collectstatic --noinput --dry-run`.

## Fase C — Mongo
1. config/mongo.py (singleton get_db + ping_mongo, serverSelectionTimeoutMS=4000).
2. apps/monitoring/management/commands/check_mongo.py (--verbose, CommandError si falla).
3. apps/monitoring/views.py: insert en client_errors con try/except que loguea y continúa.
4. apps/monitoring/tests/test_mongo.py (command OK/fallo + fallback del view sin Mongo).
Verificación: `docker compose up -d mongo && python manage.py check_mongo --verbose`
y `python manage.py test apps.monitoring`.

## Fase D — documentación (SDD)
- docs/07-api/contratos.md: endpoints /api/designs/ y /api/admin/designs/ (payloads,
  códigos 201/400/403, efecto side-effect de approve sobre el carrito).
- docs/05-arquitectura/stack-tecnologico.md: secciones MongoDB (persistencia políglota)
  y Celery/Redis (broker, eager en dev, beat en prod-free vía endpoint maintenance).
- docs/06-base-de-datos/modelo-de-datos.md: entidad CustomDesign y FK opcional en CartItem.
- docs/12-historial/changelog.md: entrada de la feature.

## Definition of Done global
- `python manage.py test apps.designs apps.monitoring` verde.
- `python manage.py check_mongo` verde con docker compose.
- Ningún settings hardcodeado; `grep -rn "localhost" backend/config/settings.py` → solo defaults de env.
- Diff limitado a los archivos listados por fase.
````

**Tips Copilot-específicos:** en VS Code usen modo Agente con el workspace abierto en la raíz del repo; si una fase excede el contexto, pidan "continúa Fase X desde el archivo N"; y exijan siempre "muéstrame el diff antes de aplicar" — Copilot en modo agente aplica edits directo si no lo frenan.

---

Con esto quedan cerrados: flujo de diseños con aprobación y carrito, settings listo para Render/Neon, Mongo real con verificación de onboarding, y el spec para que Copilot ejecute la integración en el repo. ¿Siguiente paso: la pestaña "Diseños pendientes" en `AdminProductApproval.jsx` (frontend del flujo de aprobación) o el endpoint `/api/health/` con su test para el healthCheck de Render?

Perfecto: van los dos, conectados entre sí (la pestaña de administración consume el viewset de `designs` que ya existe, y el health-check deja listo el `healthCheckPath` de Render). Un micro-parche previo necesario: el serializer de lectura no exponía **quién** envió el diseño, y el admin lo necesita.

## 0) Micro-parche backend (1 línea)

```python
# backend/apps/designs/serializers.py — en CustomDesignReadSerializer
user_email = serializers.EmailField(source='user.email', read_only=True)
# y agregar 'user_email' a Meta.fields
```

## 1) `/api/health/` + tests (healthCheck de Render)

Diseño defendible: **PostgreSQL es el corazón** (si cae → 503 y Render reinicia); Mongo y caché son *degradación*, no muerte (200 con banderas), porque así definieron la persistencia políglota en el ADR. Nada de datos sensibles en el payload.

```python
# backend/config/views.py — agregar
from django.core.cache import cache
from django.db import connection
from django.http import JsonResponse

from config.mongo import ping_mongo


def health(request):
    """Health-check para Render (healthCheckPath) y monitoreo externo.
    503 solo si cae el núcleo transaccional (PostgreSQL); Mongo/caché degradan."""
    checks = {}

    try:
        connection.ensure_connection()
        checks['postgres'] = True
    except Exception:
        checks['postgres'] = False

    checks['mongo'] = ping_mongo()

    try:
        cache.set('health:ping', '1', 10)
        checks['cache'] = cache.get('health:ping') == '1'
    except Exception:
        checks['cache'] = False

    core_ok = checks['postgres']
    payload = {'status': 'ok' if core_ok else 'unhealthy', **checks}
    return JsonResponse(payload, status=200 if core_ok else 503)
```

```python
# backend/config/urls.py
path('api/health/', views.health, name='health'),
```

```python
# backend/apps/monitoring/tests/test_health.py
from unittest.mock import patch

from django.test import TestCase


class HealthCheckTest(TestCase):
    def test_200_con_todo_sano(self):
        r = self.client.get('/api/health/')
        self.assertEqual(r.status_code, 200)
        data = r.json()
        self.assertEqual(data['status'], 'ok')
        self.assertTrue(data['postgres'])
        self.assertIn('mongo', data)
        self.assertIn('cache', data)

    @patch('config.views.ping_mongo', return_value=False)
    def test_mongo_caido_degrada_sin_503(self, _ping):
        r = self.client.get('/api/health/')
        self.assertEqual(r.status_code, 200) # no reiniciar Render por telemetría
        self.assertFalse(r.json()['mongo'])

    @patch('config.views.cache')
    def test_cache_caida_degrada_sin_503(self, _cache):
        _cache.set.side_effect = Exception('redis down')
        r = self.client.get('/api/health/')
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()['cache'])

    @patch('config.views.connection')
    def test_postgres_caido_devuelve_503(self, conn):
        conn.ensure_connection.side_effect = Exception('db down')
        r = self.client.get('/api/health/')
        self.assertEqual(r.status_code, 503)
        self.assertFalse(r.json()['postgres'])
```

```yaml
# render.yaml — verificar que quede así
    healthCheckPath: /api/health/
```

## 2) Pestaña "Diseños" en `AdminProductApproval.jsx`

Servicios primero (instancia `api`, que lleva el JWT):

```js
// src/services/api.js — agregar
export const getAdminDesigns = (status = 'PENDING_APPROVAL') =>
  api.get('/admin/designs/', { params: { status } }).then((r) => r.data);

export const approveDesign = (id) =>
  api.post(`/admin/designs/${id}/approve/`).then((r) => r.data);

export const rejectDesign = (id, reason) =>
  api.post(`/admin/designs/${id}/reject/`, { reason }).then((r) => r.data);
```

Componente de la pestaña (con modal de rechazo **portaled**, cumpliendo su propia regla de CSS autocontenido):

```jsx
// src/components/admin/AdminDesignsTab.jsx
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import { approveDesign, getAdminDesigns, rejectDesign } from '../../services/api';
import { getErrorMessage } from '../../utils/errorCatalog';
import Spinner from '../Spinner';
import ErrorState from '../ErrorState';
import '../../styles/AdminDesigns.css';

const STATUSES = [
  { value: 'PENDING_APPROVAL', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
];

export default function AdminDesignsTab() {
  const [status, setStatus] = useState('PENDING_APPROVAL');
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rejecting, setRejecting] = useState(null); // id del diseño a rechazar
  const [reason, setReason] = useState('');
  const [busyId, setBusyId] = useState(null); // guarda anti doble click

  const load = useCallback(async () => {
    setLoading(true);
    try { setDesigns(await getAdminDesigns(status)); setError(null); }
    catch (e) { setError(e); }
    finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  // Escape cancela el rechazo
  useEffect(() => {
    if (!rejecting) return;
    const onKey = (e) => { if (e.key === 'Escape') { setRejecting(null); setReason(''); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rejecting]);

  const onApprove = async (id) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await approveDesign(id);
      toast.success('Diseño aprobado: ya está en el carrito del usuario');
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); } // p. ej. "ya fue revisado"
    finally { setBusyId(null); }
  };

  const onReject = async () => {
    if (busyId || !reason.trim()) return;
    setBusyId(rejecting);
    try {
      await rejectDesign(rejecting, reason.trim());
      toast.success('Diseño rechazado');
      setRejecting(null); setReason('');
      await load();
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setBusyId(null); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} />;

  return (
    <section className="admin-designs" aria-label="Aprobación de diseños personalizados">
      <div className="admin-designs__toolbar">
        <label className="admin-designs__filter">
          Estado:
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <span className="admin-designs__count">{designs.length} diseño(s)</span>
      </div>

      {designs.length === 0 ? (
        <p className="admin-designs__empty">No hay diseños en este estado.</p>
      ) : (
        <ul className="admin-designs__grid">
          {designs.map((d) => (
            <li key={d.id} className="design-card">
              <img className="design-card__preview" src={d.preview_image}
                alt={`Vista previa del diseño sobre ${d.product_name}`} />
              <div className="design-card__body">
                <p className="design-card__title">{d.product_name}</p>
                <p className="design-card__meta">Talla {d.size} · {d.color} · x{d.quantity}</p>
                <p className="design-card__meta">{d.user_email} · {new Date(d.created_at).toLocaleDateString('es-CO')}</p>
                <p className="design-card__price">$ {Number(d.unit_price).toLocaleString('es-CO')}</p>
                {d.rejection_reason && (
                  <p className="design-card__reason">Motivo: {d.rejection_reason}</p>
                )}
                {d.status === 'PENDING_APPROVAL' && (
                  <div className="design-card__actions">
                    <button type="button" className="design-card__approve"
                      disabled={busyId === d.id} onClick={() => onApprove(d.id)}>
                      {busyId === d.id ? 'Revisando…' : 'Aprobar'}
                    </button>
                    <button type="button" className="design-card__reject"
                      disabled={!!busyId} onClick={() => setRejecting(d.id)}>
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {rejecting && createPortal(
        <div className="design-reject-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) { setRejecting(null); setReason(''); } }}>
          <div className="design-reject" role="dialog" aria-modal="true" aria-labelledby="reject-title">
            <h3 id="reject-title">Rechazar diseño</h3>
            <p>El usuario verá este motivo y podrá ajustar su diseño y reenviarlo.</p>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              maxLength={500} rows={4} autoFocus
              placeholder="Ej.: el estampado usa contenido con derechos de autor…" />
            <div className="design-reject__actions">
              <button type="button" className="design-card__approve"
                disabled={!reason.trim() || !!busyId} onClick={onReject}>
                Confirmar rechazo
              </button>
              <button type="button" className="design-card__reject"
                onClick={() => { setRejecting(null); setReason(''); }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
```

Integración en la página existente (tabs accesibles, sin romper lo que ya hay):

```jsx
// src/pages/AdminProductApproval.jsx — envolver lo existente
import { useState } from 'react';
import AdminDesignsTab from '../components/admin/AdminDesignsTab';

const [tab, setTab] = useState('products');

<div className="approval-tabs" role="tablist" aria-label="Secciones de aprobación">
  <button role="tab" aria-selected={tab === 'products'}
    className={`approval-tab${tab === 'products' ? ' is-active' : ''}`}
    onClick={() => setTab('products')}>Productos</button>
  <button role="tab" aria-selected={tab === 'designs'}
    className={`approval-tab${tab === 'designs' ? ' is-active' : ''}`}
    onClick={() => setTab('designs')}>Diseños</button>
</div>

{tab === 'products' ? (/* …el JSX de aprobación de productos que ya existe… */) : <AdminDesignsTab />}
```

Estilos (tokens con fallback → dark mode gratis, como ya es convención):

```css
/* src/styles/AdminDesigns.css */
.approval-tabs { display: flex; gap: .5rem; border-bottom: 1px solid var(--color-border, #e2e8f0); margin-bottom: 1.25rem; }
.approval-tab { padding: .6rem 1rem; border: 0; background: transparent; color: var(--color-text-secondary, #64748b); font-weight: 600; cursor: pointer; border-bottom: 2px solid transparent; }
.approval-tab.is-active { color: var(--color-primary, #dc2626); border-bottom-color: var(--color-primary, #dc2626); }

.admin-designs__toolbar { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
.admin-designs__filter select { background: var(--color-input-bg, #fff); color: var(--color-text, #0f172a); border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; padding: .4rem .6rem; }
.admin-designs__count { color: var(--color-text-secondary, #64748b); font-size: .85rem; }
.admin-designs__empty { text-align: center; color: var(--color-text-secondary, #64748b); padding: 3rem 1rem; }
.admin-designs__grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1.25rem; }

.design-card { display: flex; flex-direction: column; overflow: hidden; background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e2e8f0); border-radius: var(--radius-xl, 12px); }
.design-card__preview { width: 100%; aspect-ratio: 1; object-fit: cover; background: var(--color-bg-tertiary, #f1f5f9); }
.design-card__body { display: flex; flex-direction: column; gap: .35rem; padding: 1rem; }
.design-card__title { margin: 0; font-weight: 600; color: var(--color-text, #0f172a); }
.design-card__meta { margin: 0; font-size: .82rem; color: var(--color-text-secondary, #64748b); }
.design-card__price { margin: 0; font-weight: 700; color: var(--color-primary, #dc2626); }
.design-card__reason { margin: 0; font-size: .82rem; color: var(--color-text-secondary, #64748b); border-left: 3px solid var(--color-primary, #dc2626); padding-left: .5rem; }
.design-card__actions { display: flex; gap: .5rem; margin-top: .75rem; }
.design-card__approve, .design-card__reject { flex: 1; padding: .5rem .75rem; border-radius: var(--radius-xl, 12px); font-weight: 600; cursor: pointer; }
.design-card__approve { border: 0; background: var(--color-primary, #dc2626); color: #fff; }
.design-card__approve:disabled { opacity: .55; cursor: not-allowed; }
.design-card__reject { border: 1px solid var(--color-border, #e2e8f0); background: transparent; color: var(--color-text-secondary, #64748b); }
.design-card__reject:hover { border-color: var(--color-primary, #dc2626); color: var(--color-primary, #dc2626); }

/* Modal de rechazo: portaled ⇒ CSS autocontenido (regla de la casa) */
.design-reject-overlay { position: fixed; inset: 0; z-index: 1000; background: rgb(15 23 42 / .55); display: grid; place-items: center; padding: 1rem; }
.design-reject { width: min(480px, 100%); display: flex; flex-direction: column; gap: .75rem; padding: 1.5rem; background: var(--color-surface, #fff); color: var(--color-text, #0f172a); border-radius: var(--radius-2xl, 16px); box-shadow: var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / .2)); }
.design-reject h3 { margin: 0; }
.design-reject p { margin: 0; font-size: .9rem; color: var(--color-text-secondary, #64748b); }
.design-reject textarea { background: var(--color-input-bg, #fff); color: var(--color-text, #0f172a); border: 1px solid var(--color-border, #e2e8f0); border-radius: 8px; padding: .6rem; resize: vertical; }
.design-reject__actions { display: flex; gap: .75rem; }
```

## 3) Verificación de punta a punta

**Backend:**
```bash
python manage.py test apps.monitoring # health + mongo, verdes
curl -s http://127.0.0.1:8000/api/health/ # {"status":"ok","postgres":true,"mongo":…,"cache":…}
```

**Flujo de aprobación (2 usuarios, la demo completa):**
1. Usuario normal: envía diseño desde el editor → queda `PENDING_APPROVAL`.
2. Admin: `/admin-approvals` → pestaña **Diseños** → ve preview, talla, precio con recargo y correo del autor.
3. **Aprobar** → toast; el diseño desaparece de Pendientes; en el carrito del usuario aparece la línea con `unit_price = base + recargo` (verificable también en `/admin` de Django).
4. **Rechazar** sin motivo → botón deshabilitado; con motivo → queda visible en el filtro "Rechazados".
5. Doble click en Aprobar → el segundo responde 400 "ya fue revisado" como toast, sin duplicar el item (idempotencia del service).

**Render:** con `healthCheckPath: /api/health/` el dashboard muestra el servicio healthy; maten Mongo Atlas temporalmente y verán que el servicio sigue 200 (degradación) — eso es exactamente lo que el ADR de persistencia políglota promete.

## 4) Docs a tocar (SDD)

- `docs/07-api/contratos.md`: `GET /api/health/` (payload y semántica 200/503) + campo `user_email` en el serializer de diseños.
- `docs/09-despliegue/despliegue.md` y `checklist-produccion.md`: healthCheckPath + política "503 solo núcleo".
- `docs/10-pruebas/escenarios-bdd.md`: *"Dado un diseño PENDING, cuando el admin lo aprueba, entonces aparece en el carrito del usuario con precio base+recargo y sale de la cola de pendientes"*.
- `docs/13-admin/panel-admin-estado-y-pendientes.md`: nueva pestaña Diseños.
- `docs/12-historial/changelog.md`: entrada de la feature.

Con esto el ciclo de personalización queda cerrado de punta a punta: editor → aprobación admin → carrito → checkout → orden con snapshot. ¿Cerramos con el spec-prompt de Copilot para esta última tanda (pestaña admin + health), o pasamos a la prueba E2E de Wompi contra el despliegue de Render/Vercel?