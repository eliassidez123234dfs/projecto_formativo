import { useCallback, useEffect, useState } from 'react'
import './shop.css'
import { getCheckoutSummary, confirmCheckout } from '../services/api'
import { formatCOP } from '../utils/format'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

// ---------------------------------------------------------------
// validateForm — validación cliente del formulario de envío
// Reglas: nombre >= 3 caracteres; email con dominio válido;
//         teléfono solo dígitos >= 7; dirección >= 5 caracteres;
//         ciudad y código postal obligatorios
// ---------------------------------------------------------------
function validateForm(data) {
  const errors = {}

  if (!data.shipping_name.trim()) {
    errors.shipping_name = 'El nombre completo es obligatorio.'
  } else if (data.shipping_name.trim().length < 3) {
    errors.shipping_name = 'El nombre debe tener al menos 3 caracteres.'
  }

  if (!data.shipping_email.trim()) {
    errors.shipping_email = 'El correo electrónico es obligatorio.'
  } else if (!EMAIL_REGEX.test(data.shipping_email.trim())) {
    errors.shipping_email = 'El formato del correo no es válido.'
  } else {
    const domain = data.shipping_email.trim().split('@')[1]
    if (!DOMAIN_REGEX.test(domain)) {
      errors.shipping_email = 'El dominio del correo no es válido.'
    }
  }

  if (!data.shipping_phone.trim()) {
    errors.shipping_phone = 'El número de teléfono es obligatorio.'
  } else if (!/^\d+$/.test(data.shipping_phone.trim())) {
    errors.shipping_phone = 'El teléfono solo debe contener números.'
  } else if (data.shipping_phone.trim().length < 7) {
    errors.shipping_phone = 'El teléfono debe tener al menos 7 dígitos.'
  }

  if (!data.shipping_address.trim()) {
    errors.shipping_address = 'La dirección es obligatoria.'
  } else if (data.shipping_address.trim().length < 5) {
    errors.shipping_address = 'La dirección debe tener al menos 5 caracteres.'
  }

  if (!data.shipping_city.trim()) {
    errors.shipping_city = 'La ciudad es obligatoria.'
  }

  if (!data.shipping_zipcode.trim()) {
    errors.shipping_zipcode = 'El código postal es obligatorio.'
  }

  return errors
}

// ---------------------------------------------------------------
// CheckoutPage.jsx  —  Página de pago con formulario de envío (RF-055)
// APIs consumidas:
//   fetchCheckoutSummary()  GET /api/pedidos/checkout_summary/
//   initCheckout(form)      POST /api/pedidos/iniciar/
//   createPayment(orderId)  POST /api/pagos/crear/
// Hooks: useState, useEffect, useCallback, useNavigate
// Validaciones: formulario de envío (nombre, email, teléfono,
//               dirección, ciudad, código postal) con regex
// Flujo: 1) carga resumen del carrito 2) usuario completa datos
//        3) initCheckout → createPayment → redirección a Wompi
// ---------------------------------------------------------------
export default function CheckoutPage() {
  const [summary, setSummary] = useState({ items: [], total_items: 0, total_amount: '0.00' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    shipping_name: '',
    shipping_email: '',
    shipping_phone: '',
    shipping_address: '',
    shipping_city: '',
    shipping_zipcode: '',
  })
  const [fieldErrors, setFieldErrors] = useState({})

  const loadSummary = useCallback(async () => {
    setLoading(true)
    const data = await getCheckoutSummary()
    setSummary(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadSummary()
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
    <>
      <div className="checkout-page">
        <div className="checkout-header">
          <h1>Checkout</h1>
          <Link to="/cart" className="btn btn-outline">Volver al carrito</Link>
        </div>

        <div className="checkout-layout">
          <div className="checkout-form-section">
            <div className="checkout-card">
              <h2>Datos de envío</h2>
              <form onSubmit={handleSubmit} noValidate>
                <div className="checkout-field">
                  <label htmlFor="shipping_name">Nombre completo</label>
                  <input
                    id="shipping_name"
                    name="shipping_name"
                    type="text"
                    value={form.shipping_name}
                    onChange={handleChange}
                    placeholder="Ej: Juan Pérez"
                    required minLength={3} maxLength={100} autoComplete="name"
                    className={fieldErrors.shipping_name ? 'field-error' : ''}
                  />
                  {fieldErrors.shipping_name && <span className="field-error-text">{fieldErrors.shipping_name}</span>}
                </div>

                <div className="checkout-field">
                  <label htmlFor="shipping_email">Correo electrónico</label>
                  <input
                    id="shipping_email"
                    name="shipping_email"
                    type="email"
                    value={form.shipping_email}
                    onChange={handleChange}
                    placeholder="correo@ejemplo.com"
                    required autoComplete="email"
                    pattern="[^\s@]+@[^\s@]+\.[^\s@]+" maxLength={254}
                    className={fieldErrors.shipping_email ? 'field-error' : ''}
                  />
                  {fieldErrors.shipping_email && <span className="field-error-text">{fieldErrors.shipping_email}</span>}
                </div>

                <div className="checkout-field">
                  <label htmlFor="shipping_phone">Teléfono</label>
                  <input
                    id="shipping_phone"
                    name="shipping_phone"
                    type="tel"
                    value={form.shipping_phone}
                    onChange={handleChange}
                    placeholder="Ej: 3001234567"
                    required autoComplete="tel"
                    pattern="[0-9]{7,15}" maxLength={15}
                    className={fieldErrors.shipping_phone ? 'field-error' : ''}
                  />
                  {fieldErrors.shipping_phone && <span className="field-error-text">{fieldErrors.shipping_phone}</span>}
                </div>

                <div className="checkout-field">
                  <label htmlFor="shipping_address">Dirección</label>
                  <input
                    id="shipping_address"
                    name="shipping_address"
                    type="text"
                    value={form.shipping_address}
                    onChange={handleChange}
                    placeholder="Cra 1 # 2-3, Barrio Centro"
                    className={fieldErrors.shipping_address ? 'field-error' : ''}
                  />
                  {fieldErrors.shipping_address && <span className="field-error-text">{fieldErrors.shipping_address}</span>}
                </div>

                <div className="checkout-row">
                  <div className="checkout-field">
                    <label htmlFor="shipping_city">Ciudad</label>
                    <input
                      id="shipping_city"
                      name="shipping_city"
                      type="text"
                      value={form.shipping_city}
                      onChange={handleChange}
                      placeholder="Bogotá"
                      className={fieldErrors.shipping_city ? 'field-error' : ''}
                    />
                    {fieldErrors.shipping_city && <span className="field-error-text">{fieldErrors.shipping_city}</span>}
                  </div>
                  <div className="checkout-field">
                    <label htmlFor="shipping_zipcode">Código postal</label>
                    <input
                      id="shipping_zipcode"
                      name="shipping_zipcode"
                      type="text"
                      value={form.shipping_zipcode}
                      onChange={handleChange}
                      placeholder="110111"
                      className={fieldErrors.shipping_zipcode ? 'field-error' : ''}
                    />
                    {fieldErrors.shipping_zipcode && <span className="field-error-text">{fieldErrors.shipping_zipcode}</span>}
                  </div>
                </div>

                {error && <div className="checkout-error-banner">{error}</div>}

                <div className="checkout-payment-section">
                  <div className="wompi-info">
                    <img
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 40'%3E%3Crect width='120' height='40' rx='8' fill='%23F5F5F5'/%3E%3Ctext x='12' y='26' font-family='Arial' font-weight='bold' font-size='16' fill='%23E91E63'%3EWompi%3C/text%3E%3C/svg%3E"
                      alt="Wompi"
                      className="wompi-logo"
                    />
                    <span>Pago procesado de forma segura por <strong>Wompi</strong></span>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary checkout-pay-button"
                    disabled={!canPay}
                  >
                    {submitting ? (
                      <>Procesando...</>
                    ) : (
                      <>Pagar ${totalAmount.toFixed(2)} USD con Wompi</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="checkout-summary-section">
            <div className="checkout-card">
              <h2>Resumen del pedido</h2>
              <div className="checkout-items">
                {items.map(item => (
                  <div key={item.id} className="checkout-item">
                    <div className="checkout-item-image">
                      <img
                        src={item.product_image || DEFAULT_IMAGE}
                        alt={item.product_name}
                        onError={(e) => { e.target.src = DEFAULT_IMAGE }}
                      />
                    </div>
                    <div className="checkout-item-info">
                      <p className="checkout-item-name">{item.product_name}</p>
                      <p className="checkout-item-variant">{item.variant_label}</p>
                      <p className="checkout-item-qty">Cant: {item.quantity}</p>
                    </div>
                    <div className="checkout-item-price">
                      <p className="checkout-item-unit">${Number(item.unit_price).toFixed(2)}</p>
                      <p className="checkout-item-subtotal">${Number(item.subtotal).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="checkout-total">
                <span>Total</span>
                <strong>${totalAmount.toFixed(2)} USD</strong>
              </div>
            </div>
          </div>
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
