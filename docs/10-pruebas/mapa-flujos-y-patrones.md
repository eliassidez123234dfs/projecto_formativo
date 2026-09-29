# Mapa de flujos, capas y patrones

## 1. Flujo de autenticación

```text
AuthPage.jsx
  -> api.post('login/')
  -> LoginSerializer
  -> UsuarioJWTAuthentication / TokenRefresh
  -> authService.setTokens()
  -> App restaura sesión en el siguiente arranque
```

### Puntos de seguridad

- El backend decide si el usuario está activo y puede autenticarse.
- El access token se usa en `Authorization: Bearer`.
- El refresh se rota y puede entrar en blacklist.
- `ProtectedRoute` solo protege la navegación visual; la autorización real está en DRF.

## 2. Flujo de carrito

```text
ProductDetail / ProductCard
  -> sessionApi.post('cart/add/')
  -> CartViewSet.add
  -> CartAddSerializer
  -> CartItem
  -> CartContext actualiza la interfaz
```

En una petición autenticada se prioriza el carrito asociado al usuario. La cookie mantiene continuidad de sesión, pero el JWT evita perder el carrito al cambiar entre pestañas u orígenes locales.

## 3. Flujo de checkout

```text
CheckoutPage
  -> GET checkout/summary/
  -> formulario de cliente
  -> POST checkout/confirm/
  -> transaction.atomic()
       Order
       OrderItem
       stock
       Invoice
       limpieza CartItem
```

La confirmación del pedido vacía el carrito intencionalmente. Esto no es una pérdida accidental: significa que el pedido fue creado. Si el pedido debe esperar aprobación de diseño, la orden no debe confirmarse antes de esa aprobación; debe usarse el flujo `CustomDesign` previsto.

## 4. Flujo Wompi Sandbox

```text
CheckoutPage
  -> captura datos de tarjeta
  -> Wompi POST /tokens/cards
  -> recibe card token
  -> Django POST checkout/orders/<id>/pay/
  -> Wompi POST /transactions
  -> APPROVED / DECLINED / ERROR
```

El PAN, CVC y vencimiento no pasan por Django. Solo se persiste el identificador de transacción y su estado.

Tarjetas de prueba:

- `4242 4242 4242 4242`: aprobada.
- `4111 1111 1111 1111`: declinada.
- Cualquier otra tarjeta: `ERROR` en Sandbox.

## 5. Flujo editor 3D

```text
Ficha de producto
  -> save editor session
  -> token firmado de handoff
  -> pestaña Tshirt3D
  -> carga sesión mediante token
  -> captura canvas y Cloudinary
  -> commit
  -> CartItem con preview y design_data
```

### Estado funcional actual

El editor puede agregar el snapshot al carrito. El flujo de aprobación administrativa de diseños personalizados aún requiere la app `designs` y sus estados `PENDING_APPROVAL`, `APPROVED` y `REJECTED`.

## 6. Patrones utilizados realmente

| Patrón | Aplicación |
|---|---|
| MTV/MVC | Modelos Django, vistas/ViewSets y serializers DRF |
| Repository | Django ORM y QuerySets para acceso a datos |
| Serializer/DTO | Contratos JSON y validación de entrada/salida |
| Strategy | Clientes `api`, `publicApi`, `sessionApi`; permisos y autenticación intercambiables |
| Adapter | `apps/checkout/wompi.py` encapsula la API de Wompi |
| Observer | Signals de Django para limpiar Cloudinary y reaccionar a cambios |
| Singleton/Lazy client | Cliente MongoDB reutilizado por el proceso |
| Context | `CartContext` y `ThemeContext` comparten estado React |
| Error Boundary | Captura errores de renderizado en React |
| Service layer | Servicios de Mongo y helpers de integración externa |
| Unit of Work | `transaction.atomic()` para checkout y cambios críticos |

## 7. Dónde aplicar cada patrón

- Nueva integración externa: crear un adapter/service; no llamar la API externa desde componentes React sin necesidad.
- Nueva regla de dinero o stock: ponerla en backend dentro de una transacción.
- Nuevo estado global frontend: evaluar primero Context; evitar duplicar fuentes de verdad.
- Nueva consulta compleja: encapsularla en QuerySet/servicio, no repetirla en varias vistas.
- Nuevo evento posterior a guardar: evaluar signal solo si no oculta lógica crítica.

## 8. Escenarios de regresión mínimos

### Carrito

```gherkin
Dado un usuario autenticado con un artículo en su carrito
Cuando cambia la cantidad
Entonces la respuesta es 200 y el artículo conserva su carrito
```

### Checkout

```gherkin
Dado un carrito con stock disponible
Cuando confirma el checkout
Entonces se crea una orden, se descuentan existencias y se vacía el carrito
```

### Editor

```gherkin
Dado un producto aprobado con una variante disponible
Cuando se guarda la sesión del editor
Entonces el handoff firmado permite cargarla desde otra pestaña sin compartir cookie
```

### Wompi Sandbox

```gherkin
Dado una orden pendiente
Cuando se tokeniza la tarjeta 4242...4242
Entonces Wompi devuelve una transacción de prueba aprobada
```
