# RED Estampación — Constitution

> Proyecto: Plataforma web de personalización textil 3D  
> Versión: 1.0.0 | Ratificado: 2025-06-18 | Última enmienda: 2025-06-18

---

## I. Principios Fundamentales

### I-A. Modularidad y Separación de Dominios
Cada módulo de negocio (usuarios, productos, catálogo, carrito, checkout, órdenes, modelos 3D, landing) es una app Django independiente con sus propios modelos, APIs, serializers y pruebas. Ninguna app debe importar modelos de otra app directamente — solo a través de servicios o APIs.

### I-B. API-First
Todo el frontend se comunica con el backend exclusivamente a través de APIs REST (DRF). No se permite lógica de negocio en templates ni vista que acceda directamente a modelos desde el frontend. Las APIs deben documentarse en OpenAPI 3.0.

### I-C. TDD No Negociable
Toda funcionalidad nueva requiere:
1. Escribir test → ver que falla (RED)
2. Implementar mínimo necesario → ver que pasa (GREEN)
3. Refactorizar manteniendo tests verdes (REFACTOR)

### I-D. GitFlow Estricto
- `main` → producción (protegida, requiere PR + approval)
- `integracion-total` (develop) → integración diaria
- `feature/<nombre>` → ramas de funcionalidad desde integracion-total
- `hotfix/<nombre>` → desde main para bugs críticos
- `release/<version>` → preparación de release
- Ramas personales (jose, elias, tomas, manrique) para experimentación

### I-E. Calidad y Estándares
- ISO 9001:2015 (gestión de calidad)
- ISO/IEC 25010 (calidad de software)
- ISO 27001 (seguridad de la información)
- WCAG 2.1 AA (accesibilidad)
- OWASP Top 10 (seguridad web)
- Clean Code, SOLID, DRY, KISS, YAGNI

---

## II. Stack Tecnológico

| Capa | Tecnología | Versión Mínima |
|------|-----------|----------------|
| Backend | Django + DRF | 5.2 / 3.16 |
| Base de datos | PostgreSQL / SQLite (dev) | 14+ |
| Frontend | React + Vite | 19 / 8+ |
| 3D | Three.js / @react-three/fiber | Latest |
| Contenedores | Docker + Docker Compose | 24+ |
| Cache | Redis (futuro) | 7+ |
| Pago | Wompi (API) | — |
| CDN | Cloudinary | — |

---

## III. Estándares de Código

### Backend (Python/Django)
- Formateo: `ruff` (línea máx. 88 chars)
- Tipado: mypy strict mode en todas las funciones públicas
- Naming: `snake_case` para variables/funciones, `PascalCase` para clases, `UPPER_CASE` para constantes
- Tests: pytest con pytest-django, cobertura mínima 80%
- DRF: ViewSets + Serializers, permisos por endpoint

### Frontend (React/Vite)
- Formateo: ESLint + Prettier
- Naming: `camelCase` para variables/funciones, `PascalCase` para componentes
- Estado: React Context + hooks (futuro: Redux si escala)
- Estilos: CSS Modules + Bootstrap personalizado
- 3D: Componentes React-Three-Fiber separados en `components/3d/`

### Commits (Conventional Commits)
```
<type>(<scope>): <description>

tipos: feat, fix, refactor, test, docs, style, chore, perf
scope: back, front, 3d, infra, docs
ejemplo: feat(back): add user registration endpoint
```

---

## IV. Gobernanza

1. Esta constitución prevalece sobre cualquier otra práctica no documentada.
2. Cualquier enmienda requiere documentación, aprobación del equipo y plan de migración.
3. Todo PR debe verificar cumplimiento de linting, tipos y tests.
4. La complejidad debe justificarse — si una solución tiene más de 3 niveles de abstracción, debe defenderse.
5. Las ramas `main` e `integracion-total` están protegidas — solo merge via PR con al menos 1 approval.
6. Los secretos (claves API, contraseñas, tokens) nunca se commitean — usar `.env` y `django-environ`.
7. Cada release debe tener su `CHANGELOG` actualizado y tag semántico (`vMAYOR.MENOR.PATCH`).
