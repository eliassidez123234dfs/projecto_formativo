/**
 * CheckoutPage.jsx — Página de finalización de pedido (checkout).
 *
 * Estructura:
 * 1. Resumen del carrito cargado del backend (getCheckoutSummary).
 * 2. Formulario de datos del cliente y dirección de envío.
 * 3. Vista de confirmación post-pedido con opción de descargar factura PDF.
 *
 * Decisiones de diseño:
 * - Departamento/Ciudad con cascada dinámica usando datos de COLOMBIA_DEPARTAMENTOS.
 * - Validación en cliente antes de enviar el pedido.
 * - El pedido queda en estado "Pendiente" para validación administrativa.
 * - Layout responsivo: grid de 2 columnas en desktop, 1 columna en móvil.
 */
import { COLOMBIA_DEPARTAMENTOS } from '../data/colombiaData'
import { Header } from '../components/Header'
import { Link, useNavigate } from 'react-router-dom'
import { formatCOP } from '../utils/format'
import { getCheckoutSummary, confirmCheckout, downloadInvoicePdf, tokenizeWompiCard, createWompiPayment } from '../services/api'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useCart } from '../context/CartContext'

// ─── ESTILO BASE PARA TARJETAS ───
const cardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  background: 'var(--color-bg)',
  padding: 24,
  boxShadow: 'var(--shadow-sm)',
}

// ─── COMPONENTE PRINCIPAL ───
export default function CheckoutPage() {
  const navigate = useNavigate()
  const { loadCart } = useCart()

  const [summary, setSummary] = useState({ items: [], total_items: 0, total_amount: '0.00' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  // Datos del formulario
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [department, setDepartment] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [reference, setReference] = useState('')

  // Errores de validación por campo
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  // Estado del pedido completado
  const [completedOrder, setCompletedOrder] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ number: '', cvc: '', expMonth: '', expYear: '', cardHolder: '' })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentResult, setPaymentResult] = useState(null)

// ─── CARGA DEL RESUMEN DEL CHECKOUT ───
const loadSummary = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getCheckoutSummary()
      setSummary(data)
    } catch (err) {
      console.error('Error cargando checkout summary:', err)
    } finally {
      setLoading(false)
    }
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

// ─── CIUDADES DISPONIBLES SEGÚN DEPARTAMENTO ───
// Filtra las ciudades del JSON estático según el departamento seleccionado.
const availableCities = useMemo(() => {
    if (!department) return []
    const depObj = COLOMBIA_DEPARTAMENTOS.find(d => d.nombre === department)
    return depObj ? depObj.ciudades : []
  }, [department])

  const handleDepartmentChange = (e) => {
    const val = e.target.value
    setDepartment(val)
    setCity('')
    if (fieldErrors.department) {
      setFieldErrors(prev => ({ ...prev, department: null }))
    }
  }

  // Validación en cliente antes de enviar
// ─── VALIDACIÓN EN CLIENTE ───
function validateForm() {
    const errors = {}
    if (!customerName.trim()) {
      errors.customerName = 'El nombre completo es requerido.'
    } else if (customerName.trim().length < 3) {
      errors.customerName = 'El nombre debe tener al menos 3 caracteres.'
    }

    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
    if (!customerEmail.trim()) {
      errors.customerEmail = 'El correo electrónico es requerido.'
    } else if (!emailRegex.test(customerEmail.trim())) {
      errors.customerEmail = 'Ingresa un correo electrónico válido.'
    }

    if (!address.trim()) {
      errors.address = 'La dirección de entrega es requerida.'
    }

    if (!department.trim()) {
      errors.department = 'El departamento es requerido.'
    }

    if (!city.trim()) {
      errors.city = 'La ciudad es requerida.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

// ─── ENVÍO DEL PEDIDO ───
async function confirmCheckoutHandler(e) {
    e.preventDefault()
    setGeneralError('')

    if (!validateForm()) {
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
        department: department.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        reference: reference.trim(),
      }

      const response = await confirmCheckout(payload)
      setCompletedOrder({
        order_id: response.order_id,
        order_number: response.order_number || `ORD-${String(response.order_id).padStart(6, '0')}`,
        status: response.status,
        status_display: response.status_display || 'Pendiente',
        total: response.total,
        customer_name: response.customer_name || customerName,
        customer_email: response.customer_email || customerEmail,
        download_pdf_url: response.download_pdf_url,
      })

      // Refrescar el estado global del carrito para que quede en 0
      if (loadCart) {
        await loadCart()
      }
    } catch (err) {
      const data = err?.response?.data || {}
      if (data.errors) {
        setFieldErrors(data.errors)
      }
      setGeneralError(data.detail || data.customer_email || data.customer_name || 'Ocurrió un error al procesar el pedido. Verifica los datos.')
    } finally {
      setSubmitting(false)
    }
  }

// ─── DESCARGA DE FACTURA PDF ───
async function handleDownloadPdf() {
    if (!completedOrder?.order_id) return
    setDownloadingPdf(true)
    try {
      const accessToken = completedOrder.download_pdf_url
        ? new URL(completedOrder.download_pdf_url, window.location.origin).searchParams.get('access')
        : ''
      const blob = await downloadInvoicePdf(completedOrder.order_id, accessToken)
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Factura_${completedOrder.order_number || `Orden_${completedOrder.order_id}`}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error descargando factura PDF:', err)
      alert('No se pudo descargar la factura en PDF. Por favor intenta de nuevo.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  async function handleSandboxPayment(e) {
    e.preventDefault()
    setPaymentLoading(true)
    setPaymentResult(null)
    try {
      const cardToken = await tokenizeWompiCard(paymentForm)
      const result = await createWompiPayment(completedOrder.order_id, cardToken)
      setPaymentResult(result)
    } catch (err) {
      setPaymentResult({ status: 'ERROR', status_message: err.message })
    } finally {
      setPaymentLoading(false)
    }
  }

  function handleStartNewPurchase() {
    navigate('/catalog')
  }

  return (
    <>
      <Header cartCount={completedOrder ? 0 : summary.total_items} />
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* ─── VISTA POST-PEDIDO: CONFIRMACIÓN ─── */}
      {completedOrder ? (
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ ...cardStyle, padding: 36 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, margin: '0 auto 16px',
              }}>
                ✓
              </div>

              {completedOrder.status === 'pendiente_validacion' && (
                <div style={{ ...cardStyle, textAlign: 'left', marginBottom: 24, background: 'rgba(79, 70, 229, 0.05)', borderLeft: '4px solid #4F46E5' }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, color: '#4F46E5', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    Tu pedido está en validación
                  </h2>
                  <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                    Nuestro equipo de administración y diseño está revisando la viabilidad técnica de tu estampación. Este proceso generalmente toma 24-48 horas. <br/><br/>
                    <strong>Una vez sea validado y aprobado, recibirás un email con la confirmación para proceder con el pago.</strong>
                  </p>
                </div>
              )}

              {completedOrder.status === 'aprobado' && (
                <form onSubmit={handleSandboxPayment} style={{ ...cardStyle, textAlign: 'left', marginBottom: 24 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, color: '#10B981', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    ¡Diseño Aprobado! Procede con el Pago
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    Tu diseño ha sido validado y aprobado. Usa 4242 4242 4242 4242 para aprobar o 4111 1111 1111 1111 para declinar. Los datos se tokenizan directamente en Wompi (nunca llegan a nuestro servidor).
                  </p>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <input className="checkout-input" inputMode="numeric" placeholder="Número de tarjeta" value={paymentForm.number} onChange={e => setPaymentForm({ ...paymentForm, number: e.target.value })} required />
                    <input className="checkout-input" placeholder="Nombre del titular" value={paymentForm.cardHolder} onChange={e => setPaymentForm({ ...paymentForm, cardHolder: e.target.value })} required />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <input className="checkout-input" inputMode="numeric" placeholder="MM" maxLength={2} value={paymentForm.expMonth} onChange={e => setPaymentForm({ ...paymentForm, expMonth: e.target.value })} required />
                      <input className="checkout-input" inputMode="numeric" placeholder="AAAA" maxLength={4} value={paymentForm.expYear} onChange={e => setPaymentForm({ ...paymentForm, expYear: e.target.value })} required />
                      <input className="checkout-input" inputMode="numeric" placeholder="CVC" maxLength={4} value={paymentForm.cvc} onChange={e => setPaymentForm({ ...paymentForm, cvc: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={paymentLoading}>
                      {paymentLoading ? 'Validando pago...' : 'Pagar en Sandbox'}
                    </button>
                    {paymentResult && <p style={{ margin: 0, color: paymentResult.status === 'APPROVED' ? '#059669' : '#b91c1c' }}>
                      Estado Wompi: <strong>{paymentResult.status}</strong>{paymentResult.status_message ? ` · ${paymentResult.status_message}` : ''}
                    </p>}
                  </div>
                </form>
              )}

              <span className="badge badge-pending" style={{ marginBottom: 12, display: 'inline-block', backgroundColor: 'var(--color-warning-bg, #FEF3C7)', color: 'var(--color-warning-text, #92400E)', border: '1px solid var(--color-warning-border, #FDE68A)', padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '600' }}>
                Estado: Pendiente de Validación
              </span>

              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--color-text)' }}>
                ¡Pedido Recibido para Validación!
              </h1>

              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                borderRadius: 8,
                padding: '16px',
                textAlign: 'left',
                margin: '16px 0 24px',
                color: 'var(--color-text)',
                fontSize: 14,
                lineHeight: 1.5,
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: '#1D4ED8' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  Información sobre tu pedido y diseño:
                </p>
                <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
                  Tu diseño y pedido <strong>#{completedOrder.order_number || completedOrder.order_id}</strong> han sido registrados con éxito. Nuestro equipo de administración y producción validará y analizará la viabilidad técnica de estampación del diseño. Una vez sea validado y aprobado por un administrador, recibirás la confirmación para proceder con el pago y la fabricación.
                </p>
              </div>

              <div style={{
                background: 'var(--color-bg-secondary, #F8FAFC)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '16px 20px',
                textAlign: 'left',
                marginBottom: 24,
                fontSize: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>N° de Orden:</span>
                  <span style={{ fontWeight: 700 }}>{completedOrder.order_number || completedOrder.order_id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Cliente:</span>
                  <strong>{completedOrder.customer_name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Correo:</span>
                  <span>{completedOrder.customer_email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 600 }}>Total:</span>
                  <strong style={{ fontSize: 16, color: 'var(--color-primary)' }}>{formatCOP(completedOrder.total)}</strong>
                </div>
              </div>

              {/* Botones de acción: Descargar Factura y Seguir Comprando */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {downloadingPdf ? 'Generando factura...' : 'Descargar Factura Personalizada (PDF)'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleStartNewPurchase}
                  style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                  Volver al catálogo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ─── FORMULARIO DE CHECKOUT ─── */}
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Finalizar pedido</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                Ingresa tus datos de contacto y entrega. Tu pedido entrará en revisión técnica de estampado y una vez aprobado por un administrador podrás proceder con el pago.
              </p>
            </div>

            {loading ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Cargando checkout...
              </div>
            ) : summary.total_items === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', maxWidth: 500, margin: '40px auto' }}>
                <p style={{ fontSize: 16, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                  Tu carrito está vacío. Agrega productos para finalizar tu compra.
                </p>
                <Link to="/catalog" className="btn btn-primary">
                  Explorar catálogo
                </Link>
              </div>
            ) : (
              <div className="checkout-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24, alignItems: 'start' }}>
                <form onSubmit={confirmCheckoutHandler} style={{ display: 'flex', flexDirection: 'column', gap: 16 }} noValidate>
                  <section style={cardStyle}>
                    <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Datos del cliente y facturación</h2>
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                      Estos datos se incluirán de manera personalizada en tu comprobante de compra y orden.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-name">Nombre completo</label>
                        <input
                          id="checkout-name"
                          className={`checkout-input ${fieldErrors.customerName || fieldErrors.customer_name ? 'input-error' : ''}`}
                          value={customerName}
                          onChange={e => {
                            setCustomerName(e.target.value)
                            if (fieldErrors.customerName || fieldErrors.customer_name) {
                              setFieldErrors(prev => ({ ...prev, customerName: null, customer_name: null }))
                            }
                          }}
                          placeholder="Ej. Juan Pérez"
                          required
                        />
                        {(fieldErrors.customerName || fieldErrors.customer_name) && (
                          <p className="checkout-error-text">{fieldErrors.customerName || fieldErrors.customer_name}</p>
                        )}
                      </div>

                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-email">Correo electrónico</label>
                        <input
                          id="checkout-email"
                          type="email"
                          className={`checkout-input ${fieldErrors.customerEmail || fieldErrors.customer_email ? 'input-error' : ''}`}
                          value={customerEmail}
                          onChange={e => {
                            setCustomerEmail(e.target.value)
                            if (fieldErrors.customerEmail || fieldErrors.customer_email) {
                              setFieldErrors(prev => ({ ...prev, customerEmail: null, customer_email: null }))
                            }
                          }}
                          placeholder="correo@ejemplo.com"
                          required
                        />
                        {(fieldErrors.customerEmail || fieldErrors.customer_email) && (
                          <p className="checkout-error-text">{fieldErrors.customerEmail || fieldErrors.customer_email}</p>
                        )}
                      </div>

                      <div>
                        <label className="checkout-field-label" htmlFor="checkout-phone">Teléfono / WhatsApp</label>
                        <input
                          id="checkout-phone"
                          type="tel"
                          className="checkout-input"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Ej. 3101234567"
                        />
                      </div>

                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-department">Departamento</label>
                        <select
                          id="checkout-department"
                          className={`checkout-input checkout-select ${fieldErrors.department ? 'input-error' : ''}`}
                          value={department}
                          onChange={handleDepartmentChange}
                          required
                        >
                          <option value="">Selecciona un departamento...</option>
                          {COLOMBIA_DEPARTAMENTOS.map(dep => (
                            <option key={dep.id} value={dep.nombre}>
                              {dep.nombre}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.department && <p className="checkout-error-text">{fieldErrors.department}</p>}
                      </div>

                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-city">Ciudad / Municipio</label>
                        <select
                          id="checkout-city"
                          className={`checkout-input checkout-select ${fieldErrors.city ? 'input-error' : ''}`}
                          value={city}
                          onChange={e => {
                            setCity(e.target.value)
                            if (fieldErrors.city) {
                              setFieldErrors(prev => ({ ...prev, city: null }))
                            }
                          }}
                          disabled={!department}
                          required
                        >
                          <option value="">
                            {department ? 'Selecciona una ciudad...' : 'Primero elige un departamento'}
                          </option>
                          {availableCities.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                        {fieldErrors.city && <p className="checkout-error-text">{fieldErrors.city}</p>}
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-address">Dirección de entrega</label>
                        <input
                          id="checkout-address"
                          className={`checkout-input ${fieldErrors.address ? 'input-error' : ''}`}
                          value={address}
                          onChange={e => {
                            setAddress(e.target.value)
                            if (fieldErrors.address) {
                              setFieldErrors(prev => ({ ...prev, address: null }))
                            }
                          }}
                          placeholder="Calle 123 # 45-67, Apto 201"
                          required
                        />
                        {fieldErrors.address && <p className="checkout-error-text">{fieldErrors.address}</p>}
                      </div>

                      <div>
                        <label className="checkout-field-label" htmlFor="checkout-postal">Código postal (opcional)</label>
                        <input
                          id="checkout-postal"
                          className="checkout-input"
                          value={postalCode}
                          onChange={e => setPostalCode(e.target.value)}
                          placeholder="Ej. 110111"
                        />
                      </div>

                      <div>
                        <label className="checkout-field-label" htmlFor="checkout-reference">Punto de referencia o notas</label>
                        <input
                          id="checkout-reference"
                          className="checkout-input"
                          value={reference}
                          onChange={e => setReference(e.target.value.slice(0, 100))}
                          placeholder="Ej. Casa esquinera portón blanco"
                          maxLength={100}
                        />
                        <p className="checkout-counter">{reference.length}/100</p>
                      </div>
                    </div>
                  </section>

                  {generalError && (
                    <div style={{
                      padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                      background: 'var(--color-error-light, #FEE2E2)',
                      color: 'var(--color-error, #EF4444)',
                    }}>
                      {generalError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link to="/cart" className="btn btn-outline" style={{ textDecoration: 'none' }}>
                      Volver al carrito
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={submitting || summary.total_items === 0}>
                      {submitting ? 'Validando y enviando pedido...' : 'Hacer pedido y solicitar validación'}
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

                  <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 8, background: '#FEF3C7', color: '#B45309', fontSize: 12, lineHeight: 1.4 }}>
                    <strong>Simulación de compra:</strong> Tu pedido se registrará con estado <em>Pendiente</em> y recibirás la factura descargable de inmediato.
                  </div>
                </aside>
              </div>
            )}
          </>
        )}
      </div>

              {/* ─── SECCIÓN DE ESTILOS CSS EN LÍNEA ─── */}
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
        .checkout-select {
          cursor: pointer;
        }
        .checkout-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light);
        }
        .checkout-input.input-error {
          border-color: var(--color-error, #EF4444);
        }
        .checkout-error-text {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--color-error, #EF4444);
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
