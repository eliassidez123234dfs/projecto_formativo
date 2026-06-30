# Roadmap de Evolución — RED Estampación

> MVP → Microservicios → PWA

---

## Timeline General (6 Trimestres)

```
Trim 1 (Completado)   │ Introducción, exploración de ideas
Trim 2 (Actual)       │ ████████████████░░░░░░░░░░░░░░░░  40% — Fundación + SDD
Trim 3 (2025-II)      │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  — Core (Auth, Catálogo, Carrito)
Trim 4 (2026-I)       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  — Checkout + 3D
Trim 5 (2026-II)      │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  — Admin + Calidad
Trim 6 (2026-III)     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   0%  — Final + Despliegue
```

---

## Hitos y Entregables

### Hito 1: Fundación (Trim 2 — Jun 2025)
- [x] Requerimientos definidos y matriz de trazabilidad
- [x] Ficha técnica del proyecto
- [x] Estructura Django + React inicial
- [x] Modelos de datos fundamentales
- [ ] Documentación SDD completa (constitution, spec, plan, tasks)
- [ ] GitFlow operativo + GitHub Actions
- [ ] Docker compose funcional

### Hito 2: Core Funcional (Trim 3 — Dic 2025)
- [ ] Autenticación completa (registro, login JWT, verificación email)
- [ ] CRUD de productos + variantes + imágenes (admin)
- [ ] Catálogo público con búsqueda y filtros
- [ ] Carrito de compras funcional
- [ ] Tests de API para módulos core

### Hito 3: E-commerce + 3D (Trim 4 — Jun 2026)
- [ ] Checkout con Wompi (sandbox)
- [ ] Integración Cloudinary
- [ ] Panel de administración completo
- [ ] Editor 3D básico (Three.js): visualización + colores
- [ ] Pruebas de integración carrito → checkout → pedido

### Hito 4: Maduración (Trim 5 — Sep 2026)
- [ ] Editor 3D avanzado (textos, estampados, guardar diseño)
- [ ] Notificaciones email
- [ ] Pruebas de seguridad (OWASP ZAP)
- [ ] Pruebas de accesibilidad (WCAG 2.1 AA)
- [ ] Optimización de rendimiento (Lighthouse)
- [ ] Documentación final y manual de usuario

### Hito 5: Entrega Final (Trim 6 — Oct 2026)
- [ ] Despliegue en entorno académico
- [ ] Tests de aceptación
- [ ] Sustentación del proyecto
- [ ] Documentación completa entregada

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
- Redis para caché y sesiones
- Elasticsearch para búsqueda avanzada
- Monitoreo con Prometheus + Grafana
- Logging centralizado (ELK Stack)
- Despliegue Kubernetes / Docker Swarm

---

## Métricas de Éxito por Hito

| Hito | Métrica | Objetivo |
|------|---------|----------|
| Hito 2 | Cobertura de tests backend | > 80% |
| Hito 3 | Tiempo carga editor 3D | < 3s (P75) |
| Hito 3 | Tiempo respuesta API | < 200ms (P95) |
| Hito 4 | Vulnerabilidades críticas | 0 |
| Hito 4 | Accesibilidad WCAG 2.1 AA | 100% criterios |
| Hito 5 | Uptime plataforma | > 99% |
| Hito 5 | Satisfacción usuario (pruebas) | > 80% |
