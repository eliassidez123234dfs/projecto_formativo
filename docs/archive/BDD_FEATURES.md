# Escenarios BDD (Gherkin) — RED Estampación

> Behavior-Driven Development: escenarios Gherkin para funcionalidades críticas

---

## Feature: Registro de Usuario

```gherkin
Feature: Registro de Usuario
  Como visitante de la plataforma
  Quiero registrarme con mi correo electrónico
  Para poder personalizar y comprar prendas

  Scenario: Registro exitoso
    Given un visitante en la página de registro
    When ingresa email "usuario@ejemplo.com"
    And ingresa contraseña "Segura123!"
    And ingresa nombre "Juan Pérez"
    And hace clic en "Crear cuenta"
    Then se crea su cuenta exitosamente
    And recibe un email de verificación
    And ve un mensaje "Verifica tu correo para continuar"

  Scenario: Email duplicado
    Given un visitante en la página de registro
    When ingresa email "existente@ejemplo.com"
    And completa los demás campos
    Then ve el error "Este correo ya está registrado"

  Scenario: Contraseña débil
    Given un visitante en la página de registro
    When ingresa contraseña "123"
    Then ve el error "La contraseña debe tener al menos 8 caracteres"
    And el botón de registro permanece deshabilitado

  Scenario: Verificación de email
    Given un usuario recién registrado con email no verificado
    When hace clic en el enlace de verificación enviado a su email
    Then su email queda verificado
    And ve un mensaje "Email verificado exitosamente"
```

---

## Feature: Catálogo y Búsqueda

```gherkin
Feature: Catálogo y Búsqueda de Productos
  Como visitante o usuario registrado
  Quiero explorar el catálogo y buscar productos
  Para encontrar prendas que me interesen

  Scenario: Ver catálogo completo
    Given un visitante en la página principal
    When hace clic en "Catálogo"
    Then ve una cuadrícula de productos disponibles
    And cada producto muestra imagen, nombre y precio

  Scenario: Filtrar por categoría
    Given un visitante en el catálogo
    When selecciona la categoría "Camisetas"
    Then solo ve productos de la categoría "Camisetas"
    And el filtro activo se muestra resaltado

  Scenario: Buscar producto por nombre
    Given un visitante en el catálogo
    When escribe "camiseta básica" en el buscador
    Then ve resultados que contienen "camiseta básica"
    And el término de búsqueda aparece en el campo de búsqueda

  Scenario: Filtrar por rango de precio
    Given un visitante en el catálogo
    When establece precio mínimo "10000" y máximo "50000"
    Then solo ve productos con precio entre $10.000 y $50.000

  Scenario: Sin resultados
    Given un visitante en el catálogo
    When busca "producto_inexistente_xyz"
    Then ve el mensaje "No se encontraron productos"
    And ve sugerencias para ampliar la búsqueda
```

---

## Feature: Carrito de Compras

```gherkin
Feature: Carrito de Compras
  Como usuario registrado
  Quiero gestionar mi carrito de compras
  Para comprar las prendas que seleccioné

  Scenario: Agregar producto al carrito
    Given un usuario autenticado en la página de detalle de producto
    When selecciona talla "M" y color "Blanco"
    And hace clic en "Agregar al carrito"
    Then el producto se agrega a su carrito
    And ve un contador actualizado en el ícono del carrito
    And ve un toast de confirmación

  Scenario: Ver carrito con items
    Given un usuario autenticado con productos en su carrito
    When abre la página del carrito
    Then ve la lista de productos agregados
    And cada producto muestra: nombre, variante, cantidad, precio unitario, subtotal
    And ve el total general del carrito

  Scenario: Modificar cantidad
    Given un usuario con un item en el carrito (cantidad: 1)
    When aumenta la cantidad a 3
    Then el subtotal del item se actualiza (precio × 3)
    And el total general se actualiza

  Scenario: Eliminar item del carrito
    Given un usuario con un item en el carrito
    When hace clic en "Eliminar" del item
    Then el item desaparece del carrito
    And el total se recalcula
    And ve un toast "Producto eliminado del carrito"

  Scenario: Carrito vacío
    Given un usuario autenticado sin items en el carrito
    When abre la página del carrito
    Then ve el mensaje "Tu carrito está vacío"
    And ve un botón "Ir al catálogo"
```

---

## Feature: Checkout y Pago

```gherkin
Feature: Checkout y Pago con Wompi
  Como usuario registrado con productos en el carrito
  Quiero completar mi compra de forma segura
  Para recibir mis prendas personalizadas

  Scenario: Checkout exitoso
    Given un usuario autenticado con items en el carrito
    When procede al checkout
    And ingresa dirección de envío "Calle 123 #45-67"
    And ingresa ciudad "Medellín"
    And ingresa teléfono "3001234567"
    And hace clic en "Pagar"
    Then es redirigido a la pasarela de pago Wompi
    And el pedido se crea con estado "pending"

  Scenario: Pago exitoso (webhook)
    Given un pedido en estado "pending"
    When Wompi notifica pago exitoso vía webhook
    Then el estado del pedido cambia a "paid"
    And se envía email de confirmación al usuario
    And el stock de productos se descuenta

  Scenario: Checkout con carrito vacío
    Given un usuario autenticado sin items en el carrito
    When intenta acceder al checkout
    Then es redirigido al carrito
    And ve el mensaje "Agrega productos al carrito primero"

  Scenario: Calcular costo de envío
    Given un usuario en checkout
    When ingresa ciudad "Bogotá"
    Then el sistema calcula y muestra el costo de envío
    And el total incluye productos + envío
```

---

## Feature: Editor 3D

```gherkin
Feature: Editor 3D de Prendas
  Como usuario interesado en personalizar
  Quiero usar el editor 3D para diseñar mi estampado
  Para visualizar cómo quedará antes de comprar

  Scenario: Visualizar prenda en 3D
    Given un usuario en la página de detalle de producto
    When hace clic en "Personalizar en 3D"
    Then ve un modelo 3D interactivo de la prenda
    And puede rotar la prenda con el mouse
    And puede hacer zoom para ver detalles

  Scenario: Cambiar color de prenda
    Given un usuario en el editor 3D
    When selecciona el color "Rojo" del selector
    Then la prenda 3D cambia al color rojo en tiempo real

  Scenario: Agregar texto a la prenda
    Given un usuario en el editor 3D
    When ingresa el texto "RED Estampación"
    And selecciona posición "Frente"
    Then el texto aparece renderizado sobre la prenda en 3D
    And puede ajustar tamaño y fuente

  Scenario: Guardar diseño
    Given un usuario autenticado en el editor 3D
    When personaliza la prenda a su gusto
    And hace clic en "Guardar diseño"
    Then el diseño se guarda en su perfil
    And puede agregarlo al carrito desde sus diseños guardados
```

---

## Feature: Panel Administrativo

```gherkin
Feature: Panel de Administración
  Como administrador del sistema
  Quiero gestionar productos, usuarios y pedidos
  Para mantener la plataforma actualizada

  Scenario: Crear producto desde admin
    Given un administrador autenticado en el panel
    When navega a "Productos" → "Crear producto"
    And ingresa nombre "Camiseta Premium", precio "$29.99"
    And sube una imagen principal
    And agrega variantes (talla S, M, L; color Blanco, Negro)
    And hace clic en "Guardar"
    Then el producto se crea con estado "inactivo"
    And aparece en la lista de productos

  Scenario: Gestionar pedidos
    Given un administrador en la sección de pedidos
    When ve un pedido en estado "paid"
    And cambia el estado a "shipped"
    And agrega número de guía "CO123456789"
    Then el estado del pedido se actualiza
    And se notifica al usuario del cambio de estado

  Scenario: Ver dashboard con métricas
    Given un administrador en el dashboard
    Then ve tarjetas con: total productos, total usuarios, total pedidos
    And ve gráfico de ventas del mes
    And ve lista de últimos pedidos
```
