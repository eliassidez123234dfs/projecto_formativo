import { useCallback, useEffect, useState } from 'react'
import './shop.css'
import { getCheckoutSummary, confirmCheckout } from '../services/api'
import { formatCOP } from '../utils/format'

export default function CheckoutPage() {
  const [summary, setSummary] = useState({ items: [], total_items: 0, total_amount: '0.00' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [message, setMessage] = useState('')

  const loadSummary = useCallback(async () => {
    setLoading(true)
    const data = await getCheckoutSummary()
    setSummary(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await loadSummary()
    })()
    return () => {
      cancelled = true
    }
  }, [loadSummary])

  async function confirmCheckoutHandler(e) {
    e.preventDefault()
    setMessage('')
    setSubmitting(true)
    try {
      const data = await confirmCheckout({ customer_name: customerName, customer_email: customerEmail })
      setMessage(`Orden #${data.order_id} creada por ${formatCOP(data.total)}`)
      setCustomerName('')
      setCustomerEmail('')
      await loadSummary()
    } catch (err) {
      const data = err?.response?.data || {}
      setMessage(data.detail || data.customer_name || 'No se pudo confirmar el checkout')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="shop-shell">
      <section className="admin-detail-hero">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>Confirmar pedido</h1>
          <p>Este flujo consume el módulo de checkout y crea la orden con los items del carrito.</p>
        </div>
        <div className="admin-detail-actions">
          <a className="shop-button secondary" href="/cart">Volver al carrito</a>
          <a className="shop-button secondary" href="/catalogo">Catálogo</a>
        </div>
      </section>

      {loading ? (
        <div className="shop-empty">Cargando checkout...</div>
      ) : (
        <section className="cart-layout">
          <article className="cart-summary">
            <h2>Resumen del pedido</h2>
            <p>Items: {summary.total_items}</p>
            <p>Total: <strong>{formatCOP(summary.total_amount)}</strong></p>
            <ul className="clean-list">
              {(summary.items || []).map(item => (
                <li key={item.id}>{item.product_name} ({item.variant}) x {item.quantity} - {formatCOP(item.subtotal)}</li>
              ))}
            </ul>
          </article>

          <article className="cart-summary">
            <h2>Datos del cliente</h2>
            <form onSubmit={confirmCheckoutHandler} className="variant-selectors">
              <label>Nombre</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Nombre completo" required />

              <label>Email</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="correo@dominio.com" />

              <button type="submit" className="shop-button" disabled={submitting || summary.total_items === 0}>
                {submitting ? 'Procesando...' : 'Confirmar checkout'}
              </button>
            </form>
          </article>
        </section>
      )}

      {message && <p className="detail-message">{message}</p>}
    </main>
  )
}
