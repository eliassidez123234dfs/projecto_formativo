import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchPaymentStatus, generateInvoice, fetchOrderInvoice } from '../services/api'
import { Header } from '../components/Header'
import './checkout.css'

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams()
  const reference = searchParams.get('reference')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [invoice, setInvoice] = useState(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  const loadStatus = useCallback(async () => {
    if (!reference) {
      setError('No se encontró referencia de pago.')
      setLoading(false)
      return
    }
    try {
      const result = await fetchPaymentStatus(reference)
      setData(result)
      if (result.status !== 'pagado') {
        if (result.status === 'cancelado') {
          setError(result.payment_rejection_reason || 'El pago fue rechazado.')
        } else {
          setError('El pago no ha sido confirmado aún.')
        }
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Error al consultar el estado del pago.'
      setError(detail)
    } finally {
      setLoading(false)
    }
  }, [reference])

  const loadInvoice = useCallback(async (orderId) => {
    try {
      const result = await fetchOrderInvoice(orderId)
      if (result.length > 0) setInvoice(result[0])
    } catch {
      // no invoice yet
    }
  }, [])

  useEffect(() => {
    if (data?.id) loadInvoice(data.id)
  }, [data, loadInvoice])

  const handleGenerateInvoice = async () => {
    if (!data?.id) return
    setGeneratingInvoice(true)
    try {
      const result = await generateInvoice(data.id)
      setInvoice(result)
      toast.success('Factura generada correctamente.')
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al generar factura'
      toast.error(msg)
    } finally {
      setGeneratingInvoice(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    if (!cancelled) loadStatus()
    return () => { cancelled = true }
  }, [loadStatus])

  if (loading) {
    return (
      <>
        <Header cartCount={0} />
        <div className="checkout-page">
          <div className="checkout-loading">Verificando estado del pago...</div>
        </div>
      </>
    )
  }

  if (!reference) {
    return (
      <>
        <Header cartCount={0} />
        <div className="checkout-page">
          <div className="checkout-empty">
            <h2>Referencia no encontrada</h2>
            <p>No se encontró información de pago.</p>
            <Link to="/catalog" className="btn btn-primary">Ir al catálogo</Link>
          </div>
        </div>
      </>
    )
  }

  if (error && (!data || data.status !== 'pagado')) {
    return (
      <>
        <Header cartCount={0} />
        <div className="confirmation-page">
          <div className="confirmation-card confirmation-error">
            <div className="confirmation-icon" style={{ background: 'var(--color-error)' }}>
              <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            <h2>Pago no procesado</h2>
            {data?.payment_rejection_reason && (
              <div className="rejection-reason">{data.payment_rejection_reason}</div>
            )}
            {!data?.payment_rejection_reason && <p>{error}</p>}
            <div className="confirmation-actions">
              <Link to="/checkout" className="btn btn-primary">Intentar de nuevo</Link>
              <Link to="/catalog" className="btn btn-outline">Seguir comprando</Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <Header cartCount={0} />
        <div className="checkout-page">
          <div className="checkout-empty">
            <h2>Sin información</h2>
            <p>No se pudo obtener la información del pedido.</p>
            <Link to="/catalog" className="btn btn-primary">Ir al catálogo</Link>
          </div>
        </div>
      </>
    )
  }

  const items = data.items || []

  return (
    <>
      <Header cartCount={0} />
      <div className="confirmation-page">
        <div className="confirmation-card">
          <div className="confirmation-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1>¡Compra confirmada!</h1>
          <p className="order-number">Pedido #{data.order_number}</p>

          <div className="confirmation-details">
            <h3>Productos</h3>
            <div className="confirmation-items">
              {items.map((item, idx) => (
                <div key={idx} className="confirmation-item">
                  <span className="confirmation-item-name">{item.product_name}</span>
                  <span className="confirmation-item-detail">
                    {item.variant_label} x{item.quantity}
                  </span>
                  <span className="confirmation-item-price">${Number(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="confirmation-total-row">
              <span>Total pagado</span>
              <strong>${Number(data.total).toFixed(2)} USD</strong>
            </div>

            <h3>Datos de envío</h3>
            <div className="confirmation-info-grid">
              <div className="confirmation-info-item">
                <span className="label">Nombre</span>
                <span className="value">{data.shipping_name}</span>
              </div>
              <div className="confirmation-info-item">
                <span className="label">Correo</span>
                <span className="value">{data.shipping_email}</span>
              </div>
              <div className="confirmation-info-item">
                <span className="label">Teléfono</span>
                <span className="value">{data.shipping_phone}</span>
              </div>
              <div className="confirmation-info-item">
                <span className="label">Ciudad</span>
                <span className="value">{data.shipping_city}</span>
              </div>
              <div className="confirmation-info-item full-width">
                <span className="label">Dirección</span>
                <span className="value">{data.shipping_address}</span>
              </div>
              <div className="confirmation-info-item">
                <span className="label">Código Postal</span>
                <span className="value">{data.shipping_zipcode}</span>
              </div>
              <div className="confirmation-info-item">
                <span className="label">Fecha</span>
                <span className="value">{new Date(data.created_at).toLocaleDateString('es-CO')}</span>
              </div>
              <div className="confirmation-info-item">
                <span className="label">Transacción</span>
                <span className="value" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  {data.payment_transaction_id ? data.payment_transaction_id.slice(0, 16) + '...' : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {data.status === 'pagado' && (
            <>
              <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />
              <div style={{ textAlign: 'center' }}>
                <h3>Factura</h3>
                {invoice ? (
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    <p><strong>No. Factura:</strong> {invoice.invoice_number}</p>
                    <p><strong>Subtotal:</strong> ${Number(invoice.subtotal).toFixed(2)}</p>
                    <p><strong>Total:</strong> ${Number(invoice.total).toFixed(2)}</p>
                    <p style={{ color: '#6b7280', fontSize: 12 }}>
                      Generada el {new Date(invoice.generated_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateInvoice}
                    disabled={generatingInvoice}
                    className="btn btn-outline"
                    style={{ marginTop: 8 }}
                  >
                    {generatingInvoice ? 'Generando...' : 'Descargar Factura'}
                  </button>
                )}
              </div>
            </>
          )}

          <div className="confirmation-actions">
            <Link to="/dashboard" className="btn btn-primary">Mis pedidos</Link>
            <Link to="/catalog" className="btn btn-outline">Seguir comprando</Link>
          </div>
        </div>
      </div>
    </>
  )
}
