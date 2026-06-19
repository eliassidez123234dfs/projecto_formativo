# Especificación del Proyecto: RED Estampación

**Proyecto**: RED (Redimido, Redención) Estampación  
**Versión**: 1.0.0 | **Fecha**: 2025-06-18 | **Estado**: Aprobado  
**Branch Principal**: `main` | **Develop**: `integracion-total`

---

## 1. Visión General

Plataforma web que integra un editor 3D en tiempo real (Three.js) con un marketplace de ropa personalizada. Los usuarios pueden diseñar estampados sobre prendas virtuales, visualizarlos en 3D, y comprarlos. La empresa textil asociada produce y envía las prendas.

**Problema**: 30% de devoluciones en e-commerce textil por falta de visualización realista.  
**Solución**: Editor 3D interactivo que reduce la incertidumbre de compra.

---

## 2. Arquitectura

### 2.1 Monolito Modular (MVP)
```
frontend/                 # React + Vite
  src/
    components/           # Componentes reutilizables (UI, 3D, layout)
    pages/                # Páginas (Landing, Catalog, Cart, Checkout, Dashboard, Admin)
    context/              # Estado global (CartContext, ThemeContext, AuthContext)
    services/             # Llamadas API (api.js, auth.js)
    styles/               # CSS global y de componentes
    assets/               # Imágenes, fuentes

backend/                  # Django + DRF
  apps/
    users/                # Registro, autenticación, perfiles
    products/             # CRUD productos, variantes, imágenes
    catalog/              # Catálogo, categorías, búsqueda, filtros
    carts/                # Carrito de compras
    checkout/             # Proceso de pago (Wompi)
    orders/               # Pedidos, items, estados
    models3d/             # Modelos 3D, diseños guardados
    landing/              # Página de inicio
    management/           # Comandos de gestión (seed data)
  config/                 # Settings, URLs, WSGI
  media/                  # Archivos subidos
  static/                 # Archivos estáticos

microservices/
  Tshirt3D/               # Editor 3D standalone (React + Three.js)

infra/
  docker-compose.yml      # Backend + Frontend + DB
  Dockerfile              # Backend y Frontend
```

### 2.2 Evolución a Microservicios (Futuro)
```
api-gateway/
user-service/
product-service/
order-service/
payment-service/
3d-service/
notification-service/
```

---

## 3. Requerimientos Funcionales (RF)

### Prioridad Alta (Must Have — MVP)

| ID | Descripción | Módulo |
|----|------------|--------|
| RF-01 | Visualización interactiva 3D de prendas | 3D |
| RF-02 | Aplicar diseños, colores y textos sobre prenda en tiempo real | 3D |
| RF-03 | Carrito de compras + checkout integrado con Wompi | Carrito/Checkout |
| RF-04 | Panel de administración (productos, usuarios, pedidos) | Admin |
| RF-05 | Registro de auditoría para transacciones críticas | Auditoría |
| RF-17 | Catálogo dinámico con filtros avanzados | Catálogo |
| RF-18 | Carrito con experiencia de usuario fluida | Carrito |
| RF-21 | Registro y autenticación con validación de correo | Usuarios |
| RF-22 | CRUD avanzado de productos, variantes, tallas y colores | Productos |
| RF-25 | Integrar pasarela Wompi | Checkout |
| RF-27 | Cálculo de costos de envío (Coordinadora/Servientrega) | Checkout |
| RF-31 | Panel de personalización 3D con interacción tiempo real | 3D |

### Prioridad Media (Should Have)

| ID | Descripción | Módulo |
|----|------------|--------|
| RF-08 | Múltiples opciones de pago (PayPal, Nequi, Bancolombia) | Checkout |
| RF-14 | Realidad aumentada para visualizar prenda en cuerpo | 3D |
| RF-28 | Gestión de cupones y descuentos | Checkout |
| RF-29 | Notificaciones por email/WhatsApp | Notificaciones |

### Prioridad Baja (Could Have)

| ID | Descripción | Módulo |
|----|------------|--------|
| RF-30 | Marketplace para diseñadores externos | Marketplace |
| RF-32 | Chat en vivo y centro de ayuda | Soporte |
| RF-33 | Integración con redes sociales | Social |

---

## 4. Requerimientos No Funcionales (RNF)

| ID | Descripción | Métrica |
|----|------------|---------|
| RA-01 | Rendimiento — carga inicial 3D < 3s | P75 < 3s |
| RA-02 | Usabilidad — WCAG 2.1 AA | Auditoría |
| RA-03 | Seguridad — ISO 27001 + OWASP Top 10 | Sin vulns críticas |
| RA-04 | Calidad — ISO 25010 | Cobertura tests > 80% |
| RA-05 | Disponibilidad — uptime 99.0% mensual | Monitoreo |
| RA-06 | Tiempo de respuesta API < 200ms (P95) | 200ms |
| RA-07 | Soporte navegadores > 1% cuota mercado | Cross-browser |

---

## 5. Modelo de Datos (Entidades Principales)

```
Usuario (id, email, password, nombre, teléfono, fecha_registro, is_active)
  └── Token_Verificacion (id, usuario, token, tipo, creado, expira)

Producto (id, nombre, descripción, precio_base, is_active, is_approved, checklist JSON)
  ├── Variante (id, producto, talla, color, stock)
  └── ImagenProducto (id, producto, imagen, is_main, orden)

Categoría (id, nombre, descripción, slug)
  └── ProductoCategoria (id, producto, categoria) [M:N]

Carrito (id, usuario, creado, actualizado)
  └── ItemCarrito (id, carrito, variante, cantidad)

Pedido (id, usuario, total, estado, dirección_envío, creado)
  └── ItemPedido (id, pedido, variante, cantidad, precio)

Modelo3D (id, nombre, archivo, usuario, config JSON, creado)
  └── Modelo3DImagen (id, modelo3d, imagen, orden)
```

---

## 6. APIs REST

### 6.1 Endpoints Principales

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | /api/products/ | Listar productos | No |
| POST | /api/products/ | Crear producto | Admin |
| GET/PUT/DELETE | /api/products/{id}/ | CRUD producto | Varía |
| GET | /api/catalog/ | Catálogo con filtros | No |
| GET | /api/catalog/categories/ | Categorías | No |
| GET/POST | /api/cart/ | Ver/agregar carrito | Sí |
| PUT/DELETE | /api/cart/{id}/ | Modificar/eliminar item | Sí |
| POST | /api/checkout/ | Iniciar checkout | Sí |
| GET | /api/orders/ | Listar pedidos | Sí |
| GET | /api/orders/{id}/ | Detalle pedido | Sí |
| GET/POST | /api/models3d/ | CRUD modelos 3D | Varía |
| POST | /api/auth/register/ | Registro | No |
| POST | /api/auth/login/ | Login (JWT) | No |
| POST | /api/auth/password-reset/ | Reset password | No |

### 6.2 Autenticación
- JWT (access + refresh tokens) via `djangorestframework-simplejwt`
- Validación de email obligatoria
- Roles: usuario, admin, superadmin

---

## 7. Flujos de Usuario

### 7.1 Compra (Principal)
```
Landing → Catálogo (filtros) → Detalle Producto → Editor 3D → Carrito → Checkout (Wompi) → Confirmación
```

### 7.2 Administración
```
Login Admin → Dashboard → Gestión Productos / Usuarios / Pedidos / Modelos 3D
```

### 7.3 Diseñador 3D
```
Catálogo → Seleccionar Prenda → Editor 3D → Personalizar (color, texto, imagen) → Guardar diseño → Agregar al carrito
```

---

## 8. Criterios de Éxito

- SC-001: Usuario completa compra en < 5 minutos desde que llega a la prenda
- SC-002: Editor 3D carga en < 3 segundos (P75)
- SC-003: 90% de usuarios completa registro sin errores
- SC-004: APIs responden en < 200ms (P95)
- SC-005: Cobertura de tests > 80%
- SC-006: Sin vulnerabilidades críticas en OWASP ZAP scan

---

## 9. Suposiciones

- Usuarios tienen conexión estable a internet (≥ 10 Mbps)
- Navegadores modernos con WebGL 2.0 soportado
- La empresa textil asociada provee modelos 3D base de las prendas
- El proyecto se despliega en entorno académico SENA
- Presupuesto cero — solo herramientas gratuitas y tokens limitados de IA
