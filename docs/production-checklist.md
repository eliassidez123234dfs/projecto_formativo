# Production Readiness Checklist — RED Estampación

> Preparación del proyecto para etapa productiva

---

## 1. Seguridad

### Autenticación y Autorización
- [ ] JWT tokens con expiración corta (access: 15min, refresh: 7d)
- [ ] Refresh token rotation + blacklist
- [ ] Rate limiting en endpoints de auth (django-ratelimit)
- [ ] Validación de email obligatoria
- [ ] Password strength enforcement (mín. 8 chars, mayúscula, número, especial)
- [ ] 2FA (opcional, futuro)

### Protección de Datos
- [ ] Variables sensibles en .env (nunca en código)
- [ ] CORS configurado solo para orígenes permitidos
- [ ] HTTPS obligatorio (certbot/Let's Encrypt)
- [ ] CSRF protection activa
- [ ] SQL injection prevention (ORM, parametrized queries)
- [ ] XSS prevention (sanitize inputs, Content Security Policy)
- [ ] HSTS header configurado

### API Security
- [ ] OWASP Top 10 auditado (ZAP / Burp Suite)
- [ ] API rate limiting por usuario/IP
- [ ] Request size limits
- [ ] Input validation en todos los endpoints
- [ ] Secure headers (X-Frame-Options, X-Content-Type-Options, etc.)

### Secret Management
- [ ] django-environ para variables de entorno
- [ ] .gitignore incluye .env, *.key, *.pem
- [ ] ggshield (o similar) para prevenir commits de secretos
- [ ] Rotación periódica de claves API

---

## 2. Base de Datos

- [ ] PostgreSQL en producción (no SQLite)
- [ ] Migraciones automatizadas en CI/CD
- [ ] Backup automático diario + retención 30 días
- [ ] Connection pooling (PgBouncer o similar)
- [ ] Índices en columnas de búsqueda frecuente (name, email, status)
- [ ] Migrations lint (django-check-migrations)
- [ ] Sin `DROP TABLE` en migraciones automáticas

---

## 3. Rendimiento

### Backend
- [ ] Consultas N+1 identificadas y corregidas (`select_related`, `prefetch_related`)
- [ ] Caché implementada (Redis para sesiones, consultas frecuentes)
- [ ] Lazy loading de relaciones
- [ ] Paginación en todos los endpoints de listado
- [ ] Compresión Gzip/Brotli en respuestas API
- [ ] Database query optimization (EXPLAIN ANALYZE)
- [ ] Tiempo de respuesta API < 200ms (P95)
- [ ] Editor 3D carga en < 3s (P75)

### Frontend
- [ ] Lazy loading de rutas (React.lazy + Suspense)
- [ ] Code splitting por página
- [ ] Imágenes optimizadas (WebP, lazy loading, tamaños responsivos)
- [ ] Cloudinary transformations (f_auto, q_auto, w_*)
- [ ] Bundle size < 250KB (gzip)
- [ ] Lighthouse score > 90 en todas las categorías
- [ ] Core Web Vitals: LCP < 2.5s, FID < 100ms, CLS < 0.1

---

## 4. Monitoreo y Logging

- [ ] Logging estructurado (JSON format)
- [ ] Niveles de log: DEBUG (dev), INFO (prod), ERROR (alertas)
- [ ] No loggear datos sensibles (passwords, tokens, emails completos)
- [ ] Monitoreo de errores (Sentry / Rollbar — versión gratuita)
- [ ] Health check endpoint: GET /api/health/
- [ ] Métricas de rendimiento (Prometheus + Grafana — futuro)
- [ ] Alertas de uptime (UptimeRobot — plan gratuito)

---

## 5. CI/CD

- [ ] GitHub Actions: lint + typecheck + tests en cada PR
- [ ] GitHub Actions: deploy automático a staging (opcional)
- [ ] GitHub Actions: security scan (trivy, safety)
- [ ] Pruebas en PRs antes de mergear a integracion-total
- [ ] Release tags semánticos (v1.0.0, v1.1.0, etc.)
- [ ] CHANGELOG.md actualizado por release

---

## 6. Docker y Despliegue

- [ ] Dockerfile multi-stage para backend (build → runtime)
- [ ] Dockerfile multi-stage para frontend (build → nginx)
- [ ] docker-compose.yml para desarrollo
- [ ] docker-compose.prod.yml para producción
- [ ] .dockerignore configurado (excluir node_modules, __pycache__, .git)
- [ ] Health checks en servicios
- [ ] Volúmenes para datos persistentes (PostgreSQL, media)
- [ ] Variables de entorno por ambiente (.env.dev, .env.prod)
- [ ] Sin puertos expuestos innecesarios

### Despliegue Recomendado
```
Opción 1: VPS (DigitalOcean / Linode / AWS EC2)
Opción 2: Railway / Render (más simple, plan gratuito)
Opción 3: Entorno académico SENA (servidor local)
```

---

## 7. Accesibilidad (WCAG 2.1 AA)

- [ ] Contraste de color suficiente (ratio ≥ 4.5:1 texto normal)
- [ ] Navegación por teclado (Tab, Enter, Escape)
- [ ] ARIA labels en componentes interactivos
- [ ] Alt text en todas las imágenes
- [ ] Tamaño de fuente ajustable (unidades relativas rem/em)
- [ ] Formularios con labels asociados
- [ ] Mensajes de error claros y visibles
- [ ] Skip to content link
- [ ] Auditoría con axe DevTools / WAVE

---

## 8. Cumplimiento Normativo

- [ ] ISO 9001:2015 — Sistema de gestión de calidad
- [ ] ISO/IEC 25010 — Calidad de producto de software
- [ ] ISO 27001 — Seguridad de la información
- [ ] WCAG 2.1 AA — Accesibilidad web
- [ ] OWASP Top 10 — Seguridad en aplicaciones web
- [ ] PCI DSS — Seguridad en pagos con tarjeta (si aplica)
- [ ] Ley de protección de datos (Colombia: Ley 1581 de 2012)

---

## 9. Documentación

- [ ] README.md completo (descripción, stack, setup, arquitectura)
- [ ] API_DOCUMENTATION.md actualizada y completa
- [ ] Documentación de instalación funcional (`/docs/08-instalacion-entorno-desarrollo/`)
- [ ] CONTRIBUTING.md con guía de contribución
- [ ] Guía de diseño visual actualizada (`/docs/05-arquitectura/diseno-visual.md`)
- [ ] CONTRACTS.md (contratos OpenAPI) actualizado
- [ ] Manual de usuario para administradores
- [ ] CHANGELOG.md por release

---

## 10. Checklist Pre-Despliegue

- [ ] Todos los tests pasan (backend + frontend)
- [ ] Cobertura de tests ≥ 80%
- [ ] Lint + typecheck pasan sin errores
- [ ] Sin vulnerabilidades críticas (OWASP ZAP)
- [ ] Variables de entorno configuradas en producción
- [ ] Base de datos migrada y seed data cargada
- [ ] Logging configurado correctamente
- [ ] Backup automático configurado
- [ ] HTTPS configurado
- [ ] CORS configurado para dominio productivo
- [ ] Rate limiting activo
- [ ] Health check endpoint responde OK
- [ ] Docker images construidas y pusheadas
- [ ] DNS configurado (si aplica)
- [ ] Equipo capacitado para administrar
