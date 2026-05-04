# Proyecto Formativo – Arquitectura Fullstack
## Descripción

Este proyecto es una aplicación fullstack compuesta por:

**Backend**: Django + Django REST Framework (API)
**Frontend**: React + Vite + Three.js (interfaz y visualización 3D)

El objetivo es construir una arquitectura escalable para manejar usuarios, archivos (como modelos 3D) y lógica de negocio mediante APIs.

# E-commerce Camisas 3D

Este proyecto es un sistema de e-commerce modular construido con Django + DRF y frontend separado en React (Vite). El objetivo es vender camisas 3D personalizables, con posible integración a microservicios para generación/renderizado 3D.

---

# Arquitectura general

El backend está estructurado como un **monolito modular**, donde cada app representa un dominio del negocio.

---

# Apps del sistema

## users
Encargado de autenticación y gestión de usuarios.

- registro / login
- perfil de usuario
- autenticación (JWT o sesión)

---

## products
Define los productos base del sistema (camisas 3D).

- nombre
- precio
- stock
- imágenes / assets

Es la fuente principal de datos del catálogo.

---

## catalog
Capa de consulta y organización de productos.

- filtros
- búsqueda
- categorías
- ordenamiento

No almacena datos nuevos, solo organiza los productos.

---

## carts
Carrito de compras temporal del usuario.

- agregar productos
- actualizar cantidades
- eliminar items

Estado mutable antes de la compra.

---

## checkout
Módulo de proceso de compra.

Responsabilidades:

- validar carrito
- calcular totales
- aplicar descuentos
- verificar stock
- crear orden

Es un módulo de orquestación, no de almacenamiento.

---

## orders
Historial de compras confirmadas.

- estado del pedido
- items congelados
- fecha de compra

Estados posibles:
- pending
- paid
- shipped
- cancelled

Representa la compra final del usuario.

---

## landing
Página pública del sistema.

- marketing
- presentación del producto
- entrada al catálogo

---

# Flujo del sistema

1. Usuario entra a landing
2. Explora catálogo
3. Ve productos
4. Agrega al carrito
5. Checkout procesa la compra
6. Se crea una orden
7. Se confirma el pedido

---

# Microservicios (externo)

El sistema 3D de camisas puede estar desacoplado como microservicio:

- generación de modelos 3D
- renderizado
- personalización avanzada

Este módulo no pertenece directamente al core de e-commerce.

---

# Nota de arquitectura

- products = datos base
- catalog = consulta y visualización
- cart = estado temporal
- checkout = proceso
- orders = resultado final