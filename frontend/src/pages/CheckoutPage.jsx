import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useCart } from '../context/CartContext'
import { getCheckoutSummary, confirmCheckout, downloadInvoicePdf } from '../services/api'
import { formatCOP } from '../utils/format'
import { getDepartments, getCitiesForDepartment } from '../data/colombiaDepartments'

const cardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  background: 'var(--color-bg)',
  padding: 24,
  boxShadow: 'var(--shadow-sm)',
}

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
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [department, setDepartment] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [reference, setReference] = useState('')

  const departments = getDepartments()
  const cities = getCitiesForDepartment(department)

  // Errores de validación por campo
  const [fieldErrors, setFieldErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  // Estado del pedido completado
  const [completedOrder, setCompletedOrder] = useState(null)

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

  // Validación en cliente antes de enviar
  function validateForm() {
    const errors = {}
    if (!customerName.trim()) {
      errors.customerName = 'El nombre completo es requerido.'
    } else if (customerName.trim().length < 3) {
      errors.customerName = 'El nombre debe tener al menos 3 caracteres.'
    }

    const emailRegex = /^[\w.-]+@[\w.-]+\.\w+$/
    if (!customerEmail.trim()) {
      errors.customerEmail = 'El correo electrónico es requerido.'
    } else if (!emailRegex.test(customerEmail.trim())) {
      errors.customerEmail = 'Ingresa un correo electrónico válido.'
    }

    if (!address.trim()) {
      errors.address = 'La dirección de entrega es requerida.'
    }

    if (!city.trim()) {
      errors.city = 'La ciudad es requerida.'
    }

    if (!department.trim()) {
      errors.department = 'El departamento es requerido.'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

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
        address: address.trim(),
        city: city.trim(),
        department: department.trim(),
        postal_code: postalCode.trim(),
        reference: reference.trim(),
      }

      const response = await confirmCheckout(payload)
      setCompletedOrder({
        order_id: response.order_id,
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
      setGeneralError(data.detail || 'Ocurrió un error al procesar el pedido. Verifica los datos.')
    } finally {
      setSubmitting(false)
    }
  }

  // Descarga del PDF de la factura personalizada
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
      link.setAttribute('download', `Factura_Orden_${completedOrder.order_id}.pdf`)
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

  function handleStartNewPurchase() {
    navigate('/catalog')
  }

  return (
    <>
      <Header cartCount={completedOrder ? 0 : summary.total_items} />
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        {/* Vista cuando el pedido fue confirmado con éxito */}
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

              <span className="badge badge-pending" style={{ marginBottom: 12, display: 'inline-block' }}>
                Estado: {completedOrder.status_display} (Prueba)
              </span>

              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--color-text)' }}>
                ¡Pedido Confirmado con Éxito!
              </h1>

              <p style={{ color: 'var(--color-text-muted)', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
                Tu orden <strong>#{completedOrder.order_id}</strong> ha sido enviada al panel de administración en estado pendiente.
                El stock de los productos comprados ha sido descontado automáticamente.
              </p>

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
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Finalizar compra</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                Modo de prueba demostrativo: confirma tus datos de contacto y entrega para generar tu orden y comprobante en PDF.
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
                          placeholder="Calle, carrera, número, barrio"
                          required
                        />
                        {fieldErrors.address && <p className="checkout-error-text">{fieldErrors.address}</p>}
                      </div>

                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-department">Departamento</label>
                        <select
                          id="checkout-department"
                          className={`checkout-input ${fieldErrors.department ? 'input-error' : ''}`}
                          value={department}
                          onChange={e => {
                            setDepartment(e.target.value)
                            setCity('')
                            if (fieldErrors.department) {
                              setFieldErrors(prev => ({ ...prev, department: null }))
                            }
                          }}
                          required
                        >
                          <option value="">Selecciona un departamento</option>
                          {departments.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        {fieldErrors.department && <p className="checkout-error-text">{fieldErrors.department}</p>}
                      </div>

                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-city">Ciudad</label>
                        <select
                          id="checkout-city"
                          className={`checkout-input ${fieldErrors.city ? 'input-error' : ''}`}
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
                          <option value="">{department ? 'Selecciona una ciudad' : 'Primero selecciona un departamento'}</option>
                          {cities.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {fieldErrors.city && <p className="checkout-error-text">{fieldErrors.city}</p>}
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
                        <label className="checkout-field-label" htmlFor="checkout-reference">Punto de referencia (opcional)</label>
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
                      {submitting ? 'Procesando pedido...' : 'Confirmar pedido y generar factura'}
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
        .checkout-input.input-error {
          border-color: var(--color-error, #EF4444);
        }
        .checkout-error-text {
          margin: 4px 0 0;
          font-size: 12px;
          color: var(--color-error, #EF4444);
          font-weight: 500;
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
