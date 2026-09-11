# Roadmap de Evolución — RED Estampación

> MVP → Microservicios → PWA
>
> **Última actualización:** 2026-09-11 — Estado real del proyecto

---

## Timeline General (6 Trimestres)

```
Trim 1 (Completado)   │ Introducción, exploración de ideas          ✅ 100%
Trim 2 (Completado)   │ Fundación + SDD + Estructura inicial        ✅ 100%
Trim 3 (Completado)   │ Core (Auth, Catálogo, Carrito, Productos)   ✅ 100%
Trim 4 (Completado)   │ Checkout + 3D + Panel Admin                ✅ 100%
Trim 5 (Actual)       │ ████████████████████░░░░░░░░░░░░░░░░░░░░░  60% — Maduración + Calidad
Trim 6 (Pendiente)    │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0% — Final + Despliegue
```

---

## Hitos y Entregables

### Hito 1: Fundación (Trim 2 — Jun 2025) ✅ COMPLETADO
- [x] Requerimientos definidos y matriz de trazabilidad (58 RF + 26 RNF)
- [x] Ficha técnica del proyecto
- [x] Estructura Django + React inicial
- [x] Modelos de datos fundamentales
- [x] Documentación SDD completa
- [x] GitFlow operativo + GitHub Actions (CI/CD)
- [x] Docker compose funcional (4 servicios dev, 5 prod)

### Hito 2: Core Funcional (Trim 3 — Dic 2025) ✅ COMPLETADO
- [x] Autenticación completa (registro, login JWT, verificación email, recuperación password)
- [x] CRUD de productos + variantes + imágenes (admin)
- [x] Catálogo público con búsqueda, filtros, destacados, ofertas
- [x] Carrito de compras funcional (sesión anónima + merge con usuario)
- [x] Tests de API para módulos core

### Hito 3: E-commerce + 3D (Trim 4 — Jun 2026) ✅ COMPLETADO
- [x] Checkout con Wompi (sandbox + producción)
- [x] Integración Cloudinary (imágenes + modelos 3D)
- [x] Panel de administración completo (12+ páginas admin)
- [x] Modelo Invoice (facturación)
- [x] Gestor Cloudinary en admin
- [x] Monitoreo de errores del frontend
- [x] Pruebas de integración carrito → checkout → pedido

### Hito 4: Maduración (Trim 5 — Sep 2026) 🔶 EN PROGRESO
- [x] Editor 3D básico (React 18 + Three.js + Tailwind)
- [x] Sistema de temas (claro/oscuro)
- [x] Notificaciones toast (react-hot-toast)
- [x] ScrollTopButton y VariantPickerModal
- [ ] Pruebas de seguridad (OWASP ZAP)
- [ ] Pruebas de accesibilidad (WCAG 2.1 AA)
- [ ] Optimización de rendimiento (Lighthouse)
- [ ] Documentación final y manual de usuario

### Hito 5: Entrega Final (Trim 6 — Oct 2026) ⬜ PENDIENTE
- [ ] Despliegue en entorno académico
- [ ] Tests de aceptación
- [ ] Sustentación del proyecto
- [ ] Documentación completa entregada

---

## Estado Actual del Proyecto (v1.1.0)

### Funcionalidades Completadas

| Módulo | Estado | Detalle |
|--------|--------|---------|
| **Auth** | ✅ Completo | Registro, login JWT, verificación email, recuperación password, bloqueo/desbloqueo |
| **Usuarios** | ✅ Completo | CRUD admin, roles, auditoría, soft-delete, cambio de estado |
| **Productos** | ✅ Completo | CRUD, variantes (talla/color/precio), imágenes, aprobación, auditoría |
| **Catálogo** | ✅ Completo | Búsqueda avanzada, filtros, categorías, destacados, ofertas, historial |
| **Carrito** | ✅ Completo | Sesión anónima, merge session→usuario, CRUD items |
| **Checkout** | ✅ Completo | Resumen, confirmación, integración Wompi (crear transacción, webhook) |
| **Órdenes** | ✅ Completo | CRUD, ciclo de vida (pendiente→pagado→enviado→entregado), facturación |
| **Facturas** | ✅ Completo | Generación automática, número FAC-XXXXXX, PDF |
| **Landing** | ✅ Completo | Formulario de contacto con rate limiting |
| **Modelos 3D** | ✅ Completo | CRUD, Cloudinary, imágenes preview, admin Cloudinary |
| **Monitoreo** | ✅ Completo | Recepción de logs del frontend |
| **Admin Panel** | ✅ Completo | Dashboard, 12+ páginas, estadísticas, auditoría |
| **Cloudinary** | ✅ Completo | Gestor de recursos en admin, eliminación masiva |
| **Temas** | ✅ Completo | Modo claro/oscuro con persistencia |
| **Docker** | ✅ Completo | Desarrollo (4 servicios) + Producción (5 servicios + Redis) |
| **CI/CD** | ✅ Completo | GitHub Actions: lint, test, build, security (CodeQL + Trivy) |

### Estadísticas del Código

| Aspecto | Cantidad |
|---------|----------|
| Apps Django | 9 |
| Modelos / Tablas DB | 21 tablas en 8 módulos |
| Endpoints API REST | 40+ endpoints |
| Páginas Frontend | 25 páginas |
| Componentes Frontend | 22 componentes reutilizables |
| Rutas Frontend | 30+ rutas |
| Contextos React | 2 (Theme, Cart) |
| Dependencias Backend | 53 paquetes Python |
| Dependencias Frontend | 8 paquetes + 6 devDependencies |

---

## Evolución Post-MVP

### Fase 1: Microservicios (2027)
```
Estado actual:     [Frontend] ←→ [Monolito Django] ←→ [PostgreSQL]
                   
Evolución a:       [Frontend] ←→ [API Gateway]
                                    ├── [User Service]    ←→ [User DB]
                                    ├── [Product Service] ←→ [Product DB]
                                    ├── [Order Service]   ←→ [Order DB]
                                    ├── [Payment Service] ←→ [Payment DB]
                                    └── [3D Service]      ←→ [3D Assets (Cloudinary)]
```

Pasos:
1. Separar `users` como microservicio independiente
2. Separar `products` + `catalog`
3. Separar `orders` + `checkout` + `carts`
4. Separar `models3d` como microservicio 3D
5. Implementar API Gateway (Nginx / Traefik)
6. Comunicación síncrona (REST) → asíncrona (mensajería/eventos)

### Fase 2: PWA (2027-2028)
- Service Workers para caché offline
- Web App Manifest con instalación en dispositivo
- Notificaciones push
- Sincronización en segundo plano
- Estrategia: Workbox + CRA/PWA plugin

### Fase 3: Mejoras Continuas
- ~~Redis para caché y sesiones~~ ✅ Ya implementado (requirements.txt + docker-compose.prod.yml)
- Elasticsearch para búsqueda avanzada
- Monitoreo con Prometheus + Grafana
- Logging centralizado (ELK Stack)
- Despliegue Kubernetes / Docker Swarm

---

## Métricas de Éxito por Hito

| Hito | Métrica | Objetivo | Estado |
|------|---------|----------|--------|
| Hito 2 | Cobertura de tests backend | > 80% | 🔶 En progreso |
| Hito 3 | Tiempo carga editor 3D | < 3s (P75) | ✅ Cumplido |
| Hito 3 | Tiempo respuesta API | < 200ms (P95) | ✅ Cumplido |
| Hito 4 | Vulnerabilidades críticas | 0 | 🔶 Pendiente verificación |
| Hito 4 | Accesibilidad WCAG 2.1 AA | 100% criterios | ⬜ Pendiente |
| Hito 5 | Uptime plataforma | > 99% | ⬜ Pendiente |
| Hito 5 | Satisfacción usuario (pruebas) | > 80% | ⬜ Pendiente |
