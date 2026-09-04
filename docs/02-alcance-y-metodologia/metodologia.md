# Metodologia

## 6.1 Metodologia de Desarrollo

El proyecto se desarrollo bajo la metodologia **SCRUM**, adaptada al contexto de un proyecto formativo SENA/ADSO. Esta metodologia agil permitio organizar el trabajo en ciclos iterativos (sprints) con entregas incrementales de funcionalidad.

### Roles del Equipo

| Rol | Responsabilidad |
|-----|----------------|
| Product Owner | Definir prioridades del backlog, validar entregables |
| Scrum Master | Facilitar ceremonias, eliminar impedimentos |
| Equipo de Desarrollo | Implementar las historias de usuario de cada sprint |

### Ceremonias Implementadas

| Ceremonia | Frecuencia | Proposito |
|-----------|-----------|-----------|
| Sprint Planning | Al inicio de cada sprint | Definir objetivos y compromisos del sprint |
| Daily Standup | Diaria (15 min) | Sincronizar avances y bloquear impedimentos |
| Sprint Review | Al final de cada sprint | Demostrar funcionalidades completadas |
| Sprint Retrospective | Al final de cada sprint | Identificar mejoras para el siguiente ciclo |

### Artefactos Generados

- **Product Backlog**: Lista priorizada de historias de usuario y requisitos
- **Sprint Backlog**: Historias seleccionadas para el sprint actual
- **Incremento**: Funcionalidad completada y lista para revision al final de cada sprint

## 6.2 Fases del Proyecto

### Fase 1: Analisis y Diseno
- Levantamiento de requisitos funcionales y no funcionales
- Diseno de la arquitectura del sistema
- Modelado de la base de datos (diagrama entidad-relacion)
- Diseno de la API REST
- Creacion de prototipos de interfaz

### Fase 2: Configuracion del Entorno
- Configuracion del proyecto Django con Django REST Framework
- Configuracion del proyecto React con Vite
- Configuracion de Docker Compose
- Integracion con Cloudinary
- Configuracion del sistema de autenticacion JWT

### Fase 3: Implementacion del Backend
- Creacion de modelos y migraciones
- Implementacion de serializers y viewsets
- Registro de rutas de API
- Implementacion de la logica de negocio
- Implementacion de autenticacion y autorizacion
- Implementacion de validaciones y reglas de negocio

### Fase 4: Implementacion del Frontend
- Creacion de componentes y paginas React
- Implementacion del sistema de rutas
- Consumo de la API con Axios
- Implementacion de contexts (Theme, Cart)
- Diseno responsivo con tema claro/oscuro

### Fase 5: Integracion y Pruebas
- Integracion backend-frontend
- Pruebas unitarias de modelos
- Pruebas de integracion de API
- Correccion de errores

### Fase 6: Documentacion y Despliegue
- Documentacion tecnica del sistema
- Documentacion de la API
- Guia de instalacion y configuracion
- Preparacion del entorno de produccion

## 6.3 Herramientas de Gestion

| Herramienta | Uso |
|------------|-----|
| Git + GitHub | Control de versiones y repositorio remoto |
| Docker Compose | Orquestacion de contenedores para desarrollo |
| Visual Studio Code | Entorno de desarrollo integrado |
| Django Admin | Panel de administracion de prueba |
| ESLint | Analisis estatico de codigo frontend |

## 6.4 Ciclo de Vida del Desarrollo

El proyecto sigue el modelo **Iterativo-Incremental**, donde cada sprint produce un incremento de software funcional que agrega valor al producto final. La siguiente secuencia de sprints fue ejecutada:

1. **Sprint 1**: Configuracion del proyecto, modelos de datos, autenticacion basica
2. **Sprint 2**: CRUD de usuarios y productos, serializers
3. **Sprint 3**: Catalogo publico, busqueda y filtros
4. **Sprint 4**: Carrito de compras y checkout
5. **Sprint 5**: Panel de administracion, estadisticas y auditoria
6. **Sprint 6**: Modelos 3D, formulario de contacto, mejoras de seguridad
7. **Sprint 7**: Frontend completo, integracion y pruebas
8. **Sprint 8**: Documentacion y ajustes finales
