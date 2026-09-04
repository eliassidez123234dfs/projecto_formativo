# Patrones de Diseño, SOLID y DRY — RED Estampación

> Catálogo de patrones de diseño aplicados en el proyecto y principios SOLID/DRY,
> con ejemplos concretos del código base. Cada sección explica QUÉ es, DÓNDE se aplica y CÓMO se implementa.

---

## Índice

- [MVC (Model-View-Controller)](#mvc-model-view-controller)
- [Repository Pattern](#repository-pattern)
- [Singleton](#singleton)
- [Observer (Signals)](#observer-signals)
- [Template Method](#template-method)
- [Factory Method](#factory-method)
- [Strategy](#strategy)
- [Adapter](#adapter)
- [Active Record](#active-record)
- [Principios SOLID](#principios-solid)
- [Principios DRY](#principios-dry)
- [Defensa en Profundidad — Seguridad](#defensa-en-profundidad--seguridad)
- [Resumen](#resumen)

---

## MVC (Model-View-Controller)

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Model-View-Controller (a través de Django MTV) |
| **Propósito** | Separar la lógica de negocio, la presentación y el control de flujo |
| **Dónde se usa** | Todo el proyecto Django |
| **Ejemplo** | `Product` (Model) → `ProductViewSet` (Controller) → Serializer/JSON (View) |

Django implementa una variante llamada **MTV (Model-Template-View)**. En el contexto de DRF, los **ModelViewSet** actúan como controladores que conectan los modelos con los serializadores (vistas).

```python
# Model (backend/apps/products/models.py)
class Product(models.Model):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=500)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)

# Controller (backend/apps/products/api/viewset.py)
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# View / Serializer (backend/apps/products/api/serializers.py)
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = '__all__'
```

---

## Repository Pattern

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Repository Pattern (via Django Managers / QuerySets) |
| **Propósito** | Abstraer el acceso a datos y centralizar consultas reutilizables |
| **Dónde se usa** | Managers personalizados y QuerySets en `models.py` |
| **Ejemplo** | `Product.objects.filter(is_active=True, is_approved=True)` |

Django ORM actúa como un **Repository** nativo. Los Model managers encapsulan la lógica de consultas:

```python
# Repository pattern via custom Manager
class ProductManager(models.Manager):
    def published(self):
        return self.filter(is_active=True, is_approved=True)

    def available_for_sale(self):
        return self.published().filter(variants__stock__gt=0).distinct()

# Uso en vistas (backend/apps/products/models.py)
Product.objects.available_for_sale()
```

Los serializadores y vistas nunca acceden directamente a la BD sin pasar por el ORM.

---

## Singleton

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Singleton |
| **Propósito** | Garantizar una única instancia de configuración global |
| **Dónde se usa** | `django.conf.settings`, `apps.py`, configuración de Celery |
| **Ejemplo** | `from django.conf import settings` |

Django mantiene una única instancia del objeto `settings` durante todo el ciclo de vida de la aplicación. También se usa en la configuración de Celery y Cloudinary:

```python
from django.conf import settings

class CloudinaryService:
    """Servicio singleton para Cloudinary"""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.configure(**settings.CLOUDINARY_CONFIG)
        return cls._instance
```

---

## Observer (Signals)

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Observer (via Django Signals) |
| **Propósito** | Notificar a otros componentes cuando ocurre un evento sin acoplamiento directo |
| **Dónde se usa** | `signals.py` en apps de usuarios, productos, pedidos |
| **Ejemplo** | Enviar email al registrarse, auditar cambios de estado |

```python
# signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail

@receiver(post_save, sender=Order)
def notify_order_paid(sender, instance, created, **kwargs):
    """Observer: enviar email cuando una orden se marca como pagada"""
    if instance.status == Order.STATUS_PAID:
        send_mail(
            subject=f'Pedido #{instance.order_number} confirmado',
            message='Tu pedido ha sido procesado exitosamente.',
            from_email='noreply@redestampacion.com',
            recipient_list=[instance.customer_email],
        )
```

---

## Template Method

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Template Method (via Django Class-Based Views / DRF ViewSets) |
| **Propósito** | Definir el esqueleto de un algoritmo en una operación, delegando pasos a subclases |
| **Dónde se usa** | `ModelViewSet`, `GenericAPIView`, vistas basadas en clases |
| **Ejemplo** | `ModelViewSet` define `list()`, `create()`, `update()`, `destroy()` y permite sobreescribir `perform_create()` |

```python
# Template Method en DRF ViewSets
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    # Template Method: perform_create es llamado por create()
    def perform_create(self, serializer):
        serializer.save()

    # Template Method: list() usa get_queryset() y get_serializer()
    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(categories__category__name=category)
        return qs
```

---

## Factory Method

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Factory Method (via Django Model Factories / Serializers) |
| **Propósito** | Crear objetos sin especificar la clase concreta |
| **Dónde se usa** | `serializers.py`, factory methods en modelos, métodos en vistas |
| **Ejemplo** | `OrderSerializer.create()` construye items de orden desde el carrito |

```python
# Factory Method en serializers
class CheckoutSerializer(serializers.Serializer):
    cart_id = serializers.IntegerField()
    shipping_address = serializers.CharField()

    def create(self, validated_data):
        """Factory: construye una Order y sus OrderItems desde un Cart"""
        cart = Cart.objects.get(id=validated_data['cart_id'])
        order = Order.objects.create(
            user=cart.user,
            shipping_address=validated_data['shipping_address'],
            total=cart.total_amount,
        )
        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                product=cart_item.product,
                variant=cart_item.variant,
                quantity=cart_item.quantity,
                unit_price=cart_item.unit_price,
            )
        return order
```

---

## Strategy

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Strategy (via DRF Permissions / Throttles / Authentication) |
| **Propósito** | Definir una familia de algoritmos intercambiables en tiempo de ejecución |
| **Dónde se usa** | `permission_classes`, `throttle_classes`, `authentication_classes` en ViewSets |
| **Ejemplo** | Diferentes permisos según el rol del usuario |

```python
from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsAdminOrReadOnly(BasePermission):
    """Estrategia: solo admins pueden modificar, resto solo lectura"""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and request.user.rol == 'Administrador'

class IsOwner(BasePermission):
    """Estrategia: solo el dueño del recurso puede acceder"""
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user

# Uso: intercambiar estrategias según la vista
class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner]
    throttle_classes = [UserRateThrottle]
```

---

## Adapter

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Adapter (Wrapper) |
| **Propósito** | Convertir la interfaz de una clase en otra interfaz esperada por el cliente |
| **Dónde se usa** | Integración con Wompi API (pasarela de pagos), Cloudinary |
| **Ejemplo** | `WompiService` adapta la API REST de Wompi al dominio del proyecto |

```python
# Adapter Pattern para Wompi
import requests
from django.conf import settings

class WompiService:
    """Adapter: wrappea la API de Wompi a interfaces del dominio"""

    BASE_URL = 'https://production.wompi.com/v1'

    def create_transaction(self, amount, reference, redirect_url):
        response = requests.post(
            f'{self.BASE_URL}/transactions',
            headers={'Authorization': f'Bearer {settings.WOMPI_PUBLIC_KEY}'},
            json={
                'amount_in_cents': int(amount * 100),
                'currency': 'COP',
                'reference': reference,
                'redirect_url': redirect_url,
            }
        )
        return response.json()

    def verify_transaction(self, transaction_id):
        response = requests.get(
            f'{self.BASE_URL}/transactions/{transaction_id}',
            headers={'Authorization': f'Bearer {settings.WOMPI_PUBLIC_KEY}'},
        )
        return response.json()

    def process_webhook(self, payload):
        event = payload.get('event')
        transaction = payload.get('data', {}).get('transaction', {})
        return {
            'event': event,
            'transaction_id': transaction.get('id'),
            'status': transaction.get('status'),
            'reference': transaction.get('reference'),
        }
```

---

## Active Record

| Atributo | Descripción |
|----------|-------------|
| **Nombre** | Active Record |
| **Propósito** | Cada objeto model encapsula datos y comportamiento de acceso a BD |
| **Dónde se usa** | Todos los modelos Django heredan de `models.Model` |
| **Ejemplo** | `Product.save()`, `Product.objects.filter()` |

```python
# Active Record: el modelo contiene datos Y lógica de persistencia
class Product(models.Model):
    name = models.CharField(max_length=100)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Comportamiento de negocio (no solo datos)
    @property
    def can_be_published(self) -> bool:
        return self.has_main_image and self.has_valid_variant

    def clean(self):
        """Validación antes de guardar"""
        if self.base_price <= 0:
            raise ValidationError('El precio debe ser mayor a 0')

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
```

---

## Principios SOLID

| Principio | Aplicación en el proyecto |
|-----------|--------------------------|
| **S** - Responsabilidad Única | Cada app Django tiene una responsabilidad definida (`users`, `products`, `orders`, `carts`, `checkout`) |
| **O** - Abierto/Cerrado | DRF permite extender comportamientos via mixins sin modificar clases base. Los permisos y autenticaciones son intercambiables |
| **L** - Sustitución de Liskov | `ModelViewSet` puede ser sustituido por `ReadOnlyModelViewSet` o `GenericViewSet` sin romper el contrato |
| **I** - Segregación de Interfaces | Serializadores específicos por acción (`ProductListSerializer`, `ProductDetailSerializer`, `ProductCreateSerializer`) en lugar de uno gigante |
| **D** - Inversión de Dependencias | Las vistas dependen de abstracciones (serializers, permisos) no de implementaciones concretas. La inyección de dependencias via `get_serializer_class()` y `get_permissions()` |

### SRP — Single Responsibility Principle

**Qué es:** Cada clase/módulo debe tener UNA sola razón para cambiar.

| App | Responsabilidad Única | Archivo principal |
|-----|----------------------|-------------------|
| `users` | Autenticación, autorización y perfiles | `apps/users/` |
| `products` | CRUD de productos, variantes e imágenes | `apps/products/` |
| `carts` | Gestión del carrito de compras | `apps/carts/` |
| `catalog` | Navegación, filtros y búsqueda de productos | `apps/catalog/` |
| `orders` | Ciclo de vida de pedidos y facturación | `apps/orders/` |
| `checkout` | Procesamiento de pagos (Wompi) | `apps/checkout/` |
| `models3d` | Gestión de modelos 3D | `apps/models3d/` |
| `landing` | Formulario de contacto público | `apps/landing/` |

El método `save()` del modelo `Usuario` se limita a `full_clean()` y `super().save()`. No maneja hasheo de contraseña (delegado a validators), envío de emails (delegado a EmailService), ni creación de tokens (delegado a serializadores).

### OCP — Open/Closed Principle

**Qué es:** Las clases deben estar abiertas para extensión, cerradas para modificación.

Los ViewSets de DRF se extienden agregando `@action` nuevos sin modificar los métodos base. En lugar de modificar `UsuarioSerializer` para el admin, se crea `UsuarioDetailSerializer` que extiende la funcionalidad.

### LSP — Liskov Substitution Principle

**Qué es:** Las subclases deben poder sustituir a sus clases base sin alterar el comportamiento.

Todos los ModelViewSet siguen el mismo contrato (`list`, `create`, `retrieve`, `update`, `destroy`) y pueden intercambiarse sin romper el enrutamiento del `DefaultRouter`.

### ISP — Interface Segregation Principle

**Qué es:** Las interfaces deben ser específicas para cada cliente. Muchas interfaces pequeñas > una interfaz general.

```javascript
// services/api.js
export const api = axios.create({...});          // Autenticado con JWT
const publicApi = axios.create({...});           // Sin autenticación
const sessionApi = axios.create({...});          // Cookies de sesión
```

Cada cliente HTTP expone solo los métodos que necesita. Cada ViewSet usa el serializador adecuado para cada acción via `get_serializer_class()`.

### DIP — Dependency Inversion Principle

**Qué es:** Depender de abstracciones, no de implementaciones concretas.

DRF permite intercambiar serializadores, permisos, paginación y autenticación sin modificar el ViewSet. Los serializadores y vistas dependen de `EmailService.enviar_correo()`, no de los detalles de `send_mail()` o Celery.

```python
# apps/users/services/email_service.py
class EmailService:
    @staticmethod
    def enviar_correo(destinatario, asunto, mensaje):
        # Oculta la implementación (send_mail de Django vs Celery async)
        ...
```

---

## Principios DRY

**Qué es:** Cada pieza de conocimiento debe tener una representación única y no ambigua dentro del sistema.

| Principio | Aplicación en el proyecto |
|-----------|--------------------------|
| **Reutilización de serializers** | Serializadores base que extienden clases concretas |
| **Permission Mixins** | Mixins como `AdminPermissionMixin` reutilizados en múltiples ViewSets |
| **Services** | Lógica de negocio encapsulada en servicios reutilizables (WompiService, CloudinaryService) |
| **Validación centralizada** | Métodos `clean()` en modelos evitan duplicar validación en serializers y vistas |
| **URLs dinámicas** | `routers.register()` en lugar de definir rutas manualmente para cada ViewSet |

### Validación de contraseñas (RN-001) — Refactorizada

**Antes (violación DRY):** 3 copias idénticas de validación en `RegistroSerializer`, `NuevaPasswordSerializer` y `CambioPasswordSerializer`.

**Después (DRY):** Una única fuente de verdad:

```python
# apps/users/validators.py
def validate_password_strength(password):
    """Strategy Pattern — única fuente de verdad para RN-001."""
    ...

# apps/users/api/serializers.py — 3 consumidores
def validate_contrasena(self, value):
    return validate_password_strength(value)
```

### Validación cruzada de contraseñas

**Antes:** 3 copias de `if password != confirm: raise ValidationError(...)`.

**Después:**

```python
# apps/users/validators.py
def validate_passwords_match(password, confirmacion):
    ...

validate_passwords_match(data.get('contrasena'), data.get('confirmar_contrasena'))
```

### Tema oscuro — CSS Variables

**Antes:** Código CSS duplicado para cada selector en modo oscuro.

**Después:**

```css
/* theme.css */
[data-theme="dark"] {
  --color-bg: #1a1a2e;
  --color-text: #e0e0e0;
  --color-primary: #DC2626;
}

/* Landing.css — usa variables, sin duplicación */
.landing-hero {
  background: var(--color-bg);
  color: var(--color-text);
}
```

### ManualChunks en Vite

La configuración de `vite.config.js` usa `manualChunks` como función para evitar duplicar la lógica de agrupamiento de bundles:

```javascript
manualChunks(id) {
  if (id.includes('node_modules/react')) return 'react'
  if (id.includes('node_modules/three')) return 'three'
  if (id.includes('node_modules/bootstrap')) return 'ui'
}
```

### DRY: Mixin reutilizable para permisos de administrador

```python
class AdminPermissionMixin:
    """Mixin para vistas que solo los administradores pueden modificar"""
    permission_classes_by_action = {
        'list': [IsAuthenticated],
        'retrieve': [IsAuthenticated],
        'create': [IsAdminUser],
        'update': [IsAdminUser],
        'partial_update': [IsAdminUser],
        'destroy': [IsAdminUser],
    }

    def get_permissions(self):
        try:
            return [p() for p in self.permission_classes_by_action[self.action]]
        except KeyError:
            return [p() for p in self.permission_classes]
```

---

## Defensa en Profundidad — Seguridad

### Capas de seguridad implementadas

| Capa | Mecanismo | Archivo |
|------|-----------|---------|
| Red | CORS (lista blanca de orígenes) | `settings.py` |
| Transporte | HSTS + HTTPS forzado | `settings.py` |
| Sesión | httpOnly cookies + SameSite=Lax | `viewset.py` |
| Autenticación | JWT con token_version para invalidación | `viewset.py` |
| Autorización | Permisos por ViewSet y por acción | Por ViewSet |
| Rate Limiting | Requests/min por IP (login) | `viewset.py` |
| Contraseña | 8+ chars, mayúscula, número, especial | `validators.py` |
| Bloqueo local | ≥5 intentos fallidos → Bloqueado | `serializers.py` |
| Sesión | `cycle_key()` en login/logout | `viewset.py` |
| Hash automático | `make_password` en `Usuario.save()` | `models.py` |

### Rate Limiting + Bloqueo local (defensa en profundidad)

```
Request → Rate limit por IP (10/min)
                ↓ (si pasa)
         Verificación de credenciales
                ↓ (si falla)
         Contador de intentos fallidos
                ↓ (≥5)
         Usuario bloqueado (estado = 'Bloqueado')
```

Dos capas independientes: una protege contra fuerza bruta distribuida (rate limit por IP), la otra contra ataque local (bloqueo por usuario).

---

## Resumen

| Patrón | Tipo | Aplicación principal |
|--------|------|---------------------|
| MVC (MTV) | Arquitectónico | Estructura general Django |
| Repository | Estructural | ORM, Managers, QuerySets |
| Singleton | Creacional | `settings`, configuraciones globales |
| Observer (Signals) | Comportamental | Notificaciones, auditoría |
| Template Method | Comportamental | ViewSets, Class-Based Views |
| Factory Method | Creacional | Serializers, creación de órdenes |
| Strategy | Comportamental | Permisos, Throttling, Autenticación |
| Adapter | Estructural | WompiService, CloudinaryService |
| Active Record | Arquitectónico | Modelos Django |

## Referencias cruzadas

| Archivo | Principio(s) |
|---------|--------------|
| `backend/apps/users/validators.py` | SRP, DRY, Strategy |
| `backend/apps/users/api/serializers.py` | DRY, ISP |
| `backend/apps/users/api/viewset.py` | OCP, DIP |
| `backend/apps/users/models.py` | SRP |
| `frontend/src/services/api.js` | ISP |
| `frontend/vite.config.js` | DRY (code splitting) |
| `backend/config/urls.py` | Front Controller |
| `backend/config/settings.py` | DIP (settings module) |

> Documentación mantenida como parte de la arquitectura del proyecto. Actualizar cuando se introduzcan nuevos patrones.
