# Principios SOLID y DRY en RED Estampación

> Aplicación de principios de diseño de software en el código del proyecto.
> Cada sección explica QUÉ es el principio, DÓNDE se aplica y CÓMO se implementa.

---

## Índice

- [1. SRP — Single Responsibility Principle](#1-srp--single-responsibility-principle)
- [2. OCP — Open/Closed Principle](#2-ocp--openclosed-principle)
- [3. LSP — Liskov Substitution Principle](#3-lsp--liskov-substitution-principle)
- [4. ISP — Interface Segregation Principle](#4-isp--interface-segregation-principle)
- [5. DIP — Dependency Inversion Principle](#5-dip--dependency-inversion-principle)
- [6. DRY — Don't Repeat Yourself](#6-dry--dont-repeat-yourself)
- [7. Defensa en Profundidad — Seguridad](#7-defensa-en-profundidad--seguridad)

---

## 1. SRP — Single Responsibility Principle

**Qué es:** Cada clase/módulo debe tener UNA sola razón para cambiar.

### Backend — Aplicaciones Django

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

### Ejemplo concreto — Usuario Model (`models.py:155`)

El método `save()` del modelo `Usuario` se limita a:
1. `self.full_clean()` — Validar los campos
2. `super().save()` — Persistir en BD

No maneja hasheo de contraseña (se delega a validators), ni envío de emails (se
delega a EmailService), ni creación de tokens (se delega a los serializadores).

### Mejora aplicada — Validadores extraídos (`validators.py`)

Antes: La validación de contraseña (RN-001) estaba duplicada en 3 serializadores.
Ahora: Vive en `validators.py` como `validate_password_strength()` — SRP puro.

---

## 2. OCP — Open/Closed Principle

**Qué es:** Las clases deben estar abiertas para extensión, cerradas para modificación.

### Estrategia: ViewSets genéricos + Mixins

```python
# apps/products/api/viewset.py
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    # Abierto para extensión: se pueden agregar @action sin modificar el ViewSet
```

Los ViewSets de DRF están diseñados siguiendo OCP:
- Se extienden agregando `@action` nuevos (ej: `@action(detail=True, methods=['post'])`)
- No se modifican los métodos base (`list`, `create`, `retrieve`) excepto cuando
  se necesita override explícito
- Los permisos se asignan por acción via `get_permissions()`

### Estrategia: Serializadores por contexto

```python
# apps/users/api/serializers.py
class UsuarioSerializer(serializers.ModelSerializer):      # Solo lectura
class UsuarioDetailSerializer(serializers.ModelSerializer): # Admin (más campos)
```

En lugar de modificar `UsuarioSerializer` para el admin, se crea
`UsuarioDetailSerializer` que extiende la funcionalidad.

---

## 3. LSP — Liskov Substitution Principle

**Qué es:** Las subclases deben poder sustituir a sus clases base sin alterar el comportamiento.

### Aplicación en el proyecto

```python
# Cada ViewSet hereda de ModelViewSet (DRF) y puede sustituirlo
class ProductViewSet(viewsets.ModelViewSet):  ...
class OrderViewSet(viewsets.ModelViewSet):    ...
class UsuarioViewSet(viewsets.ModelViewSet):  ...
```

Todos los ModelViewSet siguen el mismo contrato:
- `list()` → GET /api/recurso/
- `create()` → POST /api/recurso/
- `retrieve()` → GET /api/recurso/{id}/
- `update()` → PUT /api/recurso/{id}/
- `destroy()` → DELETE /api/recurso/{id}/

Cualquier ViewSet puede intercambiarse sin romper el enrutamiento del
DefaultRouter en `urls.py`.

---

## 4. ISP — Interface Segregation Principle

**Qué es:** Las interfaces deben ser específicas para cada cliente. Muchas interfaces
pequeñas > una interfaz general.

### Aplicación: Clientes HTTP en frontend

```javascript
// services/api.js
export const api = axios.create({...});          // Autenticado con JWT
const publicApi = axios.create({...});           // Sin autenticación
const sessionApi = axios.create({...});          // Cookies de sesión
```

Cada cliente HTTP expone solo los métodos que necesita:
- `api` → operaciones que requieren JWT (perfil, admin, órdenes)
- `publicApi` → consultas públicas (catálogo, productos)
- `sessionApi` → carrito anónimo + checkout

### Serializadores específicos por operación

```python
# Cada ViewSet usa el serializador adecuado para cada acción
class ProductViewSet:
    serializer_class = ProductSerializer  # Default
    # Pero get_serializer_class() retorna diferentes según la acción:
    # - list/retrieve → ProductListSerializer (resumido)
    # - create → ProductCreateSerializer (con validación extra)
    # - update → ProductUpdateSerializer (validación parcial)
```

---

## 5. DIP — Dependency Inversion Principle

**Qué es:** Depender de abstracciones, no de implementaciones concretas.

### Aplicación: Inyección de dependencias vía DRF

```python
# apps/products/api/viewset.py
class ProductViewSet(viewsets.ModelViewSet):
    serializer_class = ProductSerializer       # Abstracción
    permission_classes = [IsAuthenticatedOrReadOnly]  # Abstracción
    pagination_class = StandardResultsSetPagination   # Abstracción
```

DRF permite intercambiar serializadores, permisos, paginación y autenticación
sin modificar el ViewSet. Cada uno es una abstracción.

### Service Layer vía EmailService

```python
# apps/users/services/email_service.py
class EmailService:
    @staticmethod
    def enviar_correo(destinatario, asunto, mensaje):
        # Oculta la implementación (send_mail de Django vs Celery async)
        ...
```

Los serializadores y vistas dependen de `EmailService.enviar_correo()`, no de
los detalles de `send_mail()` o Celery.

---

## 6. DRY — Don't Repeat Yourself

**Qué es:** Cada pieza de conocimiento debe tener una representación única y
no ambigua dentro del sistema.

### Validación de contraseñas (RN-001) — Refactorizada

**Antes (violación DRY):** 3 copias idénticas de validación en:
1. `RegistroSerializer.validate_contrasena` (línea 127)
2. `NuevaPasswordSerializer.validate_contrasena` (línea 388)
3. `CambioPasswordSerializer.validate_contrasena_nueva` (línea 437)

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

# Consumidores:
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

La configuración de `vite.config.js` usa `manualChunks` como función para
evitar duplicar la lógica de agrupamiento de bundles:

```javascript
manualChunks(id) {
  if (id.includes('node_modules/react')) return 'react'
  if (id.includes('node_modules/three')) return 'three'
  if (id.includes('node_modules/bootstrap')) return 'ui'
}
```

---

## 7. Defensa en Profundidad — Seguridad

### Capas de seguridad implementadas

| Capa | Mecanismo | Archivo |
|------|-----------|---------|
| Red | CORS (lista blanca de orígenes) | `settings.py:427` |
| Transporte | HSTS + HTTPS forzado | `settings.py:451` |
| Sesión | httpOnly cookies + SameSite=Lax | `viewset.py:395-404` |
| Autenticación | JWT con token_version para invalidación | `viewset.py:379-382` |
| Autorización | Permisos por ViewSet y por acción | Por ViewSet |
| Rate Limiting | 10 requests/min por IP (login) | `viewset.py:357` |
| Contraseña | 8+ chars, mayúscula, número, especial | `validators.py` |
| Bloqueo local | ≥5 intentos fallidos → Bloqueado | `serializers.py` |
| Sesión | `cycle_key()` en login/logout | `viewset.py:376` |
| Defensa pasiva | `SECURE_BROWSER_XSS_FILTER` eliminado (Django 5.2+) | `settings.py` |
| Hash automático | `make_password` en `Usuario.save()` | `models.py:155` |

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

Dos capas independientes: una protege contra fuerza bruta distribuida
(rate limit por IP), la otra contra ataque local (bloqueo por usuario).

---

## Referencias cruzadas

| Archivo | Principio(s) | Líneas clave |
|---------|--------------|-------------|
| `backend/apps/users/validators.py` | SRP, DRY, Strategy | 1-100 |
| `backend/apps/users/api/serializers.py` | DRY, ISP | 127, 388, 437 |
| `backend/apps/users/api/viewset.py` | OCP, DIP | 351-406 |
| `backend/apps/users/models.py` | SRP | 155-157 |
| `frontend/src/services/api.js` | ISP | 69-93 |
| `frontend/vite.config.js` | DRY (code splitting) | 30-42 |
| `backend/config/urls.py` | Front Controller | 103-133 |
| `backend/config/settings.py` | DIP (settings module) | 427-465 |
