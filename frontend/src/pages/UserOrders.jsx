/**
 * UserOrders.jsx — Página de historial de pedidos del usuario.
 *
 * Secciones:
 * 1. Configuración de estados de pedido (labels, iconos, badges).
 * 2. Cabecera con navegación y acciones.
 * 3. Barra de filtros por estado (todos, aprobados, pendientes, pagados, enviados).
 * 4. Lista de tarjetas de orden con diseño personalizado, items y acciones.
 * 5. Modal de pago Wompi Sandbox para pedidos aprobados.
 * 6. Modal zoom de imagen de diseño personalizado.
 *
 * Decisiones de diseño:
 * - Suscripción al estado de autenticación para reflejar cambios de sesión.
 * - Mapeo de estados en español e inglés (pendiente/pending, pagado/paid, etc.).
 * - El pago se realiza vía Wompi Sandbox (simulación de prueba).
 */
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { fetchMyOrders, downloadInvoicePdf, payOrderWompiSandbox } from '../services/api'
import { getCurrentUser, subscribe } from '../services/authService'
import { formatCOP } from '../utils/format'
import toast from 'react-hot-toast'
import '../styles/UserOrders.scss'

// ─── CONFIGURACIÓN DE ESTADOS DE PEDIDO ───
// Mapea cada estado del backend a su label, clase CSS, icono y descripción.
const ORDER_STATUS_CONFIG = {
  // Nuevos estados (post-aprobación de admin)
  pendiente_validacion: {
    label: 'Pendiente de Validación',
    badgeClass: 'status-pending',
    icon: '⏳',
    desc: 'Tu pedido está siendo revisado por nuestro equipo. Validaremos la calidad y viabilidad de tu diseño.',
  },
  aprobado: {
    label: 'Aprobado - Listo para Pago',
    badgeClass: 'status-approved',
    icon: '✓',
    desc: '¡Tu diseño fue aprobado! Procede a pagarlo para iniciar la confección de tu prenda.',
  },
  // Estados anteriores (compatibilidad)
  pendiente: {
    label: 'Pendiente de Validación',
    badgeClass: 'status-pending',
    icon: '⏳',
    desc: 'Tu pedido está siendo revisado por nuestro equipo.',
  },
  pending: {
    label: 'Pendiente de Validación',
    badgeClass: 'status-pending',
    icon: '⏳',
    desc: 'Tu pedido está siendo revisado por nuestro equipo.',
  },
  produccion: {
    label: 'En Fabricación',
    badgeClass: 'status-production',
    icon: '🏭',
    desc: 'Tu prenda está siendo estampada y empacada en nuestros talleres.',
  },
  processing: {
    label: 'En Fabricación',
    badgeClass: 'status-production',
    icon: '🏭',
    desc: 'Tu prenda está siendo estampada y empacada en nuestros talleres.',
  },
  pagado: {
    label: 'Pagado - En Confección',
    badgeClass: 'status-paid',
    icon: '💳',
    desc: 'Pago confirmado exitosamente. Tu prenda está siendo estampada y empacada.',
  },
  paid: {
    label: 'Pagado - En Confección',
    badgeClass: 'status-paid',
    icon: '💳',
    desc: 'Pago confirmado exitosamente. Tu prenda está siendo estampada y empacada.',
  },
  enviado: {
    label: 'Enviado - En Camino',
    badgeClass: 'status-shipping',
    icon: '🚚',
    desc: 'El paquete va rumbo a tu dirección de entrega. Llegará en 3-5 días hábiles.',
  },
  entregado: {
    label: 'Entregado',
    badgeClass: 'status-delivered',
    icon: '📦',
    desc: 'Pedido recibido con éxito. ¡Esperamos que disfrutes tu camiseta!',
  },
  completed: {
    label: 'Entregado',
    badgeClass: 'status-delivered',
    icon: '📦',
    desc: 'Pedido recibido con éxito.',
  },
  cancelado: {
    label: 'Cancelado',
    badgeClass: 'status-cancelled',
    icon: '✕',
    desc: 'El pedido fue cancelado o el diseño no cumplió los requisitos técnicos.',
  },
}

// ─── UTILIDAD: FORMATEO DE FECHAS ───
function formatDate(val) {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── COMPONENTE PRINCIPAL ───
export default function UserOrders() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(() => getCurrentUser())
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [payingOrderId, setPayingOrderId] = useState(null)
  const [downloadingId, setDownloadingId] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [wompiModalOrder, setWompiModalOrder] = useState(null)

  useEffect(() => {
    const unsub = subscribe((u) => setUsuario(u))
    return unsub
  }, [])

  useEffect(() => {
    if (!usuario) {
      navigate('/login')
    }
  }, [usuario, navigate])

// ─── CARGA DE ÓRDENES ───
const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await fetchMyOrders()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!usuario) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchMyOrders()
        if (!cancelled) setOrders(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setOrders([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [usuario])

  // ─── AUTO-REFRESH: Recargar órdenes cada 30s si hay pendientes de validación ───
  useEffect(() => {
    // Solo activa polling si hay órdenes en pendiente_validacion
    const hasPendingValidation = orders.some(o => o.status === 'pendiente_validacion')
    if (!hasPendingValidation) return

    const intervalId = setInterval(async () => {
      try {
        const data = await fetchMyOrders()
        setOrders(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error refrescando órdenes:', err)
      }
    }, 30000) // Cada 30 segundos

    return () => clearInterval(intervalId)
  }, [orders])

// ─── HANDLERS: DESCARGA PDF Y PAGO WOMPI ───
const handleDownloadPdf = async (orderId) => {
    setDownloadingId(orderId)
    try {
      const blob = await downloadInvoicePdf(orderId)
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Factura_Orden_${orderId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast.success('Factura descargada correctamente')
    } catch {
      toast.error('No se pudo descargar la factura en PDF.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handlePayWompiSandbox = async (order) => {
    setPayingOrderId(order.id)
    try {
      const res = await payOrderWompiSandbox(order.id)
      toast.success(res.message || '¡Pago procesado con éxito en Wompi Sandbox!')
      setWompiModalOrder(null)
      // Refrescar lista de órdenes
      await loadOrders()
    } catch {
      toast.error('Error al procesar el pago con Wompi Sandbox.')
    } finally {
      setPayingOrderId(null)
    }
  }

// ─── FILTRADO DE ÓRDENES ───
const filteredOrders = orders.filter((o) => {
    if (filter === 'all') return true
    if (filter === 'pendientes') return o.status === 'pendiente' || o.status === 'pending'
    if (filter === 'aprobados') return o.status === 'produccion' || o.status === 'processing'
    if (filter === 'pagados') return o.status === 'pagado' || o.status === 'paid'
    if (filter === 'enviados') return o.status === 'enviado' || o.status === 'entregado' || o.status === 'completed'
    return true
  })

  if (!usuario) return null

  return (
    <div className="user-orders-page">
      <Header />

      <main className="user-orders-container">
        {/* Cabecera superior y navegación */}
        <div className="user-orders-header">
          <div className="user-orders-header__title-area">
            <Link to="/perfil" className="back-link">
              ← Volver a Mi Perfil
            </Link>
            <h1>Historial de Mis Pedidos</h1>
            <p className="subtitle">
              Consulta el estado de tus compras, la aprobación de tus diseños personalizados 3D y realiza el pago seguro de tus pedidos aprobados.
            </p>
          </div>
          <div className="user-orders-header__actions">
            <Link to="/catalog" className="btn-catalog">
              + Nuevo Pedido / Catálogo
            </Link>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="orders-filter-bar">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todos ({orders.length})
          </button>
          <button
            className={`filter-tab ${filter === 'aprobados' ? 'active' : ''}`}
            onClick={() => setFilter('aprobados')}
          >
            Aprobados / Listos para pagar
          </button>
          <button
            className={`filter-tab ${filter === 'pendientes' ? 'active' : ''}`}
            onClick={() => setFilter('pendientes')}
          >
            En Validación
          </button>
          <button
            className={`filter-tab ${filter === 'pagados' ? 'active' : ''}`}
            onClick={() => setFilter('pagados')}
          >
            Pagados
          </button>
          <button
            className={`filter-tab ${filter === 'enviados' ? 'active' : ''}`}
            onClick={() => setFilter('enviados')}
          >
            En Camino / Entregados
          </button>
        </div>

        {/* Contenido principal: lista de pedidos */}
        {loading ? (
          <div className="orders-loading-state">
            <div className="orders-spinner" />
            <p>Cargando tus pedidos...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty-state">
            <div className="orders-empty-icon">🛍️</div>
            <h2>No tienes pedidos en esta sección</h2>
            <p>
              {orders.length === 0
                ? 'Aún no has realizado pedidos con tu cuenta. ¡Personaliza tu camiseta en nuestro editor 3D o elige una prenda de nuestro catálogo!'
                : 'No hay pedidos con el filtro seleccionado.'}
            </p>
            <Link to="/catalog" className="btn-primary-action">
              Explorar Catálogo de Productos
            </Link>
          </div>
        ) : (
          <div className="orders-cards-list">
            {filteredOrders.map((order) => {
              const cfg = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pendiente
              const hasCustomDesign = Boolean(order.image_url || order.image)
              const isApprovedReadyToPay = order.status === 'produccion' || order.status === 'processing'
              const isPaid = order.status === 'pagado' || order.status === 'paid'
              const isPendingValidation = order.status === 'pendiente' || order.status === 'pending'

              return (
                <article key={order.id} className={`order-card order-card--${order.status}`}>
                  {/* Encabezado de la tarjeta de orden */}
                  <div className="order-card__header">
                    <div className="order-meta">
                      <div className="order-num-row">
                        <span className="order-num">
                          {order.order_number || `ORD-${String(order.id).padStart(6, '0')}`}
                        </span>
                        {hasCustomDesign && (
                          <span className="badge-custom-design">
                            🎨 Estampado Personalizado 3D
                          </span>
                        )}
                      </div>
                      <span className="order-date">Realizado el {formatDate(order.created_at)}</span>
                    </div>

                    <div className="order-status-wrapper">
                      <span className={`order-status-badge ${cfg.badgeClass}`}>
                        <span className="status-dot" /> {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Banner de Estado Contextual */}
                  {isPendingValidation && (
                    <div className="order-notice order-notice--pending">
                      <span className="notice-icon">⏳</span>
                      <div>
                        <strong>En validación de estampado:</strong> Nuestro equipo de diseño está revisando la resolución y viabilidad técnica de tu diseño personalizado. Te notificaremos apenas sea aprobado para que realices el pago.
                      </div>
                    </div>
                  )}

                  {isApprovedReadyToPay && (
                    <div className="order-notice order-notice--approved">
                      <span className="notice-icon">🎉</span>
                      <div>
                        <strong>¡Diseño Aprobado por el Administrador!</strong> Tu diseño de estampación ha sido verificado y está listo para pasar a confección. Ya puedes realizar el pago con <strong>Wompi Sandbox</strong> para iniciar la producción.
                      </div>
                    </div>
                  )}

                  {isPaid && (
                    <div className="order-notice order-notice--paid">
                      <span className="notice-icon">💳</span>
                      <div>
                        <strong>Pago Acreditado:</strong> Transacción Wompi confirmada ({order.payment_reference || 'Ref. Wompi'}). Tu prenda está siendo estampada y preparada para despacho.
                      </div>
                    </div>
                  )}

                  {/* Cuerpo de la orden: Diseño + Items */}
                  <div className="order-card__body">
                    {/* Visualización del diseño personalizado si existe */}
                    {hasCustomDesign && (
                      <div className="custom-design-preview-panel">
                        <div
                          className="preview-image-box"
                          onClick={() => setPreviewImage(order.image_url || order.image)}
                          title="Click para ver en tamaño completo"
                        >
                          <img
                            src={order.image_url || order.image}
                            alt="Previsualización 3D del diseño"
                            loading="lazy"
                          />
                          <span className="zoom-hint">🔍 Ampliar diseño</span>
                        </div>
                        <div className="preview-design-info">
                          <h4>Detalles de Personalización</h4>
                          {order.design_color && (
                            <p className="design-attr">
                              <strong>Color de base:</strong> {order.design_color}
                            </p>
                          )}
                          {order.notes && (
                            <p className="design-notes">
                              <strong>Especificaciones:</strong> {order.notes}
                            </p>
                          )}
                          <p className="design-verify-tag">
                            {isApprovedReadyToPay
                              ? '✓ Estampación Aprobada para Producción'
                              : isPaid
                              ? '✓ En Estampación Activa'
                              : '⏳ Verificando formato de impresión'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Lista de prendas / artículos */}
                    <div className="order-items-table-wrapper">
                      <table className="order-items-table">
                        <thead>
                          <tr>
                            <th>Artículo</th>
                            <th>Variante / Talla</th>
                            <th>Cantidad</th>
                            <th>Precio Unitario</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item) => (
                              <tr key={item.id}>
                                <td className="item-name">
                                  <strong>{hasCustomDesign ? 'Camiseta Estampado Personalizado 3D' : item.product_name}</strong>
                                </td>
                                <td>
                                  <span className="variant-pill">{item.variant_label}</span>
                                </td>
                                <td>{item.quantity} und.</td>
                                <td>{formatCOP(item.unit_price)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="4">
                                {hasCustomDesign ? 'Camiseta con diseño personalizado 3D' : 'Prenda seleccionada'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pie de la tarjeta de orden: Total y Acciones */}
                  <div className="order-card__footer">
                    <div className="order-total-block">
                      <span className="total-label">Total del Pedido:</span>
                      <strong className="total-value">{formatCOP(order.total)}</strong>
                    </div>

                    <div className="order-actions-block">
                      <button
                        type="button"
                        className="btn-download-invoice"
                        disabled={downloadingId === order.id}
                        onClick={() => handleDownloadPdf(order.id)}
                      >
                        {downloadingId === order.id ? 'Descargando...' : '📄 Factura PDF'}
                      </button>

                      {/* Botón de pago Wompi Sandbox para pedidos aprobados o listos */}
                      {isApprovedReadyToPay && (
                        <button
                          type="button"
                          className="btn-wompi-pay"
                          onClick={() => setWompiModalOrder(order)}
                        >
                          <span className="wompi-badge">Wompi</span>
                          Pagar Pedido Aprobado →
                        </button>
                      )}

                      {isPendingValidation && (
                        <span className="pending-payment-tip">
                          Pago disponible una vez aprobado el diseño
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* ─── MODAL DE PAGO WOMPI SANDBOX ─── */}
      {wompiModalOrder && (
        <div className="wompi-modal-overlay" onClick={() => setWompiModalOrder(null)}>
          <div className="wompi-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="wompi-modal-header">
              <div className="wompi-brand">
                <span className="wompi-logo-text">Wompi</span>
                <span className="sandbox-badge">SANDBOX TEST</span>
              </div>
              <button className="close-btn" onClick={() => setWompiModalOrder(null)}>
                ✕
              </button>
            </div>

            <div className="wompi-modal-body">
              <h3>Confirmación de Pago Seguro</h3>
              <p className="wompi-order-ref">
                Orden #{wompiModalOrder.order_number || wompiModalOrder.id}
              </p>

              <div className="wompi-amount-box">
                <span className="amount-label">Monto a Pagar (COP)</span>
                <span className="amount-val">{formatCOP(wompiModalOrder.total)}</span>
              </div>

              <div className="wompi-info-alert">
                <strong>Ambiente de Pruebas Wompi Bancolombia:</strong>
                <p>
                  Tu diseño ya fue revisado y aprobado con éxito. Puedes simular el pago de prueba para que la orden quede registrada como pagada y pase de inmediato a fabricación y despacho.
                </p>
              </div>

              <div className="wompi-details-list">
                <div className="wompi-detail-item">
                  <span>Comercio:</span>
                  <strong>RED Personalizados</strong>
                </div>
                <div className="wompi-detail-item">
                  <span>Referencia:</span>
                  <code>{wompiModalOrder.order_number || `ORD-${wompiModalOrder.id}`}</code>
                </div>
                <div className="wompi-detail-item">
                  <span>Cliente:</span>
                  <strong>{wompiModalOrder.customer_name || usuario.usuario}</strong>
                </div>
              </div>
            </div>

            <div className="wompi-modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setWompiModalOrder(null)}
                disabled={payingOrderId === wompiModalOrder.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-confirm-wompi"
                disabled={payingOrderId === wompiModalOrder.id}
                onClick={() => handlePayWompiSandbox(wompiModalOrder)}
              >
                {payingOrderId === wompiModalOrder.id ? (
                  'Procesando en Wompi...'
                ) : (
                  <>💳 Confirmar Pago con Wompi Sandbox</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL ZOOM DE DISEÑO ─── */}
      {previewImage && (
        <div className="design-zoom-overlay" onClick={() => setPreviewImage(null)}>
          <div className="design-zoom-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-zoom-btn" onClick={() => setPreviewImage(null)}>
              ✕ Cerrar
            </button>
            <img src={previewImage} alt="Diseño personalizado ampliado" />
          </div>
        </div>
      )}
    </div>
  )
}
