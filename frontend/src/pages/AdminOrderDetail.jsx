import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchAdminOrderDetail, updateOrderStatus, reprocessOrder, generateInvoice, fetchOrderInvoice } from '../services/api'
import MainLayout from '../components/MainLayout'

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const STATUS_STYLES = {
  pendiente: { bg: '#fef3c7', color: '#92400e' },
  pagado: { bg: '#dbeafe', color: '#1e40af' },
  enviado: { bg: '#e0e7ff', color: '#3730a3' },
  entregado: { bg: '#d1fae5', color: '#065f46' },
  cancelado: { bg: '#fee2e2', color: '#991b1b' },
}

export default function AdminOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invoice, setInvoice] = useState(null)
  const [generatingInvoice, setGeneratingInvoice] = useState(false)

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (!usuario || usuario.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await fetchAdminOrderDetail(id)
        if (mounted) setOrder(data)
      } catch { if (mounted) setOrder(null) }
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [id])

  useEffect(() => {
    if (!order?.id) return
    let mounted = true
    async function loadInvoice() {
      try {
        const result = await fetchOrderInvoice(order.id)
        if (mounted && result.length > 0) setInvoice(result[0])
      } catch { /* no invoice */ }
    }
    loadInvoice()
    return () => { mounted = false }
  }, [order?.id])

  const handleGenerateInvoice = async () => {
    if (!order?.id) return
    setGeneratingInvoice(true)
    try {
      const result = await generateInvoice(order.id)
      setInvoice(result)
      toast.success('Factura generada correctamente.')
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al generar factura'
      toast.error(msg)
    } finally {
      setGeneratingInvoice(false)
    }
  }

  const canEditStatus = order && order.status !== 'pagado' && order.status !== 'cancelado'

  const handleStatusChange = async (newStatus) => {
    setSaving(true)
    try {
      const updated = await updateOrderStatus(id, newStatus)
      setOrder(prev => ({ ...prev, ...updated }))
      toast.success(`Estado cambiado a "${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}"`)
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al actualizar estado'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleReprocess = async () => {
    setSaving(true)
    try {
      const updated = await reprocessOrder(id)
      setOrder(prev => ({ ...prev, ...updated }))
      toast.success('Pedido reprocesado. Ahora está Pendiente.')
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al reprocesar pedido'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <MainLayout><div className="card"><div className="empty-state"><p>Cargando...</p></div></div></MainLayout>
  if (!order) return <MainLayout><div className="card"><div className="empty-state"><p>Pedido no encontrado.</p></div></div></MainLayout>

  const statusStyle = STATUS_STYLES[order.status] || { bg: '#f3f4f6', color: '#6b7280' }

  return (
    <MainLayout
      title={`Pedido #${order.id}`}
      subtitle={order.customer_name || 'Sin nombre'}
    >
      <div style={{ marginBottom: 16 }}>
        <Link to="/admin-orders" className="btn btn-sm btn-ghost">← Volver a pedidos</Link>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 32, fontSize: 14, flexWrap: 'wrap' }}>
          <div>
            <strong>Cliente:</strong>{' '}
            {order.customer_name || '—'}
          </div>
          <div>
            <strong>Email:</strong>{' '}
            {order.customer_email || '—'}
          </div>
          <div>
            <strong>Total:</strong>{' '}
            ${Number(order.total).toFixed(2)}
          </div>
          <div>
            <strong>Fecha:</strong>{' '}
            {new Date(order.created_at).toLocaleDateString()}
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Estado actual:</strong>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 999, fontSize: 13,
              fontWeight: 600, background: statusStyle.bg, color: statusStyle.color,
            }}>
              {STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {canEditStatus && (
              <>
                <strong style={{ fontSize: 13 }}>Cambiar a:</strong>
                <select
                  value=""
                  onChange={(e) => e.target.value && handleStatusChange(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
                    fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </>
            )}

            {order.status === 'cancelado' && (
              <button
                onClick={handleReprocess}
                disabled={saving}
                className="btn btn-primary"
                style={{ background: '#059669', fontSize: 13 }}
              >
                {saving ? 'Procesando...' : 'Procesar nuevamente'}
              </button>
            )}

            {order.status === 'pagado' && !invoice && (
              <button
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
                className="btn btn-primary"
                style={{ background: '#2563eb', fontSize: 13 }}
              >
                {generatingInvoice ? 'Generando...' : 'Generar Factura'}
              </button>
            )}

            {invoice && (
              <span style={{
                display: 'inline-block', padding: '4px 14px', borderRadius: 999, fontSize: 13,
                fontWeight: 600, background: '#d1fae5', color: '#065f46',
              }}>
                Factura: {invoice.invoice_number}
              </span>
            )}
          </div>
        </div>

        {order.status === 'pagado' && (
          <div style={{ padding: '0 24px 16px', fontSize: 13, color: '#dc2626' }}>
            Los pedidos pagados no pueden modificar su estado.
          </div>
        )}
        {order.status === 'cancelado' && (
          <div style={{ padding: '0 24px 16px', fontSize: 13, color: '#dc2626' }}>
            Pedido cancelado. Use "Procesar nuevamente" para reactivarlo.
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, fontSize: 14 }}>
          Productos
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Variante</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#999' }}>Sin productos</td></tr>
            ) : order.items?.map(item => (
              <tr key={item.id}>
                <td><strong>{item.product_name}</strong></td>
                <td>
                  <span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 4, fontSize: 13, color: '#374151' }}>
                    {item.variant_label}
                  </span>
                </td>
                <td>{item.quantity}</td>
                <td>${Number(item.unit_price).toFixed(2)}</td>
                <td style={{ fontWeight: 600 }}>${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </MainLayout>
  )
}