# Introduccion

## 1.1 Descripcion del Proyecto

**RED (Ropa con Estampados Digitales)** es una plataforma web de comercio electronico especializada en la venta de prendas de vestir personalizables con estampados 3D. El proyecto integra un sistema de tienda virtual completo que permite a los usuarios explorar un catalogo de productos, visualizar disenos tridimensionales, personalizar estampados, gestionar un carrito de compras y realizar pedidos.

La plataforma esta disenada bajo una arquitectura de microservicios y API REST, separando claramente el frontend de presentacion (React) del backend de logica de negocio (Django REST Framework), con un microservicio independiente para la visualizacion 3D y la personalizacion de estampados.

## 1.2 Contexto del Proyecto

Este proyecto se desarrolla en el marco de un proyecto formativo del programa **Analisis y Desarrollo de Software (ADSO)** del **SENA**. Su proposito es integrar los conocimientos adquiridos en:

- Desarrollo backend con Python y Django
- Desarrollo frontend con React
- Diseno de bases de datos relacionales
- Arquitectura de software y patrones de diseno
- Integracion de servicios cloud (Cloudinary)
- Contenedorizacion con Docker
- Control de versiones con Git
- Documentacion tecnica de software

## 1.3 Vision del Producto

Ser una plataforma lider en personalizacion de prendas con estampados digitales, ofreciendo una experiencia de usuario fluida que combine la visualizacion 3D en tiempo real con un proceso de compra intuitivo y seguro.

## 1.4 Alcance del Sistema

El sistema abarca los siguientes modulos funcionales:

| Modulo | Descripcion |
|--------|-------------|
| Autenticacion | Registro, inicio de sesion, recuperacion de contrasena, verificacion de email |
| Gestion de Usuarios | Perfil de usuario, roles (Administrador/Usuario), bloqueo y auditoria |
| Catalogo de Productos | Visualizacion publica, busqueda, filtros por categoria/talla/color/precio |
| Administracion de Productos | CRUD completo con imagenes, variantes, publicacion condicional |
| Carrito de Compras | Carrito persistente por sesion, fusion al iniciar sesion |
| Modelos 3D | Visualizacion y personalizacion de estampados 3D (microservicio independiente) |
| Checkout y Ordenes | Proceso de compra, confirmacion de orden, gestion de stock |
| Formulario de Contacto | Mensajes de contacto con notificacion al administrador |
| Panel de Administracion | Dashboard con estadisticas, gestion de usuarios, productos, carritos y auditoria |

## 1.5 Tecnologias Utilizadas

| Componente | Tecnologia | Version |
|------------|-----------|---------|
| Backend | Python / Django / DRF | 3.12 / 5.2 / 3.16 |
| Frontend | React / Vite | 19 / 8 |
| Base de Datos | SQLite (desarrollo) / PostgreSQL (produccion) | - |
| Autenticacion | JWT (SimpleJWT) + Sesiones | - |
| Contenedores | Docker / Docker Compose | - |
| Almacenamiento Cloud | Cloudinary | - |
| Editor 3D | React + Three.js (microservicio independiente) | - |
