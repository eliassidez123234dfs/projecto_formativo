import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { getCheckoutSummary, confirmCheckout } from '../services/api'
import { formatCOP } from '../utils/format'

const cardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  background: 'var(--color-bg)',
  padding: 24,
  boxShadow: 'var(--shadow-sm)',
}

export default function CheckoutPage() {
  const [summary, setSummary] = useState({ items: [], total_items: 0, total_amount: '0.00' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [department, setDepartment] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [reference, setReference] = useState('')

  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

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
      setMessageType('success')
      setCustomerName('')
      setCustomerEmail('')
      setAddress('')
      setCity('')
      setDepartment('')
      setPostalCode('')
      setReference('')
      await loadSummary()
    } catch (err) {
      const data = err?.response?.data || {}
      setMessage(data.detail || data.customer_name || 'No se pudo confirmar el checkout')
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Header cartCount={summary.total_items} />
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Finalizar compra</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
            Confirma tus datos de contacto y entrega, y revisa el resumen de tu pedido.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Cargando checkout...
          </div>
        ) : (
          <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, alignItems: 'start' }}>
            <form onSubmit={confirmCheckoutHandler} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <section style={cardStyle}>
                <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Datos del cliente</h2>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Estos datos se usarán para el contacto y la entrega de tu pedido.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="checkout-field-label checkout-required" htmlFor="checkout-name">Nombre</label>
                    <input
                      id="checkout-name"
                      className="checkout-input"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Nombre completo"
                      required
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label checkout-required" htmlFor="checkout-email">Correo</label>
                    <input
                      id="checkout-email"
                      type="email"
                      className="checkout-input"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="correo@dominio.com"
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="checkout-field-label checkout-required" htmlFor="checkout-address">Dirección</label>
                    <input
                      id="checkout-address"
                      className="checkout-input"
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Calle, número, barrio"
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label checkout-required" htmlFor="checkout-city">Ciudad</label>
                    <input
                      id="checkout-city"
                      className="checkout-input"
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder="Ej. Bogotá"
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label checkout-required" htmlFor="checkout-department">Departamento</label>
                    <input
                      id="checkout-department"
                      className="checkout-input"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="Ej. Cundinamarca"
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-postal">Código postal</label>
                    <input
                      id="checkout-postal"
                      className="checkout-input"
                      value={postalCode}
                      onChange={e => setPostalCode(e.target.value)}
                      placeholder="Ej. 110111"
                    />
                  </div>

                  <div>
                    <label className="checkout-field-label" htmlFor="checkout-reference">Punto de referencia</label>
                    <input
                      id="checkout-reference"
                      className="checkout-input"
                      value={reference}
                      onChange={e => setReference(e.target.value.slice(0, 100))}
                      placeholder="Ej. Frente al parque principal"
                      maxLength={100}
                    />
                    <p className="checkout-counter">{reference.length}/100</p>
                  </div>
                </div>
              </section>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link to="/cart" className="btn btn-outline" style={{ textDecoration: 'none' }}>
                  Volver al carrito
                </Link>
                <button type="submit" className="btn btn-primary" disabled={submitting || summary.total_items === 0}>
                  {submitting ? 'Procesando...' : 'Confirmar pedido'}
                </button>
              </div>
            </form>

            <aside style={{ ...cardStyle, position: 'sticky', top: 88 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Resumen del pedido</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                {summary.total_items} producto{summary.total_items !== 1 ? 's' : ''} en tu carrito
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {(summary.items || []).map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product_name}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {item.variant} · x{item.quantity}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, color: 'var(--color-text)' }}>{formatCOP(item.subtotal)}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>{formatCOP(item.unit_price)} c/u</p>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Total a pagar</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>{formatCOP(summary.total_amount)}</span>
              </div>
            </aside>
          </div>
        )}

        {message && (
          <p style={{
            marginTop: 20, padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: messageType === 'error' ? 'var(--color-error-light)' : 'var(--color-success-light)',
            color: messageType === 'error' ? 'var(--color-error)' : 'var(--color-success)',
          }}>
            {message}
          </p>
        )}
      </div>

      <style>{`
        .checkout-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--color-border);
          border-radius: 8px;
          font-size: 14px;
          font-family: inherit;
          color: var(--color-text);
          background: var(--color-bg);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .checkout-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light);
        }
        .checkout-input::placeholder { color: var(--color-text-muted); }
        .checkout-field-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
          margin-bottom: 6px;
        }
        .checkout-required::after { content: ' *'; color: var(--color-primary); }
        .checkout-counter {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--color-text-muted);
          text-align: right;
        }
        @media (max-width: 900px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-grid aside { position: static !important; }
        }
        @media (max-width: 520px) {
          .checkout-grid > form > section > div { grid-template-columns: 1fr !important; }
          .checkout-grid > form > section > div > div { grid-column: auto !important; }
        }
      `}</style>
    </>
  )
}
