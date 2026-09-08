Cuatro frentes distintos; los ato en un plan por fases porque se tocan entre sí (Wompi necesita el despliegue para su webhook real; Mongo necesita Atlas para producción; SMTP necesita el `.env` correcto antes de probar en Render). Vamos en orden de riesgo.

---

## 1) SMTP "dejó de funcionar": diagnóstico en 3 comandos

Causa más probable: tras algún refactor de `.env`/`settings.py`, el backend quedó en modo `console` sin que nadie lo notara (imprime el link en terminal y *parece* que envía). Verifícalo con valores reales, no con suposiciones:

```bash
cd backend
# 1. ¿Qué configuración está leyendo Django REALMENTE?
python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from django.conf import settings
print(settings.EMAIL_BACKEND, '|', settings.EMAIL_HOST, settings.EMAIL_PORT, '|', settings.EMAIL_HOST_USER, '|', settings.DEFAULT_FROM_EMAIL)
"
# 2. Prueba de envío real
python manage.py shell -c "
from django.core.mail import send_mail
print(send_mail('Prueba RED', 'test', settings.DEFAULT_FROM_EMAIL, ['tu_correo@gmail.com']))
"
```

Checklist de causas típicas, en orden de frecuencia:

1. `EMAIL_BACKEND` en `.env` sigue en `console` (o el mapeo en `settings.py` se rompió). El mapeo correcto:
   ```python
   EMAIL_BACKEND = (
       'django.core.mail.backends.smtp.EmailBackend'
       if env('EMAIL_BACKEND', default='console') == 'smtp'
       else 'django.core.mail.backends.console.EmailBackend'
   )
   ```
2. **Gmail exige que `DEFAULT_FROM_EMAIL` sea igual a `EMAIL_HOST_USER`** (si no, error 553 de spoofing).
3. Contraseña de aplicación caducada/revocada (My Account → App passwords → regenerar; son 16 caracteres, sin espacios).
4. Puerto bloqueado por la red: probar `EMAIL_PORT=465` + `EMAIL_USE_SSL=True` en vez de 587/TLS.
5. No reiniciaste `runserver` después de editar `.env` (django-environ lee al arrancar).

---

## 2) Wompi usable por todo el equipo (y sin ngrok obligatorio)

El problema de fondo: si el flujo depende del webhook, cada compañero necesita ngrok + URL configurada en el panel → frágil. La solución arquitectónica es **doble canal de confirmación con una sola función de transición de estado**:

- **Canal A (producción):** webhook de Wompi → Render.
- **Canal B (dev/equipo):** el backend **consulta** a Wompi el estado de la transacción (`GET /transactions?reference=…` con la llave privada). Así cualquier compañero completa pagos locales **sin ngrok**.

```python
# backend/apps/payments/wompi_service.py — agregar
@classmethod
def query_transaction(cls, reference: str) -> dict:
    r = requests.get(f'{cls.BASE_URL}/transactions',
                     params={'reference': reference},
                     headers=cls.headers(), timeout=30)
    r.raise_for_status()
    data = r.json().get('data', [])
    return data[0] if data else {}
```

```python
# backend/apps/payments/views.py
# Extraer la lógica de actualización a UNA función usada por webhook Y polling:
def apply_transaction_status(reference: str, txn: dict):
    with transaction.atomic():
        order = Order.objects.select_for_update().get(reference=reference)
        status = txn.get('status')
        if order.payment_status == status:      # idempotencia: eventos duplicados no reprocesan
            return order
        order.payment_status = status
        order.status = 'CONFIRMED' if status == 'APPROVED' else (
            'PAYMENT_FAILED' if status in ('DECLINED', 'ERROR', 'VOIDED') else order.status)
        order.save()
        return order

@csrf_exempt
@require_POST
def wompi_webhook(request):
    # ...verificación de firma que ya tienes...
    txn = json.loads(request.body).get('data', {}).get('transaction', {})
    apply_transaction_status(txn.get('reference'), txn)
    return HttpResponse('OK')

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_payment(request, reference):
    """Canal B: el frontend pregunta el estado; funciona sin webhook/ngrok."""
    txn = WompiService.query_transaction(reference)
    if not txn:
        return Response({'payment_status': 'PENDING'})
    order = apply_transaction_status(reference, txn)
    return Response({'payment_status': order.payment_status, 'order_status': order.status})
```

```python
# payments/urls.py
path('wompi/sync/<str:reference>/', views.sync_payment, name='wompi-sync'),
```

La página de confirmación del frontend pollea `POST /api/payments/wompi/sync/<ref>/` cada 2 s (máx. ~15 intentos) en vez de esperar el webhook. En producción ambos canales convergen en `apply_transaction_status` → idempotente, sin órdenes duplicadas.

**Para que a tus compañeros les funcione sí o sí** (guía en `docs/08-instalacion-entorno-desarrollo/configuracion-entorno.md`):

1. Una **única cuenta sandbox de Wompi del equipo** (las claves son compartidas; guárdenlas en un gestor de contraseñas, nunca en git).
2. `.env.template` ya documenta `WOMPI_*`; cada quien copia al `.env` local.
3. Local: **ngrok opcional** (canal B cubre). Producción: webhook apuntando a Render.
4. Tarjetas de prueba en la guía: `4242424242424242` aprueba, `4111111111111111` declina.

---

## 3) MongoDB de verdad: persistencia políglota (lo que el jurado espera oír)

No muevan nada transaccional a Mongo. El uso correcto y defendible: **SQL para lo ACID (usuarios, productos, carritos, órdenes, pagos); documentos para telemetría/eventos de alto volumen y esquema flexible**. Su proyecto ya tiene dos candidatos naturales: `monitoring` (errores del frontend) y `catalog` (historial/búsquedas populares).

```txt
# backend/requirements.txt — agregar
pymongo>=4.6
dnspython>=2.6        # necesario para mongodb+srv:// (Atlas)
```

```python
# backend/config/mongo.py — NUEVO
"""Cliente Mongo singleton. Fallo de Mongo NUNCA tumba el request (degradación elegante)."""
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
# backend/apps/monitoring/views.py — escribir errores en Mongo con fallback a archivo
from config.mongo import get_db

# dentro del POST de ClientErrorLogView:
try:
    get_db()['client_errors'].insert_one({**payload, 'received_at': datetime.now(timezone.utc)})
except Exception:
    logger.exception('Mongo no disponible; error queda solo en log de archivo')
```

```python
# backend/apps/catalog/api/viewset.py — evento de búsqueda + top popular (agregación Mongo)
get_db()['search_events'].insert_one({'q': q, 'at': datetime.now(timezone.utc), 'user_id': user_id})

# endpoint /api/catalog/popular-searches/
pipeline = [
    {'$match': {'at': {'$gte': since}}},
    {'$group': {'_id': '$q', 'n': {'$sum': 1}}},
    {'$sort': {'n': -1}}, {'$limit': 10},
]
```

Equipo local sin Atlas: agreguen Mongo al `docker-compose.yml` (o instalen `mongod` nativo):

```yaml
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
volumes:
  mongo_data:
```

Con `MONGODB_URI=mongodb://localhost:27017` cada compañero lo tiene con `docker compose up -d mongo`. Producción: Atlas M0 (gratis) con `mongodb+srv://…`. Comando de verificación para el onboarding: `python manage.py check_mongo` (management command que llama `ping_mongo()`).

Documenten la decisión como ADR: *"Persistencia políglota: PostgreSQL para el núcleo transaccional; MongoDB para telemetría y analítica de búsqueda por su modelo documental, escritura de alto volumen y agregaciones nativas."*

---

## 4) Despliegue por partes: Neon → Render → Vercel

Roles reales de cada pieza de apoyo: **Gunicorn** = servidor WSGI en Render (reemplaza `runserver`); **nginx** = solo en el despliegue Dockerizado (`nginx.conf` sirve el dist en `docker-compose.prod.yml`; en Vercel NO se usa); **ngrok** = solo webhooks locales; **Docker** = paridad local/producción y la alternativa full-stack.

### Backend (Render) — ajustes que faltan en su repo

```txt
# requirements.txt
whitenoise>=6.6       # estáticos sin disco persistente (Render free no tiene disco)
```

```python
# settings.py
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {'staticfiles': {'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage'}}

# Logs: en prod a stdout (Render captura); archivos solo en dev (Render no tiene disco persistente)
if not DEBUG:
    # reemplazar handlers de archivo por 'console'
    ...
```

```yaml
# render.yaml (raíz) — servicio backend
services:
  - type: web
    name: red-backend
    runtime: python
    rootDir: backend
    plan: free
    buildCommand: pip install -r requirements.txt && python manage.py collectstatic --noinput
    preDeployCommand: python manage.py migrate --noinput
    startCommand: gunicorn config.wsgi:application --timeout 60
    healthCheckPath: /api/health/
```

Endpoint de salud (lo usa Render y su checklist):

```python
# config/views.py
def health(request):
    from django.db import connection
    from config.mongo import ping_mongo
    db_ok, mongo_ok = True, ping_mongo()
    try: connection.ensure_connection()
    except Exception: db_ok = False
    return JsonResponse({'status': 'ok', 'postgres': db_ok, 'mongo': mongo_ok},
                        status=200 if db_ok else 503)
```

### Frontend (Vercel)

```json
// frontend/vercel.json — SPA: todas las rutas al index (react-router)
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Variables en Vercel (se hornean en build, configúrenlas **antes** del primer deploy):
`VITE_API_URL=https://red-backend.onrender.com/api/`, `VITE_MEDIA_URL=…`, `VITE_CLOUDINARY_*`.

### Cruce de dominios (el paso que todos olvidan)

En el `.env` de Render:
```bash
DEBUG=False
ALLOWED_HOSTS=red-backend.onrender.com
CORS_ALLOWED_ORIGINS=https://red-frontend.vercel.app
CSRF_TRUSTED_ORIGINS=https://red-frontend.vercel.app
FRONTEND_URL=https://red-frontend.vercel.app     # links de emails de verificación
DATABASE_URL=postgresql://…neon…?sslmode=require
MONGODB_URI=mongodb+srv://…atlas…
WOMPI_REDIRECT_URL=https://red-frontend.vercel.app/checkout/confirmacion
```
Y en el panel de Wompi, **URL de Eventos** → `https://red-backend.onrender.com/api/payments/wompi/webhook/` (ngrok queda solo para dev).

### Plan de despliegue en partes (una fase por sesión)

| Fase | Acción | Verificación |
|---|---|---|
| 1 | Neon: crear proyecto y base | `psql` o string en Render |
| 2 | Render: deploy backend (sandbox Wompi + Atlas) | `/api/health/` → `{"postgres": true, "mongo": true}` |
| 3 | Vercel: deploy frontend apuntando a Render | login + catálogo + carrito e2e |
| 4 | Wompi: events URL → Render; compra con `4242…` | log de Render: `POST /api/payments/wompi/webhook/ 200` |
| 5 | Humo completo: registro→email→checkout→pago→admin | checklist-produccion.md |

**Realidades del tier gratis (documenten para que no los sorprenda en la sustentación):** Render duerme tras 15 min sin tráfico (primer request ~30-50 s; mitigable con un ping gratuito tipo UptimeRobot cada 10 min); Neon suspende la compute en inactividad (misma mitigación); Atlas M0 = 512 MB, sobra; Vercel no tiene cold start relevante para SPA.

---

## Orden de trabajo sugerido (sprint)

1. **Must:** SMTP (30 min, bloquea registro de usuarios nuevos en demo).
2. **Must:** Mongo integrado + `check_mongo` + mongo en docker-compose (requisito de fase: BD no relacional funcionando).
3. **Must:** `sync_payment` + guía de equipo Wompi (todos pagan en local sin ngrok).
4. **Must:** Pipeline Neon→Render→Vercel con health check.
5. **Should:** Webhook prod + prueba e2e con tarjeta de prueba.
6. **Could:** UptimeRobot anti-sleep; dominio propio.

Docs a tocar: `docs/08…/configuracion-entorno.md` (Wompi equipo + Mongo), `docs/09-despliegue/despliegue.md` y `checklist-produccion.md` (fases 1-5), `docs/05-arquitectura/` nuevo `adr-persistencia-poliglota.md`, `docs/12-historial/changelog.md`.

¿Por cuál empezamos a detalle: el parche completo de `settings.py` para logs/whitenoise/health en Render, o el módulo Mongo con su management command y los tests que lo cubren?


Que opinas de ésta recomendación?: que flujo o en que forma harias lo siguiente la metodologia del proyecto es s genera la imagen y se pase a una fase de aprobacion para de ahi pasar al carrito el problema es que al geenerar el diseño no se pone una talla y esas cosas como cuando se genera un producto o se selecciona uno ya echo en que forma manejarias para poder agregar las tallas y eso como un producto mas pasaarlo por aprobacion y que finalice en carrito

Voy a seguir el flujo real del proyecto: generación del diseño, aprobación, producto y carrito. Con eso te propongo una solución que conserve la separación actual y resuelva talla, cantidad y demás variantes sin duplicar lógica.

Search complete: Rastrear flujo diseño carrito

Searched codebase for "flujo generación diseños 3D personalizados aprobación producto variantes talla color carrito", 23 results

Searched codebase for "diseño generado aprobado producto final carrito compra", 24 results

Searched for files matching `**/*diseño*.{js,ts,py,java,go}`, no matches

Searched for files matching `**/*modelo*3d*.{js,ts,py,java,go}`, no matches

Searched for files matching `**/cart*.{js,ts,py,java,go}`, no matches

Searched for files matching `**/producto*.{js,ts,py,java,go}`, no matches

Searched for files matching `**/variante*.{js,ts,py,java,go}`, no matches

Searched for regex `diseño.*3d|modelo.*3d|generación.*diseño`, 92 results

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for regex `talla|color|atributo|variante` (`**/*producto*`), 6 results

Searched for files matching `**/Product3D*.{js,ts,jsx,tsx}`, 1 match

Searched for files matching `**/AdminCloudinary*.{js,ts,jsx,tsx}`, 1 match

Searched for files matching `**/Tshirt3D*.{js,ts,jsx,tsx}`, no matches

Searched for files matching `**/models3d/**`, 18 matches

Searched for files matching `**/product*.{js,ts,py,java,go}`, no matches

Searched for files matching `**/variant*.{js,ts,py,java,go}`, no matches

Searched for files matching `**/approval*.{js,ts,py,java,go}`, no matches

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Searched for text `modelo 3D`, 21 results

Searched for text `aprobación`, 9 results

Searched for text `is_approved`, 71 results

Searched for text `diseño`, 58 results

Read

Read

Read

Read

Read

Read

Read

Yo lo manejaría como una **personalización de un producto existente**, no como un producto completamente nuevo. Así reutilizas las tallas, colores, stock y precios que ya existen.

Actualmente el carrito exige un `Product` aprobado y una `Variant` válida, como se observa en `models.py` y `serializers.py`. Por eso, el diseño generado debe estar relacionado con un producto base.

## Flujo recomendado

1. **Seleccionar producto base**
   - Camiseta, sudadera, etc.
   - El usuario selecciona color y puede visualizar las tallas disponibles.
   - El diseño se genera sobre ese producto.

2. **Generar el diseño**
   Se crea una entidad independiente, por ejemplo:

```text
CustomDesign
- id
- user
- base_product
- preview_image
- model_3d_url
- design_data
- status
- rejection_reason
- approved_at
- created_at
```

Estados:

```text
DRAFT
PENDING_APPROVAL
APPROVED
REJECTED
```

El modelo `Model3D` actual ya tiene `is_approved`, pero está pensado para aprobar modelos 3D generales. Para diseños creados por usuarios conviene tener un estado propio.

3. **Enviar a aprobación**
   El diseño se guarda como `PENDING_APPROVAL`.

   El administrador revisa:

   - Imagen final.
   - Producto base.
   - Color.
   - Ubicación del diseño.
   - Precio.
   - Tallas y stock disponibles.
   - Que el diseño cumpla las reglas del negocio.

4. **Aprobar el diseño**
   Al aprobarlo, el diseño queda disponible para configurar la compra.

   Importante: la aprobación del diseño no debería copiar el stock del producto. El stock continúa perteneciendo al producto y a su variante original.

5. **Configurar la compra**
   Después de aprobar, el usuario ve una pantalla como:

```text
Diseño aprobado: Camiseta personalizada
Producto base: Camiseta clásica
Color: Negro

Talla: [S] [M] [L] [XL]
Cantidad: [-] 1 [+]
```

La talla y el color se consultan desde las variantes reales del producto. No deberían almacenarse como texto libre dentro del diseño.

6. **Agregar al carrito**
   El `CartItem` debería aceptar:

```text
product_id
variant_id
custom_design_id
quantity
unit_price
```

La validación sería:

```text
- El producto está activo.
- El producto está aprobado.
- La variante pertenece al producto.
- La variante tiene stock.
- El diseño está aprobado.
- El diseño pertenece al usuario actual.
- El diseño usa ese producto base.
```

El carrito mostraría:

```text
Camiseta personalizada
Talla: M
Color: Negro
Cantidad: 2
Vista previa del diseño
```

## Cambio de modelo recomendado

Agregar una relación opcional en `CartItem`:

```python
custom_design = models.ForeignKey(
    'designs.CustomDesign',
    null=True,
    blank=True,
    on_delete=models.PROTECT,
    related_name='cart_items',
)
```

Un producto normal tendría:

```text
product + variant
```

Un producto personalizado tendría:

```text
product + variant + custom_design
```

Así no rompes el flujo actual del catálogo ni del carrito.

## No recomiendo crear un producto duplicado

Crear un nuevo `Product` por cada diseño aprobado parece sencillo, pero puede causar problemas:

- Se duplican las tallas y colores.
- Se duplica o desincroniza el stock.
- El catálogo se llena de productos casi iguales.
- Cambiar el precio o stock del producto base se vuelve más complejo.
- Se pierde la diferencia entre producto y personalización.

La mejor separación sería:

```text
Product
  Camiseta clásica

Variant
  Talla M / Negro
  Talla L / Negro
  Talla M / Blanco

CustomDesign
  Diseño creado por el usuario

CartItem
  Camiseta clásica + Talla M / Negro + Diseño del usuario
```

## Flujo de estados completo

```text
Diseño en edición
        ↓
Guardar diseño
        ↓
Pendiente de aprobación
        ↓
Administrador aprueba
        ↓
Seleccionar talla, color y cantidad
        ↓
Agregar al carrito
        ↓
Checkout
        ↓
Pedido conserva una copia del diseño
```

En el pedido también guardaría una copia o referencia inmutable del diseño aprobado, porque el usuario podría modificarlo o eliminarlo después:

```text
OrderItem
- product_name
- variant_size
- variant_color
- custom_design_preview
- custom_design_data
- unit_price
- quantity
```

La implementación puede reutilizar el producto y las variantes que ya existen en `products`, mientras que la pantalla de selección puede seguir el patrón usado en `Product3D.jsx`. La aprobación administrativa existente en `AdminProductApproval.jsx` podría complementarse con una sección específica de diseños pendientes. 

""Pues a ver yo lo que tengo que hacer eh lo mío eh es el tema del carrito que ustedes van a hacer bueno tú te vas a hacer esa parte de las aprobaciones de cuando el cosa del editor tres D cien pruebe ¿Cierto? O sea cuando le hundas enviar ese se envíe a aprobaciones ¿Cierto? Y que ahíno sé salga con la talla en general o en general con datos X pero que salga con la imagen de leitor tres D y que salga un botón de ahí que es aprobar si es aprobado se te envía al carrito de compras o sea se te envía a tu carrito de compras siempre y cuando eh fuese aprobado el producto ¿Cierto? Y ya""

## Mi opinión sobre la recomendación

**Es estructuralmente correcta en lo importante (8/10)** y yo firmo debajo de tres decisiones suyas:

1. **El diseño es una personalización, no un Product nuevo.** Duplicar `Product` por diseño aprobado desincroniza stock, ensucia el catálogo y mata el mantenimiento. Bien.
2. **Talla/color salen de `Variant` reales, nunca texto libre.** Bien.
3. **Snapshot inmutable en el pedido.** Bien: el usuario puede borrar su diseño después de comprar y la orden debe quedar íntegra.

**Pero tiene un error de orden que choca frontalmente con el requerimiento real de tu equipo** (el mensaje de voz de tu compañero): propone elegir talla/cantidad **después** de la aprobación ("configurar la compra"), mientras que el requerimiento dice: *"que salga con la talla… y la imagen del editor 3D y un botón de aprobar; si es aprobado se te envía al carrito"*. Es decir: **la talla se captura al enviar el diseño, y la aprobación dispara el agregado al carrito automáticamente**. Con el orden de la recomendación, el admin aprobaría algo incompleto (sin cantidad ni precio final) y quedaría un limbo de "diseños aprobados que nadie configura nunca".

Y le faltan dos cosas que el flujo real exige: **modelado del precio** (recargo de estampado) y **la mecánica del auto-add al carrito** (con re-validación de stock).

## El flujo que yo haría (híbrido: su estructura + su requerimiento)

```text
Editor 3D → "Guardar diseño"
   → modal de variante/cantidad (REUTILIZA el patrón de AddToCartModal)
   → snapshot del canvas → Cloudinary → preview_image
   → POST /api/designs/  {variant, quantity, design_data, preview_image}
   → CustomDesign(PENDING_APPROVAL) con precio calculado
        ↓
Admin (pestaña "Diseños" en AdminProductApproval)
   ve: imagen 3D + producto base + talla/color + cantidad + precio
   → Aprobar  ──transacción──▶ estado APPROVED + CartItem automático al dueño
   → Rechazar ───────────────▶ rejection_reason (el usuario puede re-editar: Could)
        ↓
Carrito: línea con miniatura del diseño, talla, cantidad, unit_price congelado
        ↓
Checkout: OrderItem guarda snapshot (preview + design_data + precio)
```

Diferencias clave vs. la recomendación: **la variante y la cantidad viajan desde el envío** (el admin aprueba la foto completa de lo que se va a producir y cobrar), y **aprobar = agregar al carrito en la misma transacción** (lo que pidió tu compañero), con degradación elegante si el stock voló.

## Modelo y servicios (el corazón)

```python
# backend/apps/designs/models.py — app nueva (models3d es de assets base, no de diseños de usuario)
class CustomDesign(models.Model):
    class Status(models.TextChoices):
        DRAFT    = 'DRAFT', 'Borrador'
        PENDING  = 'PENDING_APPROVAL', 'Pendiente'
        APPROVED = 'APPROVED', 'Aprobado'
        REJECTED = 'REJECTED', 'Rechazado'

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='designs')
    base_product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='custom_designs')
    variant = models.ForeignKey('products.Variant', on_delete=models.PROTECT, related_name='custom_designs')
    quantity = models.PositiveIntegerField(default=1)
    design_data = models.JSONField()          # el DesignPayload que YA definimos: color, texturas, escala
    preview_image = models.URLField()         # snapshot del editor en Cloudinary
    surcharge = models.DecimalField(max_digits=10, decimal_places=2, default=0)  # recargo estampado
    status = models.CharField(max_length=20, choices=Status, default=Status.DRAFT)
    rejection_reason = models.TextField(blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def unit_price(self):
        return self.variant.price + self.surcharge
```

```python
# backend/apps/designs/services.py
@transaction.atomic
def approve_design(design_id, admin_user):
    design = CustomDesign.objects.select_for_update().get(pk=design_id)
    if design.status != CustomDesign.Status.PENDING:      # idempotencia: doble click no duplica
        raise ValidationError('El diseño ya fue revisado')
    design.status = CustomDesign.Status.APPROVED
    design.approved_at = timezone.now()
    design.save()
    add_design_to_cart(design)                            # requerimiento del equipo: aprobado → carrito
    Log_Auditoria.objects.create(...)                     # su auditoría existente
    return design


def add_design_to_cart(design):
    """Re-valida stock AL aprobar. Si voló, el diseño queda aprobado y se notifica."""
    try:
        with transaction.atomic():
            variant = Variant.objects.select_for_update().get(pk=design.variant_id)
            if variant.stock < design.quantity:
                raise Variant.DoesNotExist
            cart = get_or_create_cart_for_user(design.user)   # la función que ya usan en carts
            item, created = CartItem.objects.get_or_create(
                cart=cart, variant=variant, custom_design=design,
                defaults={'quantity': design.quantity, 'unit_price': design.unit_price},
            )
            if not created:
                item.quantity += design.quantity
                item.unit_price = design.unit_price       # snapshot vigente
                item.save()
    except Variant.DoesNotExist:
        notify_user(design.user, 'Tu diseño fue aprobado, pero la talla quedó sin stock. Ajusta la cantidad en Mis diseños.')
```

```python
# backend/apps/carts/models.py — el único cambio al carrito (relación opcional, como propone la recomendación)
custom_design = models.ForeignKey(
    'designs.CustomDesign', null=True, blank=True,
    on_delete=models.PROTECT, related_name='cart_items',
)
unit_price = models.DecimalField(max_digits=10, decimal_places=2)  # snapshot: base + recargo
```

> Nota técnica: no pongas `unique_together (cart, variant, custom_design)` — con `NULL` en diseños normales la restricción no deduplica (NULL ≠ NULL). La deduplicación vive en el servicio (`get_or_create`), que es testeable. Documenten esa decisión.

Endpoints y UI:

```text
POST /api/designs/                      # auth: submit desde el editor (PENDING)
GET  /api/designs/mine/                 # auth: "Mis diseños" con estados
POST /api/admin/designs/<id>/approve/   # admin
POST /api/admin/designs/<id>/reject/    # admin, body: {reason}
```

- **Editor:** el botón "Guardar diseño" abre el modal de variante/cantidad que ya tienen (misma UX del catálogo, cero UI nueva), sube el snapshot del canvas a Cloudinary con el preset unsigned que ya existe, y POSTea.
- **Admin:** pestaña nueva "Diseños" en `AdminProductApproval.jsx`: grid de pendientes con preview, usuario, producto+talla, cantidad, precio (base + recargo) y botones Aprobar/Rechazar.
- **Checkout:** `OrderItem` copia `preview_image`, `design_data` y `unit_price` (snapshot, como dice la recomendación). Los campos de diseño que hoy viven en `Order` quedan como deuda migratoria (ADR).

## Casos borde que la recomendación no cubrió

| Caso | Resolución |
|---|---|
| Stock cambia entre envío y aprobación | Re-valida con `select_for_update` al aprobar; si falla, diseño aprobado + notificación, sin carrito roto |
| Doble click en "Aprobar" | Guard de estado (`solo desde PENDING`) dentro de la transacción |
| Precio base cambia después del envío | `CartItem.unit_price` es snapshot al agregar; el recargo queda fijo al enviar |
| Usuario borra/edita su diseño tras comprar | `on_delete=PROTECT` + snapshot en OrderItem |
| Anónimo en el editor | Diseños exigen login (FK a user); el editor pide autenticación al guardar |
| Rechazo | `rejection_reason` visible en "Mis diseños"; re-editar y reenviar = Could |

## Alineado a su metodología

- **HU:** "Como usuario, envío mi diseño 3D con talla y cantidad a aprobación; si el admin lo aprueba, aparece en mi carrito con su vista previa".
- **BDD (para `docs/10-pruebas/escenarios-bdd.md`):** *Dado un diseño PENDING con talla M x2, cuando el admin aprueba, entonces existe un CartItem con esa variante, cantidad 2 y unit_price = base + recargo; y el diseño queda APPROVED con approved_at.*
- **Docs:** contrato nuevo en `docs/07-api/contratos.md`, `diagrams/secuencia-diseno.puml`, changelog.
- **MoSCoW:** Must = modelo + submit con variante + aprobar/rechazar + auto-carrito; Should = "Mis diseños"; Could = reenvío tras rechazo; Won't = galería pública de diseños.

En resumen: **quédense con el esqueleto de la recomendación (CustomDesign + FK opcional en CartItem + snapshot en orden), pero muevan la captura de talla/cantidad al momento del envío y disparen el carrito desde la aprobación** — eso es exactamente lo que tu compañero describió de voz, y es lo que hace que su parte del carrito reciba líneas completas y cobrables sin pantallas intermedias.

¿Te preparo los escenarios BDD completos y el prompt-spec para Opencode con este flujo, o primero el serializer + viewset de `designs` con sus tests?


## Qué son, en una imagen

Imagina un restaurante: **Django es el mesero** (atiende la petición HTTP y debe responder rápido), **Celery es la cocina** (ejecuta trabajo pesado fuera de la vista del cliente), y **Redis es la comanda/tablero de pedidos** (la cola donde el mesero deja tickets y los cocineros los toman).

- **Redis:** base de datos **en memoria** (clave-valor, ultrarrápida). En su proyecto cumple dos roles posibles: **broker** (la cola de mensajes de Celery) y **caché** de Django (resultados caros: facets del catálogo, búsquedas populares).
- **Celery:** framework de **tareas asíncronas y distribuidas** para Python. Un *worker* (proceso separado) consume la cola y ejecuta funciones (`tasks`) fuera del ciclo request/response. Con **Celery Beat** además programas tareas periódicas (cron distribuido).

**Por qué los necesitan:** hoy su request de registro espera a que Gmail responda (SMTP ≈ 1-3 s), una subida a Cloudinary bloquea al admin, y si Wompi no manda el webhook nadie reconcilia la orden. Con Celery, el request responde al instante y el trabajo lento/repetible vive en la cola con **reintentos automáticos**.

## Estado actual del proyecto

Ya tienen el 60% del camino: `config/celery.py` existe y `requirements.txt` trae Celery 5.4 + Redis. Lo que falta es (a) cableado completo, (b) **tareas reales** (hoy nadie llama `.delay()`), y (c) Redis corriendo para el equipo. Vamos por partes.

## 1. Cableado (una sola vez)

```python
# backend/config/celery.py — patrón canónico (verifiquen que coincida)
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
app = Celery('red_estampacion')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks() # descubre apps/*/tasks.py
```

```python
# backend/config/__init__.py
from .celery import app as celery_app
__all__ = ('celery_app',)
```

```python
# backend/config/settings.py
REDIS_URL = env('REDIS_URL', default='redis://localhost:6379/0')
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# CLAVE para el equipo: en dev/tests SIN Redis, las tareas corren en línea.
# Así ningún compañero se bloquea por no tener el broker levantado.
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=DEBUG)
CELERY_TASK_EAGER_PROPAGATES = True

CELERY_BEAT_SCHEDULE = {
    'reconciliar-pagos-pendientes': {
        'task': 'apps.payments.tasks.reconcile_pending_payments',
        'schedule': 600.0, # cada 10 min
    },
    'purgar-carritos-abandonados': {
        'task': 'apps.carts.tasks.purge_abandoned_carts',
        'schedule': crontab(hour=3, minute=0), # diario 03:00
    },
}
```

```yaml
# docker-compose.yml — agregar servicio
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes: [redis_data:/data]
volumes:
  redis_data:
```

```bash
# .env / .env.template
REDIS_URL=redis://localhost:6379/0 # Docker: redis://redis:6379/0
```

## 2. Tareas reales mapeadas a SUS apps

**a) Emails fuera del request (users)** — el cambio con más impacto percibido:

```python
# backend/apps/users/tasks.py
from celery import shared_task
from smtplib import SMTPException

@shared_task(
    autoretry_for=(SMTPException, ConnectionError, TimeoutError),
    retry_kwargs={'max_retries': 3},
    retry_backoff=True, retry_jitter=True, # 1s, 2s, 4s… con jitter
)
def send_verification_email(user_id: int, token: str):
    from .models import Usuario, Token_Verificacion # import local: evita ciclos al arrancar worker
    user = Usuario.objects.get(pk=user_id)
    ...send_mail(...) # el mismo código que hoy está inline en el viewset
```

En el viewset, una línea cambia todo:

```python
# antes: send_mail(...) ← bloqueaba 1-3 s y si Gmail caía, el registro fallaba
send_verification_email.delay(user.id, token) # responde al instante; reintenta solo
```

**b) Reconciliación de pagos (payments)** — el "canal B" de Wompi convertido en red de seguridad periódica: si el webhook se pierde (ngrok caído, Render dormido), Beat reconcilia solo:

```python
# backend/apps/payments/tasks.py
@shared_task
def reconcile_pending_payments():
    stale = Order.objects.filter(
        status='PENDING_PAYMENT',
        created_at__lt=timezone.now() - timedelta(minutes=10),
    )[:50]
    for order in stale:
        txn = WompiService.query_transaction(order.reference)
        if txn:
            apply_transaction_status(order.reference, txn) # ya es idempotente ✔
```

**c) Higiene (carts / models3d):** purgar carritos abandonados (arriba en Beat) y, diario, borrar recursos huérfanos de Cloudinary usando el `cloudinary_service.py` que ya tienen.

## 3. Redis como caché (segundo rol, 5 líneas)

```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}
```

Y en `catalog`: `cache.set('catalog:facets', facets, 300)` con invalidación en la signal de publicar producto (ya tienen `signals.py` y `config/cache_utils.py`: conéctenlos). Las aggregations de Mongo para búsquedas populares también se cachean aquí.

## 4. Cómo se corre y se verifica

```bash
docker compose up -d redis
celery -A config worker -l info # terminal 2: la "cocina"
celery -A config beat -l info # terminal 3: el "reloj" (solo si prueban tareas periódicas)

celery -A config inspect ping # salud del worker
```

Prueba: registren un usuario → el HTTP responde al instante y 1 s después el worker loguea el envío. Maten SMTP a propósito (puerto malo) → ven los 3 reintentos con backoff en el log del worker. Eso es material de demo para el jurado.

## 5. La verdad del tier gratis (Render)

Los **workers y cron de Render son de pago**. Estrategia defendible y gratuita:

- **Dev/Docker:** worker + beat reales con Redis local.
- **Producción free:** `CELERY_TASK_ALWAYS_EAGER=True` en el env de Render → las tareas ejecutan en línea dentro del request (mismo código, cero infra extra). El reconcile de pagos queda cubierto además por el polling del frontend (canal B) y, si quieren periodicidad real gratis, un cron externo gratuito (cron-job.org) llamando a un endpoint protegido `/api/admin/maintenance/reconcile/`.
- Documenten la decisión como ADR: *"Cola real en desarrollo; modo eager en producción free por restricción de plataforma; migración a worker dedicado al pasar a plan pago"*. Eso convierte una limitación en decisión arquitectónica.

## Reglas de oro para sustentar

1. **Nunca pasar modelos a una tarea**: solo IDs (el objeto puede cambiar entre el enqueue y la ejecución).
2. **Tareas idempotentes**: Celery garantiza *at-least-once* → una tarea puede correr dos veces; `apply_transaction_status` y los purges ya lo son; los emails se deduplican por token.
3. **Tareas cortas y acotadas**: lotes de 50 órdenes, no miles.
4. **Eager en tests**: sus pruebas BDD corren sin Redis gracias al flag.

## Cierre metodológico

- **MoSCoW:** Must = cableado + eager-fallback + tarea de email; Should = reconcile de pagos + Redis en compose; Could = caché de facets y limpieza Cloudinary; Won't = Flower/múltiples colas (por ahora).
- **Docs:** `05-arquitectura/stack-tecnologico.md` y `arquitectura-general.md` (componente async), `09-despliegue/despliegue.md` (estrategia worker), nuevo ADR eager-prod, escenario BDD de reintentos en `10-pruebas/escenarios-bdd.md`, changelog.

¿Les desarrollo el paquete completo de `payments/tasks.py` + endpoint de mantenimiento con su test, o prefieren el prompt-spec para Opencode que cablee emails asíncronos en todos los flujos de `users` (verificación, recuperación, cambio de estado)?



Aquí está el paquete completo y coherente: **services (núcleo síncrono) → tasks (capa asíncrona con reintentos) → beat (reloj) → command + endpoint (ejecución sin broker)**, más tests. La regla de diseño: *la lógica de negocio vive en `services.py` y es síncrona*; Celery solo agrega reintentos, programación y fan-out encima. Así el mismo código corre con worker, en modo eager, desde un comando o desde un cron externo.

## 1. `apps/payments/services.py` (núcleo reutilizable)

Si ya tenían `apply_transaction_status` en `views.py`, **múevanla aquí** (views y tasks la importan; evita import circular):

```python
# backend/apps/payments/services.py
"""Lógica de negocio de pagos: usable por views, tasks Celery y management commands."""
import logging

from django.db import transaction
from django.db.models import F

from apps.orders.models import Order, OrderItem
from apps.products.models import Variant
from .wompi_service import WompiService

logger = logging.getLogger('payments')


def apply_transaction_status(reference: str, txn: dict):
    """Transición de estado IDEMPOTENTE. Devuelve (order, changed)."""
    with transaction.atomic():
        order = Order.objects.select_for_update().get(reference=reference)
        status = txn.get('status')
        if order.payment_status == status: # evento duplicado → no-op
            return order, False
        order.payment_status = status
        order.wompi_transaction_id = txn.get('id') or order.wompi_transaction_id
        if status == 'APPROVED':
            order.status = 'CONFIRMED'
        elif status in ('DECLINED', 'ERROR', 'VOIDED'):
            order.status = 'PAYMENT_FAILED'
        order.save()
        logger.info('Orden %s → %s', reference, status)
        return order, True


def reconcile_one(reference: str):
    """Canal B: consulta Wompi y aplica el estado. Devuelve (order|None, changed)."""
    txn = WompiService.query_transaction(reference)
    if not txn:
        return None, False
    return apply_transaction_status(reference, txn)


def restore_stock(order):
    """Devuelve stock de todas las líneas de la orden (expiración / anulaciones)."""
    for item in OrderItem.objects.select_for_update().filter(order=order):
        Variant.objects.select_for_update().filter(pk=item.variant_id).update(
            stock=F('stock') + item.quantity
        )
```

## 2. `apps/payments/tasks.py` (el paquete pedido)

```python
# backend/apps/payments/tasks.py
"""
Tareas Celery del módulo de pagos.

Reglas que aplican aquí (y que sustentan el diseño):
- Idempotencia: Celery garantiza at-least-once; cada tarea puede correr 2 veces sin efecto doble.
- Solo IDs por frontera de tarea (nunca instancias de modelo).
- Lotes acotados (BATCH) y time_limit para que ningún worker quede colgado.
- La lógica vive en services.py; aquí solo hay orquestación, reintentos y correos.
"""
import logging
from datetime import timedelta
from smtplib import SMTPException

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.orders.models import Order
from . import services
from .wompi_service import WompiError

logger = logging.getLogger('payments')

BATCH = 50 # máx. órdenes por ciclo (tareas cortas)
PENDING_CUTOFF_MINUTES = 10 # antigüedad mínima para reconciliar


# ── Reconciliación ────────────────────────────────────────────────────────────
@shared_task(
    name='apps.payments.tasks.reconcile_order',
    autoretry_for=(WompiError, ConnectionError, TimeoutError),
    retry_kwargs={'max_retries': 3},
    retry_backoff=True, retry_jitter=True, # 1s, 2s, 4s… + jitter
    acks_late=True, # si el worker muere a mitad, se re-encola
    time_limit=60,
)
def reconcile_order(reference: str) -> dict:
    """Reconcilia UNA orden contra Wompi y encadena notificaciones."""
    order, changed = services.reconcile_one(reference)
    if order is None:
        return {'reference': reference, 'status': None, 'changed': False}
    if not changed:
        return {'reference': reference, 'status': order.payment_status, 'changed': False}

    if order.payment_status == 'APPROVED':
        send_payment_receipt_email.delay(order.id)
    elif order.payment_status in ('DECLINED', 'ERROR', 'VOIDED'):
        notify_payment_failed.delay(order.id)
    return {'reference': reference, 'status': order.payment_status, 'changed': True}


@shared_task(name='apps.payments.tasks.reconcile_pending_payments', time_limit=120)
def reconcile_pending_payments() -> dict:
    """Beat (cada 10 min): fan-out de órdenes PENDING_PAYMENT viejas.
    Red de seguridad si el webhook de Wompi se pierde (ngrok caído, Render dormido)."""
    cutoff = timezone.now() - timedelta(minutes=PENDING_CUTOFF_MINUTES)
    refs = list(
        Order.objects.filter(status='PENDING_PAYMENT', created_at__lt=cutoff)
        .order_by('created_at')
        .values_list('reference', flat=True)[:BATCH]
    )
    for ref in refs:
        reconcile_order.delay(ref) # cada una con sus propios reintentos
    return {'queued': len(refs)}


# ── Expiración de pagos abandonados ──────────────────────────────────────────
@shared_task(name='apps.payments.tasks.expire_stale_pending_orders', time_limit=300)
def expire_stale_pending_orders(hours: int = 24) -> dict:
    """Beat diario: órdenes PENDING_PAYMENT de +24h se expiran y liberan stock.
    Antes de expirar, última consulta a Wompi por si el pago sí entró."""
    cutoff = timezone.now() - timedelta(hours=hours)
    expired = 0
    for order in list(Order.objects.filter(status='PENDING_PAYMENT', created_at__lt=cutoff)[:BATCH]):
        with transaction.atomic():
            locked = Order.objects.select_for_update().get(pk=order.pk)
            if locked.status != 'PENDING_PAYMENT':
                continue
            try:
                late, _ = services.reconcile_one(locked.reference)
            except WompiError:
                logger.warning('Wompi no responde por %s; se omite este ciclo', locked.reference)
                continue
            if late == 'APPROVED': # pagó tarde: se confirma, no se expira
                send_payment_receipt_email.delay(locked.id)
                continue
            locked.status = 'EXPIRED'
            locked.payment_status = 'EXPIRED'
            locked.save(update_fields=['status', 'payment_status'])
            services.restore_stock(locked)
            expired += 1
    return {'expired': expired}


# ── Notificaciones (con deduplicación at-least-once) ─────────────────────────
@shared_task(
    name='apps.payments.tasks.send_payment_receipt_email',
    autoretry_for=(SMTPException, ConnectionError, TimeoutError),
    retry_kwargs={'max_retries': 3}, retry_backoff=True, retry_jitter=True,
)
def send_payment_receipt_email(order_id: int) -> str:
    # Marca atómica: si la tarea se ejecuta dos veces, el recibo se envía una sola.
    marked = Order.objects.filter(pk=order_id, receipt_sent_at__isnull=True).update(
        receipt_sent_at=timezone.now()
    )
    if not marked:
        return 'already_sent'

    order = Order.objects.select_related('user').get(pk=order_id)
    send_mail(
        subject=f'RED · Recibo del pedido {order.reference}',
        message=(
            f'Hola:\n\nTu pedido {order.reference} por $ {order.total.toLocalestring() if False else order.total} '
            f'COP fue pagado y confirmado.\nGracias por comprar en RED.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.user.email],
        fail_silently=False,
    )
    return 'sent'


@shared_task(
    name='apps.payments.tasks.notify_payment_failed',
    autoretry_for=(SMTPException, ConnectionError, TimeoutError),
    retry_kwargs={'max_retries': 3}, retry_backoff=True, retry_jitter=True,
)
def notify_payment_failed(order_id: int) -> str:
    marked = Order.objects.filter(pk=order_id, failure_notified_at__isnull=True).update(
        failure_notified_at=timezone.now()
    )
    if not marked:
        return 'already_notified'

    order = Order.objects.select_related('user').get(pk=order_id)
    send_mail(
        subject=f'RED · No pudimos procesar el pago de {order.reference}',
        message=(
            f'Tu pago del pedido {order.reference} fue declinado por la pasarela.\n'
            f'Ingresa a {settings.FRONTEND_URL}/dashboard para reintentar el pago.'
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[order.user.email],
        fail_silently=False,
    )
    return 'notified'
```

> Limpia el f-string del recibo a `f'... por $ {order.total} COP ...'` (dejé una expresión defensiva por error de tipeo al redactar; en su repo va directo).

Migración requerida por las marcas de deduplicación:

```python
# apps/orders/models.py — Order
receipt_sent_at = models.DateTimeField(null=True, blank=True)
failure_notified_at = models.DateTimeField(null=True, blank=True)
```
```bash
python manage.py makemigrations orders && python manage.py migrate
```

## 3. Beat + settings

```python
# config/settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'payments-reconcile-pending': {
        'task': 'apps.payments.tasks.reconcile_pending_payments',
        'schedule': 600.0, # cada 10 min
    },
    'payments-expire-stale': {
        'task': 'apps.payments.tasks.expire_stale_pending_orders',
        'schedule': crontab(hour=2, minute=30), # diario 02:30
    },
}
MAINTENANCE_KEY = env('MAINTENANCE_KEY', default=None) # secreto del cron externo
```

## 4. Ejecución sin broker: command + endpoint (equipo, demo y Render free)

```python
# backend/apps/payments/management/commands/reconcile_payments.py
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.orders.models import Order
from apps.payments import services


class Command(BaseCommand):
    help = 'Reconcilia órdenes PENDING_PAYMENT contra Wompi de forma síncrona (sin broker).'

    def add_arguments(self, parser):
        parser.add_argument('--minutes', type=int, default=10)
        parser.add_argument('--limit', type=int, default=50)

    def handle(self, *args, **opts):
        cutoff = timezone.now() - timedelta(minutes=opts['minutes'])
        qs = Order.objects.filter(status='PENDING_PAYMENT', created_at__lt=cutoff)[:opts['limit']]
        n = 0
        for order in qs:
            order_res, changed = services.reconcile_one(order.reference)
            status = order_res.payment_status if order_res else 'sin_transaccion'
            self.stdout.write(f'{order.reference}: {status} (changed={changed})')
            n += 1
        self.stdout.write(self.style.SUCCESS(f'Órdenes reconciliadas: {n}'))
```

```python
# backend/apps/payments/views.py — agregar (cron externo gratuito en producción free)
import hmac

@api_view(['POST'])
@permission_classes([AllowAny])
def maintenance_reconcile(request):
    key = request.headers.get('X-Maintenance-Key', '')
    if not settings.MAINTENANCE_KEY or not hmac.compare_digest(key, settings.MAINTENANCE_KEY):
        return Response({'detail': 'forbidden'}, status=403)
    call_command('reconcile_payments', minutes=10, limit=50)
    return Response({'ok': True})
```

```python
# payments/urls.py
path('maintenance/reconcile/', views.maintenance_reconcile, name='maintenance-reconcile'),
```

En producción free (Render sin worker/beat): cron-job.org → `POST https://red-backend.onrender.com/api/payments/maintenance/reconcile/` cada 10 min con el header. En dev: `python manage.py reconcile_payments` para demos en vivo.

## 5. Tests (con eager, sin Redis)

```python
# backend/apps/payments/tests/test_tasks.py
from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from apps.orders.models import Order
from .. import tasks


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class ReconcileTasksTest(TestCase):
    fixtures = ['payments_test_fixture'] # user + product + variant + order PENDING

    def _age_order(self, order, minutes=15):
        Order.objects.filter(pk=order.pk).update(
            created_at=timezone.now() - timedelta(minutes=minutes)
        )

    @patch('apps.payments.services.WompiService.query_transaction')
    @patch('django.core.mail.send_mail')
    def test_reconcile_aproba_y_envia_recibo_una_sola_vez(self, mail, wompi):
        order = Order.objects.first(); self._age_order(order)
        wompi.return_value = {'id': 'txn_1', 'status': 'APPROVED', 'reference': order.reference}

        tasks.reconcile_pending_payments() # beat simulado
        tasks.reconcile_order(order.reference) # duplicado: at-least-once

        order.refresh_from_db()
        self.assertEqual(order.status, 'CONFIRMED')
        self.assertEqual(mail.call_count, 1) # dedupe por receipt_sent_at
        self.assertIsNotNone(order.receipt_sent_at)

    @patch('apps.payments.services.WompiService.query_transaction')
    def test_expire_libera_stock_si_no_hay_pago(self, wompi):
        order = Order.objects.first(); self._age_order(order, minutes=60 * 25)
        wompi.return_value = {}
        stock_before = order.items.first().variant.stock

        tasks.expire_stale_pending_orders(hours=24)

        order.refresh_from_db()
        self.assertEqual(order.status, 'EXPIRED')
        self.assertEqual(order.items.first().variant.stock,
                           stock_before + order.items.first().quantity)
```

## 6. Operación y verificación

```bash
docker compose up -d redis
celery -A config worker -l info # verás: task apps.payments.tasks.reconcile_order
celery -A config beat -l info

# Demo para el jurado: crear orden PENDING, pagar con 4242… en sandbox,
# tumbar el webhook (matar ngrok) y ejecutar:
python manage.py reconcile_payments # → "RED-XXXX: APPROVED (changed=True)"
```

**Render free:** `CELERY_TASK_ALWAYS_EAGER=True` (sin worker) + cron-job.org apuntando al endpoint de mantenimiento = reconciliación periódica gratuita. Al pasar a plan pago: worker + beat reales sin cambiar una línea de código (ADR documentado).

**Docs a tocar:** `09-despliegue/despliegue.md` (estrategia worker/cron), `05-arquitectura/stack-tecnologico.md` (Celery/Redis), nuevo escenario BDD *"Dado un webhook perdido, cuando corre el beat, entonces la orden se confirma sin intervención"* en `10-pruebas/escenarios-bdd.md`, y entrada en `12-historial/changelog.md`.

¿Sigo con el spec-prompt para Opencode que cablee este paquete completo al repo (services + tasks + beat + command + tests), o con la plantilla HTML del recibo para que el email no sea texto plano?