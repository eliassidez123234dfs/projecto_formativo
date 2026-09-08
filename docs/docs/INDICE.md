# Índice de Documentación — RED Estampación

> Guía rápida de todos los archivos de documentación del proyecto.  
> Cada entrada describe qué contiene, para qué sirve y dónde encontrarlo.

---

## 📋 Documentación Principal (Raíz)

| Archivo | Descripción |
|---------|-------------|
| **[README.md](./README.md)** | Resumen completo del proyecto: qué es, stack, arquitectura, metodología, inicio rápido. Puerta de entrada. |
| **[INDICE.md](./INDICE.md)** | Este archivo. Índice de toda la documentación. |
| **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** | Guía de instalación y configuración local paso a paso. Para nuevos desarrolladores. |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Cómo contribuir: GitFlow, estructura de ramas, commits, PRs, buenas prácticas. |
| **[AGENTS.md](./AGENTS.md)** | Contexto para agentes de IA: instrucciones de configuración. |

---

## ⚙️ Spec-Driven Development (SDD) — `.specify/`

Documentación generada con metodología SDD (Spec-Driven Development). Define la constitución del proyecto, especificación, plan y tareas.

| Archivo | Descripción |
|---------|-------------|
| **[`.specify/memory/constitution.md`](./.specify/memory/constitution.md)** | Constitución del proyecto: principios, stack, estándares de código, gobernanza. |
| **[`.specify/spec.md`](./.specify/spec.md)** | Especificación completa: RF, RNF, modelo de datos, APIs, flujos de usuario, criterios de éxito. |
| **[`.specify/plan.md`](./.specify/plan.md)** | Plan de implementación: fases, sprints, asignación de roles, riesgos, roadmap. |
| **[`.specify/tasks.md`](./.specify/tasks.md)** | Desglose de 106 tareas organizadas por user story con dependencias y prioridades. |

---

## 🔧 Documentación Técnica

| Archivo | Descripción |
|---------|-------------|
| **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** | Documentación completa de la API REST: endpoints, request/response, ejemplos, validaciones. |
| **[CONTRACTS.md](./CONTRACTS.md)** | Contratos OpenAPI (CDD) para todos los servicios: Auth, Products, Cart, Checkout, Orders, Models3D. |
| **[DESIGN_GUIDE.md](./DESIGN_GUIDE.md)** | Guía de diseño visual: paleta de colores, tipografía, componentes, responsive, principios UX. |
| **[cloudinary.md](./cloudinary.md)** | Guía de integración con Cloudinary para almacenamiento de imágenes y assets 3D. |

---

## 🧪 Estrategias de Pruebas y Calidad

| Archivo | Descripción |
|---------|-------------|
| **[TEST_STRATEGY.md](./TEST_STRATEGY.md)** | Estrategia TDD: pirámide de pruebas, frameworks, ejemplos, cobertura mínima, CI/CD. |
| **[BDD_FEATURES.md](./BDD_FEATURES.md)** | 15 escenarios Gherkin (BDD) para funcionalidades críticas: registro, catálogo, carrito, checkout, 3D, admin. |
| **[PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)** | Checklist de preparación para producción: seguridad, rendimiento, monitoreo, CI/CD, compliance. |

---

## 🗺️ Roadmap y Estrategia

| Archivo | Descripción |
|---------|-------------|
| **[ROADMAP.md](./ROADMAP.md)** | Roadmap de evolución: MVP → Microservicios → PWA, hitos trimestrales, métricas de éxito. |
| **[AI_AGENTS_STRATEGY.md](./AI_AGENTS_STRATEGY.md)** | Estrategia de uso de múltiples agentes IA con tokens gratuitos: rotación, asignación, prompts, validación. |

---

## 📁 Archivos Históricos (Originales) — `docs/archive/`

> ⚠️ **Aviso**: Estos documentos reflejan el diseño y análisis inicial del proyecto, realizado antes de comenzar la codificación. Algunos detalles pueden diferir de la implementación actual. Se mantienen como referencia histórica y para fines académicos. Para la especificación actualizada del proyecto, consultar [`.specify/spec.md`](./.specify/spec.md).

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| **[Ficha Proyecto RED.md](./Ficha%20Proyecto%20RED.md)** | Ficha técnica SENA original: problemática, objetivos, alcance, RF/RNF, cronograma. | Original |
| **[`docs/archive/SITEMAP_AND_FLOWS.md`](./docs/archive/SITEMAP_AND_FLOWS.md)** | Mapa del sitio y flujos de usuario originales (469 líneas). | Original |
| **[`docs/archive/REDESIGN_SUMMARY.md`](./docs/archive/REDESIGN_SUMMARY.md)** | Resumen del rediseño corporativo (v2.0): paleta, estructura de páginas. | Original |
| **[`docs/archive/QUICK_START.md`](./docs/archive/QUICK_START.md)** | Guía rápida de implementación del diseño corporativo (650 líneas). | Original |
| **[`docs/archive/ANALISIS_COMPLETO.md`](./docs/archive/ANALISIS_COMPLETO.md)** | Análisis completo del proyecto, user stories implementadas. | Original |
| **[`docs/archive/ENTREGA_FINAL.md`](./docs/archive/ENTREGA_FINAL.md)** | Resumen de entrega final del rediseño. | Original |
| **[`docs/archive/ERRORES_Y_CORRECCIONES.md`](./docs/archive/ERRORES_Y_CORRECCIONES.md)** | Log de errores encontrados y correcciones aplicadas. | Original |
| **[`docs/archive/ARQUITECTURA_ADMIN_PANEL.md`](./docs/archive/ARQUITECTURA_ADMIN_PANEL.md)** | Arquitectura del panel administrativo. | Original |
| **[`docs/archive/ADMIN_PANEL_RESUMEN.md`](./docs/archive/ADMIN_PANEL_RESUMEN.md)** | Resumen ejecutivo del panel admin. | Original |
| **[`docs/archive/GUIA_ADMIN_PANEL.md`](./docs/archive/GUIA_ADMIN_PANEL.md)** | Manual de uso del panel administrativo. | Original |
| **[`docs/TOOLKIT.md`](./docs/TOOLKIT.md)** | Herramientas recomendadas: IDEs, extensiones, comandos, stack. | Actual |

---

## 📊 Matriz de Requerimientos (Original)

> ⚠️ **Aviso**: La matriz de requerimientos se realizó como tarea previa al desarrollo. La implementación actual puede diferir. Los documentos SDD en `.specify/` reflejan el estado actual.

La matriz original se encuentra en formato Excel:
- **Archivo**: [`Matrix de requerimientos.xlsx`](./Matrix%20de%20requerimientos.xlsx)
- **Contenido extraído (HTML)** en [`Matrix de requerimientos.xlsx/`](./Matrix%20de%20requerimientos.xlsx/)

| Hoja | Contenido |
|------|-----------|
| **RF** | Requerimientos funcionales (31 items) |
| **RNF** | Requerimientos no funcionales |
| **Historias de Usuario** | User stories originales |
| **Casos de uso** | Ejemplos de casos de uso |
| **CASOS DE PRUEBA** | Casos de prueba |
| **Trazabilidad** | Matriz de trazabilidad |
| **ARQUITECTURA RECOMENDADA** | Arquitectura inicial propuesta |

---

## 📚 Documentación de Módulos

| Archivo | Descripción |
|---------|-------------|
| **[`backend/apps/models3d/README.md`](./backend/apps/models3d/README.md)** | Documentación del módulo Models3D: endpoints, uso, Cloudinary. |
| **[`microservices/Tshirt3D/README.md`](./microservices/Tshirt3D/README.md)** | Documentación del microservicio editor 3D: setup, flujo de diseño. |
| **[`frontend/README.md`](./frontend/README.md)** | README generado por Vite (configuración mínima). |

---

## 🔍 Cómo Navegar la Documentación

```
Nuevo en el proyecto?
  → README.md (visión general)
  → SETUP_GUIDE.md (instalación)
  → INDICE.md (este archivo)

Quieres contribuir?
  → CONTRIBUTING.md (flujo de trabajo)
  → .specify/constitution.md (estándares)
  → .specify/tasks.md (tareas disponibles)

Necesitas la API?
  → API_DOCUMENTATION.md (referencia)
  → CONTRACTS.md (contratos OpenAPI)

Quieres entender el diseño?
  → DESIGN_GUIDE.md (guía visual)
  → .specify/spec.md (especificación completa)

Quieres probar el proyecto?
  → TEST_STRATEGY.md (estrategia TDD)
  → BDD_FEATURES.md (escenarios Gherkin)

Preparando producción?
  → PRODUCTION_CHECKLIST.md (checklist)
  → ROADMAP.md (roadmap de evolución)
```
