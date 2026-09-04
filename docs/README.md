# Documentacion Tecnica - Proyecto RED

> **RED (Ropa con Estampados Digitales)** - Plataforma de comercio electronico para personalizacion de prendas con estampados 3D.
>
> Proyecto Formativo - Analisis y Desarrollo de Software (ADSO) - SENA

---

## Indice General

### 1. Introduccion
- [1.1 Introduccion](01-introduccion/introduccion.md) - Descripcion del proyecto, contexto, vision, alcance y tecnologias
- [1.2 Planteamiento del Problema](01-introduccion/planteamiento-del-problema.md) - Situacion actual, problema central y pregunta problema
- [1.3 Justificacion](01-introduccion/justificacion.md) - Justificacion tecnologica, funcional y socioeconomica
- [1.4 Objetivos](01-introduccion/objetivos.md) - Objetivo general y 58 objetivos especificos (RF-001 a RF-058)

### 2. Alcance y Metodologia
- [2.1 Alcance y Limitaciones](02-alcance-y-metodologia/alcance-y-limitaciones.md) - Modulos incluidos/excluidos, limitaciones tecnicas
- [2.2 Metodologia](02-alcance-y-metodologia/metodologia.md) - SCRUM, fases del proyecto, herramientas de gestion

### 3. Requisitos
- [3.1 Requisitos Funcionales](03-requisitos/requisitos-funcionales.md) - 58 requisitos funcionales (RF-001 a RF-058) organizados por modulo
- [3.2 Requisitos No Funcionales](03-requisitos/requisitos-no-funcionales.md) - 26 requisitos no funcionales (RNF-01 a RNF-26)

### 4. Diseno UML
- [4.1 Diagrama de Casos de Uso](04-diseno-uml/diagrama-casos-de-uso.md) - Diagrama general con actores y matriz de RF
- [4.2 Diagrama de Clases](04-diseno-uml/diagrama-clases.md) - Modelo de clases completo con 18 entidades y sus relaciones
- [4.3 Diagrama de Secuencia](04-diseno-uml/diagrama-secuencia.md) - Secuencias: login con fusion de carrito, checkout, registro y verificacion
- [4.4 Diagrama de Actividades](04-diseno-uml/diagrama-actividades.md) - Actividades: agregar al carrito, publicar producto, autenticacion con bloqueo
- [4.5 Diagrama de Componentes](04-diseno-uml/diagrama-componentes.md) - Componentes del sistema y sus interacciones
- [4.6 Diagrama de Despliegue](04-diseno-uml/diagrama-despliegue.md) - Despliegue en desarrollo y produccion propuesto
- [4.7 Modelo Entidad-Relacion](04-diseno-uml/modelo-entidad-relacion.md) - DER completo con 18 tablas y sus relaciones

### 5. Arquitectura
- [5.1 Arquitectura General](05-arquitectura/arquitectura-general.md) - Patron arquitectonico, capas, patrones de diseno implementados
- [5.2 Stack Tecnologico](05-arquitectura/stack-tecnologico.md) - Tecnologias, versiones y dependencias de cada capa
- [5.3 Estructura de Carpetas](05-arquitectura/estructura-de-carpetas.md) - Organizacion del repositorio, apps Django, componentes frontend
- [5.4 Diseno Visual](05-arquitectura/diseno-visual.md) - Paleta de colores, tipografia, componentes, principios de interfaz
- [5.5 Cloudinary](05-arquitectura/cloudinary.md) - Integracion con Cloudinary para almacenamiento de imagenes y assets 3D
- [5.6 Seguridad](05-arquitectura/seguridad.md) - Defensa en 4 capas, OWASP Top 10, OWASP API Security, JWT, cabeceras HTTP

### 6. Base de Datos
- [6.1 Modelo de Datos](06-base-de-datos/modelo-de-datos.md) - Esquema general, estrategia de almacenamiento, indices y restricciones
- [6.2 Diccionario de Datos](06-base-de-datos/diccionario-de-datos.md) - Descripcion detallada de cada tabla, columna, tipo y relacion

### 7. API
- [7.1 Introduccion a la API](07-api/introduccion-api.md) - Base URL, formatos, autenticacion, codigos HTTP, paginacion, rate limiting
- [7.2 Autenticacion](07-api/autenticacion.md) - JWT, sesion, endpoints de auth, formato de tokens
- [7.3 Contratos de API](07-api/contratos.md) - Contratos de request/response entre frontend y backend
- [7.4 Endpoints de Usuarios](07-api/endpoints/usuarios.md) - Perfil, CRUD admin, auth (registro, login, recuperacion)
- [7.5 Endpoints de Productos](07-api/endpoints/productos.md) - CRUD productos, imagenes, variantes, catalogo, busqueda
- [7.6 Endpoints de Carrito](07-api/endpoints/carrito.md) - CRUD carrito, admin carritos
- [7.7 Endpoints de Checkout y Ordenes](07-api/endpoints/checkout-ordenes.md) - Resumen, confirmacion, ordenes
- [7.8 Endpoints de Administracion](07-api/endpoints/admin-stats.md) - Estadisticas, contacto, modelos 3D
- [7.9 Endpoints de Modelos 3D](07-api/endpoints/models3d.md) - Gestion de modelos 3D, subida a Cloudinary, imagenes de preview

### 8. Instalacion y Entorno de Desarrollo
- [8.1 Requisitos Previos](08-instalacion-entorno-desarrollo/requisitos-previos.md) - Software requerido, verificacion, clonacion, variables de entorno
- [8.2 Configuracion del Entorno](08-instalacion-entorno-desarrollo/configuracion-entorno.md) - Ejecucion con/sin Docker, comandos utiles, solucion de problemas, seed data
- [8.3 Toolkit](08-instalacion-entorno-desarrollo/toolkit.md) - Herramientas de desarrollo y productividad del equipo

---

### 9. Produccion
- [9.1 Checklist de Produccion](09-despliegue/checklist-produccion.md) - Seguridad, rendimiento, monitoreo, CI/CD, compliance y pre-despliegue
- [9.2 Despliegue](09-despliegue/despliegue.md) - Guia y pasos de despliegue del proyecto

### 10. Pruebas
- [10.1 Estrategia y Guia de Pruebas](10-pruebas/estrategia-y-guia-de-pruebas.md) - Pirámide de pruebas, TDD, frameworks, checkpoints por modulo y regresion
- [10.2 Escenarios BDD](10-pruebas/escenarios-bdd.md) - Escenarios Gherkin de funcionalidades criticas

### 11. Gestion de Proyecto
- [11.1 Contributing](11-gestion-proyecto/contributing.md) - Como contribuir, estilo de codigo y revisiones
- [11.2 Workflow Git](11-gestion-proyecto/workflow-git.md) - Flujo de ramas, merges y politica de commits
- [11.3 Taiga](11-gestion-proyecto/taiga-guide.md) - Gestion agil del proyecto con Taiga y sprints

### 12. Historial
- [12.1 Bitacora](12-historial/bitacora.md) - Registro cronologico de avances, decisiones y soluciones
- [12.2 Changelog](12-historial/changelog.md) - Versiones notables del proyecto
- [12.3 Roadmap](12-historial/roadmap.md) - Evolucion planificada: MVP → Microservicios → PWA

### 13. Administracion
- [13.1 Panel Admin: Estado y Pendientes](13-admin/panel-admin-estado-y-pendientes.md) - Funcionalidades existentes, faltantes y deuda tecnica del panel

### Archivados
- [Archivo de documentacion](archive/) - Documentos historicos y reportes de auditoria

---

## Resumen del Proyecto

| Aspecto | Detalle |
|---------|---------|
| **Nombre** | RED - Ropa con Estampados Digitales |
| **Tipo** | Plataforma web de comercio electronico |
| **Backend** | Python 3.12 / Django 5.2 / DRF 3.16 |
| **Frontend** | React 19 / Vite 8 / Axios |
| **Base de Datos** | SQLite (dev) / PostgreSQL (prod) |
| **App Modulos** | 8 apps Django (users, products, catalog, carts, checkout, orders, landing, models3d) |
| **Modelos** | 18 tablas en base de datos |
| **Endpoints API** | 40+ endpoints REST |
| **Paginas Frontend** | 22 paginas / 15 componentes reutilizables |
| **Autenticacion** | JWT (access 15min + refresh 7dias) + Sesion |
| **Contenedores** | Docker Compose (backend + frontend) |
| **Documentos** | 40+ archivos organizados en 13 secciones numeradas + archive |

---

*Documentacion reorganizada y unificada el 09/08/2026*
