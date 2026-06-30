import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchCheckoutSummary, initCheckout, createPayment } from '../services/api'
import { Header } from '../components/Header'
import { DEFAULT_IMAGE } from '../constants'
import './checkout.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

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

// Checkout page with shipping form, cart summary, and Wompi payment integration
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
    try {
      const data = await fetchCheckoutSummary()
      setSummary(data)
    } catch {
      setError('Error al cargar el resumen del pedido.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const errors = validateForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (summary.total_items === 0) {
      setError('El carrito está vacío.')
      return
    }

    setSubmitting(true)
    try {
      const order = await initCheckout(form)
      const payment = await createPayment(order.order_id)

      if (payment.redirect_url) {
        window.location.href = payment.redirect_url
      } else {
        setError('No se pudo obtener la URL de pago.')
        setSubmitting(false)
      }
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const serverErrors = {}
        let hasFieldError = false
        for (const key of Object.keys(form)) {
          if (data[key]) {
            serverErrors[key] = Array.isArray(data[key]) ? data[key][0] : data[key]
            hasFieldError = true
          }
        }
        if (hasFieldError) {
          setFieldErrors(serverErrors)
        } else {
          setError(data.detail || 'Error al procesar el pago.')
        }
      } else {
        setError('Error de conexión. Intente nuevamente.')
      }
      setSubmitting(false)
    }
  }

  const items = summary.items || []
  const totalAmount = Number(summary.total_amount)
  const isFormValid = Object.values(form).every(v => v.trim())
  const canPay = !loading && summary.total_items > 0 && isFormValid && !submitting

  if (loading) {
    return (
      <>
        <Header cartCount={0} />
        <div className="checkout-page">
          <div className="checkout-loading">Cargando checkout...</div>
        </div>
      </>
    )
  }

  if (summary.total_items === 0 && !loading) {
    return (
      <>
        <Header cartCount={0} />
        <div className="checkout-page">
          <div className="checkout-empty">
            <h2>Tu carrito está vacío</h2>
            <p>Agrega productos al carrito antes de continuar.</p>
            <Link to="/catalog" className="btn btn-primary">Ir al catálogo</Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header cartCount={summary.total_items} />
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
      </div>
    </>
  )
}
