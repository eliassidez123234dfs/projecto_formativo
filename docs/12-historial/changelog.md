# Changelog

Todas las versiones notables de RED Estampación se documentarán aquí.

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-beta] - 2026-06-23

### Added
- Estructura inicial del proyecto (Django 5.2 + React 19 + Vite 8)
- Modelos de datos: Usuario, Producto, Variante, Categoría, Carrito, Pedido, Modelo3D
- Autenticación JWT con registro, login, verificación de email, recuperación de password
- API REST completa con 30+ endpoints
- Catálogo de productos con búsqueda, filtros por categoría y búsquedas populares
- Carrito de compras por sesión/usuario con merge al iniciar sesión
- Integración con Wompi (pasarela de pagos colombiana)
- Integración con Cloudinary (almacenamiento de imágenes)
- Panel administrativo completo (CRUD de productos, usuarios, pedidos, carritos)
- Editor 3D básico con Three.js para visualización de productos
- Envío de emails transaccionales (verificación, recuperación password)
- Docker Compose para desarrollo
- Documentación: README, SETUP_GUIDE, CONTRIBUTING, API_DOCUMENTATION
- Diagramas PlantUML de clases, casos de uso, secuencia y despliegue
- GitFlow configurado con ramas main, integracion-total, y ramas por desarrollador
- Sistema de 4 capas de seguridad (Auth JWT, Roles, Validación, Auditoría)
- Notificaciones toast con react-hot-toast
- Diseño responsivo con Bootstrap y tema claro/oscuro

## [0.9.0-alpha] - 2026-06-10

### Added
- Configuración inicial del monorepo con Docker Compose
- Esqueleto del backend Django con estructura de apps
- Esqueleto del frontend React con Vite y TypeScript
- Modelo Usuario con autenticación básica
- Configuración de PostgreSQL y variables de entorno

### Changed
- Refactorización de la estructura de carpetas backend a apps modulares

### Security
- Implementación inicial de hashing de contraseñas con Argon2
- Validación de entrada en modelos con `full_clean()`

## [0.8.0-prealpha] - 2026-05-20

### Added
- Configuración inicial del proyecto Django y React
- Dependencias base y archivos de configuración
- Integración continua básica con GitHub Actions
- Plantillas de issues y PRs en `.github/`

### Fixed
- Corrección en configuración de CORS para desarrollo local
- Ajuste de zona horaria a America/Bogota
