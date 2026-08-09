# Taiga — Guía del Proyecto RED Estampación

## ¿Qué es Taiga?

Taiga es una plataforma de gestión de proyectos ágil (Agile Project Management) de código abierto. Permite gestionar proyectos con metodologías Scrum y Kanban, incluyendo backlog, sprints, tableros Kanban, issues, wiki y más.

## Importar la plantilla `taiga.json`

El archivo `taiga.json` en la raíz del proyecto contiene la configuración completa del proyecto RED Estampación: user stories, roles y miembros.

### Pasos para importar

1. Ve a https://tree.taiga.io
2. Crea una cuenta o inicia sesión con GitHub
3. Haz clic en **"Create Project"** → selecciona **"Import from JSON"**
4. Sube el archivo `taiga.json` de este repositorio
5. Confirma la importación

## Cómo usar el tablero

### Backlog
- Vista principal del proyecto con la lista completa de user stories
- Permite priorizar y estimar historias
- Arrastra historias del backlog al sprint para planificar

### Kanban
- Tablero visual con columnas: **To Do**, **In Progress**, **Done**
- Arrastra tareas entre columnas para actualizar estado
- Ideal para el desarrollo día a día

### Sprint Planning
- Arrastra user stories del backlog al sprint activo
- Asigna puntos de historia y responsable
- Crea tareas dentro de cada user story

## User Stories, Tareas e Issues

- **User Stories**: Funcionalidades desde la perspectiva del usuario (ej: "Como usuario quiero...")
- **Tasks**: Sub-tareas técnicas que descomponen una user story
- **Issues**: Bugs, errores o mejoras puntuales

## Planificación de Sprints (4 sprints de 2 semanas)

| Sprint | Duración | Enfoque |
|--------|----------|---------|
| **Sprint 1** | Semana 1-2 | Auth + Landing + Catálogo |
| **Sprint 2** | Semana 3-4 | Carrito + Checkout + Wompi |
| **Sprint 3** | Semana 5-6 | Admin Panel + 3D Editor |
| **Sprint 4** | Semana 7-8 | Testing + Documentación + Despliegue |
