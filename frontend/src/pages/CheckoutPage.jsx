import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { getCheckoutSummary, confirmCheckout, downloadOrderInvoicePdf } from '../services/api'
import { formatCOP } from '../utils/format'
import { useCart } from '../context/CartContext'
import { COLOMBIA_DEPARTAMENTOS } from '../data/colombiaData'

const cardStyle = {
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  background: 'var(--color-bg)',
  padding: 24,
  boxShadow: 'var(--shadow-sm)',
}

export default function CheckoutPage() {
  const { reloadCart } = useCart()
  const [summary, setSummary] = useState({ items: [], total_items: 0, total_amount: '0.00' })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [downloadingInvoice, setDownloadingInvoice] = useState(false)

  // Datos del formulario
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [department, setDepartment] = useState('')
  const [city, setCity] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [reference, setReference] = useState('')

  // Validaciones
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('success')

  // Estado posterior a la confirmación del pedido
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

  // Lista de ciudades dinámicas según el departamento seleccionado
  const availableCities = useMemo(() => {
    if (!department) return []
    const depObj = COLOMBIA_DEPARTAMENTOS.find(d => d.nombre === department)
    return depObj ? depObj.ciudades : []
  }, [department])

  // Validación de email real
  const validateEmail = (email) => {
    const trimmed = (email || '').trim()
    if (!trimmed) return 'El correo electrónico es obligatorio.'
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
    if (!emailRegex.test(trimmed)) {
      return 'Ingrese un correo con formato válido (ej. usuario@dominio.com).'
    }
    const domain = trimmed.split('@')[1].toLowerCase()
    const fakeDomains = ['test.com', 'ejemplo.com', 'example.com', 'correo.com', 'tempmail.com', 'mailinator.com', '123.com', 'fake.com']
    const tld = domain.split('.').pop()
    if (fakeDomains.includes(domain) || tld.length < 2) {
      return 'Por favor ingrese un correo electrónico real (no temporal ni de prueba).'
    }
    return ''
  }

  const handleDepartmentChange = (e) => {
    const val = e.target.value
    setDepartment(val)
    setCity('')
    if (errors.department) {
      setErrors(prev => ({ ...prev, department: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!customerName.trim()) {
      newErrors.customerName = 'El nombre completo es obligatorio.'
    } else if (customerName.trim().length < 3) {
      newErrors.customerName = 'Ingrese un nombre de al menos 3 caracteres.'
    }

    const emailErr = validateEmail(customerEmail)
    if (emailErr) {
      newErrors.customerEmail = emailErr
    }

    if (!address.trim()) {
      newErrors.address = 'La dirección de entrega es obligatoria.'
    }

    if (!department) {
      newErrors.department = 'Debe seleccionar un departamento.'
    }

    if (!city) {
      newErrors.city = 'Debe seleccionar una ciudad o municipio.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function confirmCheckoutHandler(e) {
    e.preventDefault()
    setMessage('')

    if (!validateForm()) {
      setMessage('Por favor revise los campos con error antes de confirmar el pedido.')
      setMessageType('error')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        phone: phone.trim(),
        address: address.trim(),
        department,
        city,
        postalCode: postalCode.trim(),
        reference: reference.trim(),
      }

      const data = await confirmCheckout(payload)
      
      // Guardar orden completada para el apartado post-compra
      setCompletedOrder({
        order_id: data.order_id,
        order_number: data.order_number || `ORD-${String(data.order_id).padStart(6, '0')}`,
        total: data.total,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        items_count: summary.total_items,
      })

      // Vaciar carrito
      await Promise.all([loadSummary(), reloadCart()])
    } catch (err) {
      const data = err?.response?.data || {}
      const errMsg = data.detail || data.customer_email || data.customer_name || 'No se pudo confirmar el checkout. Verifique los datos.'
      setMessage(errMsg)
      setMessageType('error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadInvoice = async () => {
    if (!completedOrder) return
    setDownloadingInvoice(true)
    try {
      await downloadOrderInvoicePdf(completedOrder.order_id, completedOrder.order_number)
    } catch (err) {
      console.error('Error descargando factura:', err)
      alert('Hubo un error al generar la factura. Intente nuevamente.')
    } finally {
      setDownloadingInvoice(false)
    }
  }

  return (
    <>
      <Header cartCount={summary.total_items} />
      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '4.5rem' }}>
        
        {/* VISTA 1: PANTALLA DE COMPRA COMPLETADA CON LOS DOS BOTONES OBLIGATORIOS */}
        {completedOrder ? (
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', ...cardStyle, padding: '40px 30px' }}>
            <div style={{
              width: 70, height: 70, borderRadius: '50%', background: 'rgba(34, 197, 94, 0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              color: '#16a34a', fontSize: 36
            }}>
              ✓
            </div>
            
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10 }}>
              ¡Pedido confirmado con éxito!
            </h1>
            
            <p style={{ color: 'var(--color-text-muted)', fontSize: 15, marginBottom: 24, lineHeight: 1.5 }}>
              Gracias por tu compra, <b>{completedOrder.customer_name}</b>.<br />
              Hemos registrado tu orden <b>#{completedOrder.order_number}</b> por un total de <b>{formatCOP(completedOrder.total)}</b>.
              Tu carrito ha sido procesado y vaciado correctamente.
            </p>

            <div style={{
              background: 'var(--color-bg-secondary, #f9fafb)', border: '1px solid var(--color-border)',
              borderRadius: 10, padding: 18, marginBottom: 28, textAlign: 'left', fontSize: 14
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>N° de Orden:</span>
                <span style={{ fontWeight: 700 }}>{completedOrder.order_number}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Correo del cliente:</span>
                <span style={{ fontWeight: 600 }}>{completedOrder.customer_email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total Facturado:</span>
                <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{formatCOP(completedOrder.total)}</span>
              </div>
            </div>

            {/* SECCIÓN DE LOS DOS BOTONES SOLICITADOS */}
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  fontSize: 15, fontWeight: 700, borderRadius: 8, cursor: 'pointer'
                }}
              >
                📄 {downloadingInvoice ? 'Generando factura...' : 'Descargar factura'}
              </button>

              <Link
                to="/catalog"
                className="btn btn-outline"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                  fontSize: 15, fontWeight: 700, borderRadius: 8, textDecoration: 'none'
                }}
              >
                🛍️ Volver al catálogo
              </Link>
            </div>
          </div>
        ) : (
          /* VISTA 2: FORMULARIO DE CHECKOUT Y RESUMEN */
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Finalizar compra</h1>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>
                Confirma tus datos de contacto y entrega en Colombia, y revisa el resumen de tu pedido.
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
                      Estos datos se usarán para la facturación y la entrega de tu pedido.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-name">Nombre completo</label>
                        <input
                          id="checkout-name"
                          className={`checkout-input ${errors.customerName ? 'input-error' : ''}`}
                          value={customerName}
                          onChange={e => {
                            setCustomerName(e.target.value)
                            if (errors.customerName) setErrors(prev => ({ ...prev, customerName: '' }))
                          }}
                          placeholder="Ej. Juan Pérez"
                          required
                        />
                        {errors.customerName && <p className="field-error-msg">{errors.customerName}</p>}
                      </div>

                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-email">Correo electrónico real</label>
                        <input
                          id="checkout-email"
                          type="email"
                          className={`checkout-input ${errors.customerEmail ? 'input-error' : ''}`}
                          value={customerEmail}
                          onChange={e => {
                            setCustomerEmail(e.target.value)
                            if (errors.customerEmail) setErrors(prev => ({ ...prev, customerEmail: '' }))
                          }}
                          placeholder="ejemplo@gmail.com"
                          required
                        />
                        {errors.customerEmail && <p className="field-error-msg">{errors.customerEmail}</p>}
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
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-address">Dirección de entrega</label>
                        <input
                          id="checkout-address"
                          className={`checkout-input ${errors.address ? 'input-error' : ''}`}
                          value={address}
                          onChange={e => {
                            setAddress(e.target.value)
                            if (errors.address) setErrors(prev => ({ ...prev, address: '' }))
                          }}
                          placeholder="Calle 123 # 45-67, Apto 201"
                          required
                        />
                        {errors.address && <p className="field-error-msg">{errors.address}</p>}
                      </div>

                      {/* SELECTOR DE DEPARTAMENTO DE COLOMBIA */}
                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-department">Departamento (Colombia)</label>
                        <select
                          id="checkout-department"
                          className={`checkout-input checkout-select ${errors.department ? 'input-error' : ''}`}
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
                        {errors.department && <p className="field-error-msg">{errors.department}</p>}
                      </div>

                      {/* SELECTOR DE CIUDAD O MUNICIPIO */}
                      <div>
                        <label className="checkout-field-label checkout-required" htmlFor="checkout-city">Ciudad / Municipio</label>
                        <select
                          id="checkout-city"
                          className={`checkout-input checkout-select ${errors.city ? 'input-error' : ''}`}
                          value={city}
                          onChange={e => {
                            setCity(e.target.value)
                            if (errors.city) setErrors(prev => ({ ...prev, city: '' }))
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
                        {errors.city && <p className="field-error-msg">{errors.city}</p>}
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

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link to="/cart" className="btn btn-outline" style={{ textDecoration: 'none' }}>
                      Volver al carrito
                    </Link>
                    <button type="submit" className="btn btn-primary" disabled={submitting || summary.total_items === 0}>
                      {submitting ? 'Validando y procesando pedido...' : 'Confirmar pedido'}
                    </button>
                  </div>
                </form>

                {/* ASIDE RESUMEN */}
                <aside style={{ ...cardStyle, position: 'sticky', top: 88 }}>
                  <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Resumen del pedido</h2>
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                    {summary.total_items} producto{summary.total_items !== 1 ? 's' : ''} en tu carrito
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16, maxHeight: 320, overflowY: 'auto' }}>
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
                    <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>{formatCOP(summary.total_amount)}</span>
                  </div>
                </aside>
              </div>
            )}

            {message && (
              <p style={{
                marginTop: 20, padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                background: messageType === 'error' ? 'var(--color-error-light, #fee2e2)' : 'var(--color-success-light, #dcfce7)',
                color: messageType === 'error' ? 'var(--color-error, #dc2626)' : 'var(--color-success, #16a34a)',
              }}>
                {message}
              </p>
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
        .checkout-select {
          cursor: pointer;
        }
        .checkout-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-light, rgba(220, 38, 38, 0.1));
        }
        .input-error {
          border-color: #dc2626 !important;
          background: #fff8f8;
        }
        .field-error-msg {
          color: #dc2626;
          font-size: 12px;
          margin: 4px 0 0;
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
