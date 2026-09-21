# Guía de Corrección de Problemas — Sesión 11-09-2026

## Resumen de Cambios

Esta sesión corrigió tres problemas críticos reportados por el usuario:

### 1. ❌ Descarga de Facturas PDF → 403 Forbidden

**Problema:** Cuando los usuarios intentaban descargar la factura PDF después del checkout, recibían error `403 Forbidden`.

**Causa Raíz:** La función `downloadInvoicePdf()` estaba usando `publicApi` (sin autenticación) en lugar de `api` (con JWT). El backend requería autenticación JWT para usuarios logueados.

**Solución Implementada:**
```javascript
// Ahora intenta primero con JWT autenticado
export const downloadInvoicePdf = async (orderId, accessToken = '') => {
  const token = getAccessToken();
  if (token) {
    try {
      const response = await api.get(`checkout/orders/${orderId}/invoice-pdf/`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      if (error.response?.status !== 403) throw error;
    }
  }
  
  // Fallback a token temporal para usuarios anónimos
  const params = accessToken ? { access: accessToken } : undefined;
  const response = await publicApi.get(`checkout/orders/${orderId}/invoice-pdf/`, {
    params,
    responseType: 'blob',
  });
  return response.data;
};
```

**Cómo Probar:**
```bash
# 1. Completar checkout con diseño personalizado
# 2. Después de confirmar orden, hacer clic en "Descargar Factura Personalizada (PDF)"
# ✅ Debería descargar sin error 403

# O desde terminal (con JWT válido):
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/checkout/orders/1/invoice-pdf/
```

---

### 2. ❌ Órdenes Aprobadas Siguen Mostrando "En Validación de Estampación"

**Problema:** En AdminOrders, al hacer clic en "Aprobar Diseño", la orden pasaba a estado "Aprobado". Pero cuando el cliente miraba sus órdenes en UserOrders, seguía viendo "En Validación de Estampación".

**Causa Raíz:** El archivo `UserOrders.jsx` tenía mapeos de estados obsoletos (pendiente, produccion) en lugar de los nuevos estados (pendiente_validacion, aprobado).

**Solución Implementada:**

1. **Actualizar STATUS_CONFIG en UserOrders.jsx** con nuevos estados:
```javascript
const ORDER_STATUS_CONFIG = {
  pendiente_validacion: {
    label: 'Pendiente de Validación',
    badgeClass: 'status-pending',
    icon: '⏳',
    desc: 'Tu pedido está siendo revisado por nuestro equipo...',
  },
  aprobado: {
    label: 'Aprobado - Listo para Pago',
    badgeClass: 'status-approved',
    icon: '✓',
    desc: '¡Tu diseño fue aprobado! Procede a pagarlo...',
  },
  // ... más estados
}
```

2. **Agregar auto-refresh cada 30 segundos** cuando hay órdenes pendientes:
```javascript
useEffect(() => {
  const hasPendingValidation = orders.some(o => o.status === 'pendiente_validacion')
  if (!hasPendingValidation) return

  const intervalId = setInterval(async () => {
    const data = await fetchMyOrders()
    setOrders(Array.isArray(data) ? data : [])
  }, 30000) // Cada 30 segundos

  return () => clearInterval(intervalId)
}, [orders])
```

**Cómo Probar:**
```
# Flujo completo:
1. Cliente: Crear orden → Confirmar checkout → Ve "Pendiente de Validación" ✅
2. Admin: AdminOrders → Aprobar Diseño → Confirma cambio ✅
3. Cliente: Espera máximo 30 segundos
4. Cliente: UserOrders se auto-refresca → Status cambia a "Aprobado - Listo para Pago" ✅
```

---

### 3. ❌ Formulario "Crear Nuevo Usuario" No Tiene Scroll

**Problema:** El formulario de crear usuario en el panel admin era muy grande y no se podía hacer scroll para ver todos los campos. Necesitaba bajar zoom al 80% para verlo completo.

**Causa Raíz:** El CSS del modal no tenía estructura flexbox apropiada para permitir scroll interno del contenido.

**Solución Implementada:**

Modificar `form-modal.css`:
```css
.form-modal {
  display: flex;
  flex-direction: column;  /* Estructura vertical */
}

.form-modal-header {
  flex-shrink: 0;  /* No se comprime */
  /* ... */
}

.form-modal-body {
  flex: 1;  /* Toma espacio disponible */
  overflow-y: auto;  /* Permite scroll vertical */
  min-height: 0;  /* Necesario para flex overflow */
}

.form-modal-footer {
  flex-shrink: 0;  /* No se comprime */
  /* ... */
}
```

**Cómo Probar:**
```
# 1. Admin Panel → Users → "+ Nuevo Usuario"
# 2. Se abre modal "Crear Nuevo Usuario"
# 3. Si el contenido es mayor que 90vh:
#    - Aparece barra de scroll en el lado derecho del modal
#    - Puedes scroll para ver todos los campos sin bajar zoom
# ✅ Debería funcionar correctamente a zoom 100%
```

---

## Cambios Adicionales Implementados

### ✅ Mejorar Django Admin para órdenes

**Archivo:** `backend/apps/orders/admin.py`

Se mejoró la interfaz de Django Admin con:
- **list_display:** Ahora muestra `admin_approved_by` y `admin_approved_at`
- **Fieldsets organizados:**
  - Información Básica
  - Dirección de Envío (collapsible)
  - Aprobación del Admin (collapsible) ← **NUEVO**
  - Diseño Personalizado (collapsible)
  - Pago (collapsible)
  - Auditoría (collapsible)
- **Readonly fields:** `admin_approved_at`, `admin_approved_by`, `order_number`, etc.
- **Búsqueda mejorada:** Ahora busca por `order_number`

**Cómo Usar:**
```bash
# Acceder al Django Admin:
python manage.py runserver
# Ir a: http://127.0.0.1:8000/admin/
# Usuario superadmin: admin / (tu contraseña)
# Click en: "Orders"
# Verás la lista con approval info
```

---

## Resumen de Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `frontend/src/services/api.js` | Fijar `downloadInvoicePdf()` para usar JWT |
| `frontend/src/pages/UserOrders.jsx` | Actualizar STATUS_CONFIG + agregar auto-refresh |
| `frontend/src/styles/form-modal.css` | Agregar flex layout para scroll |
| `backend/apps/orders/admin.py` | Mejorar fieldsets y list_display |

---

## Commits Generados

```
749ee11 - fix: corregir descarga de PDF, actualizar estados en UserOrders, agregar scroll a formulario modal
517b7e5 - feat: mejorar Django Admin para órdenes
1a7033d - feat: agregar auto-refresh de órdenes en UserOrders
```

---

## Checklist de Validación

### Descarga de Facturas
- [ ] Usuario logueado puede descargar factura de su orden
- [ ] Usuario anónimo con token temporal puede descargar factura
- [ ] No aparece error 403 Forbidden

### Estados de Órdenes
- [ ] Orden nueva muestra "Pendiente de Validación"
- [ ] Admin aprueba orden → cambia a "Aprobado - Listo para Pago"
- [ ] Cliente ve cambio sin refrescar (dentro de 30s)
- [ ] Puede hacer clic en "Pagar" cuando esté aprobada

### Formulario Crear Usuario
- [ ] Modal se abre correctamente
- [ ] Si contenido > viewport: aparece scroll
- [ ] Todos los campos son accesibles sin cambiar zoom

### Django Admin
- [ ] Accedible en `/admin/`
- [ ] Lista de órdenes muestra `admin_approved_by` y `admin_approved_at`
- [ ] Fieldsets se pueden colapsar/expandir
- [ ] Búsqueda funciona con `order_number`

---

## Notas Importantes

1. **Auto-refresh solo activa si hay órdenes pendientes:** No consume recursos constantemente
2. **Descarga de PDF es inteligente:** Intenta JWT primero, fallback a token temporal
3. **Modal scroll es responsive:** Funciona en dispositivos móviles también
4. **Django Admin es totalmente funcional:** Es el equivalente a phpMyAdmin en Django

---

## Próximos Pasos Recomendados

1. ✅ **Tomar screenshot de flujo completo:** Checkout → Aprobación → Pago
2. ✅ **Probar en producción con datos reales**
3. ✅ **Monitorear logs de descarga de PDF:** Asegurar que no hay más errores 403
4. ✅ **Considerar agregar notificaciones por email:** Cuando admin aprueba
