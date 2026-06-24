# Patrones de Diseño - RED Estampación

> Catálogo de patrones de diseño aplicados en el proyecto, con ejemplos concretos del código base.

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
- [Principios DRY](#principios-dry)
- [Principios SOLID](#principios-solid)

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
# Model (backend/apps/products/models.py:11)
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

Django ORM actúa como un **Repository** nativo. Los `Model managers` encapsulan la lógica de consultas:

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

También se usa en la separación entre `api/` y `models/` — los serializadores y vistas nunca acceden directamente a la BD sin pasar por el ORM.

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
# Singleton de configuración (backend/red_estampacion/settings.py)
# Los settings se cargan una única vez
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
        # Hook: podemos agregar lógica antes de guardar
        serializer.save()

    # Template Method: list() usa get_queryset() y get_serializer()
    def get_queryset(self):
        qs = super().get_queryset()
        # Filtrado dinámico
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
| **Dónde se usa** | `serializers.py`, factory methods en modelos, `handle_create` |métodos en vistas |
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
        # Factory: crear OrderItems desde CartItems
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
# Strategy Pattern en permisos
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
    permission_classes = [IsAuthenticated, IsOwner]  # Strategy: permisos combinados
    throttle_classes = [UserRateThrottle]             # Strategy: throttling
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
        """Adapta la creación de transacciones de Wompi"""
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
        """Adapta la verificación de transacciones"""
        response = requests.get(
            f'{self.BASE_URL}/transactions/{transaction_id}',
            headers={'Authorization': f'Bearer {settings.WOMPI_PUBLIC_KEY}'},
        )
        return response.json()

    def process_webhook(self, payload):
        """Adapta el webhook de Wompi a eventos del dominio"""
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

    # Active Record: el objeto mismo sabe persistirse
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
```

---

## Principios DRY

| Principio | Aplicación en el proyecto |
|-----------|--------------------------|
| **Reutilización de serializers** | Serializadores base como `ProductoBaseSerializer` que extienden clases concretas |
| **Permission Mixins** | Mixins como `AdminPermissionMixin` reutilizados en múltiples ViewSets |
| **Services** | Lógica de negocio encapsulada en servicios reutilizables (e.g., `WompiService`, `CloudinaryService`) |
| **Validación centralizada** | Métodos `clean()` en modelos evitan duplicar validación en serializers y vistas |
| **URLs dinámicas** | `routers.register()` en lugar de definir rutas manualmente para cada ViewSet |

```python
# DRY: Mixin reutilizable para permisos de administrador
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
        # Evita repetir la lógica de permisos en cada ViewSet
        try:
            return [p() for p in self.permission_classes_by_action[self.action]]
        except KeyError:
            return [p() for p in self.permission_classes]
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

```python
# SOLID: Segregación de Interfaces (I)
# En lugar de un serializer monolítico:
class ProductListSerializer(serializers.ModelSerializer):
    """Solo campos para listado"""
    class Meta:
        model = Product
        fields = ['id', 'name', 'base_price', 'main_image']

class ProductDetailSerializer(serializers.ModelSerializer):
    """Todos los campos para detalle"""
    variants = VariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    checklist = serializers.JSONField(read_only=True)
    class Meta:
        model = Product
        fields = '__all__'

# SOLID: Inversión de Dependencias (D)
class ProductViewSet(viewsets.ModelViewSet):
    def get_serializer_class(self):
        # Depende de la abstracción, retorna implementación concreta
        if self.action == 'list':
            return ProductListSerializer
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductSerializer
```

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

---

> Documentación mantenida como parte de la arquitectura del proyecto. Actualizar cuando se introduzcan nuevos patrones.
