import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchAdminOrderDetail, updateAdminOrderStatus } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'
import { formatCOP } from '../utils/format'
import toast from 'react-hot-toast'


const STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const STATUS_BADGE = {
  pending: 'badge-pending',
  paid: 'badge-approved',
  processing: 'badge-active',
  completed: 'badge-active',
  cancelled: 'badge-inactive',
}

function DetailCard({ title, children, fullWidth }) {
  return (
    <div className="card" style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <div className="card-header"><h3>{title}</h3></div>
      <div className="card-body" style={{ padding: '20px' }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row" style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--color-border-light)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export default function AdminOrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState(null)

  const loadOrder = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminOrderDetail(id)
      setOrder(data)
    } catch (err) { setError(err) }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadOrder() }, [loadOrder])

  const handleStatusChange = async (newStatus) => {
    if (!order || newStatus === order.status) return
    setUpdating(true)
    try {
      await updateAdminOrderStatus(order.id, newStatus)
      setOrder(prev => ({ ...prev, status: newStatus }))
      toast.success(`Estado de la orden actualizado a "${STATUS_LABELS[newStatus] || newStatus}"`)
    } catch (err) {
      toast.error(err?.response?.data?.status || 'No se pudo actualizar el estado')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <AdminLayout><Spinner text="Cargando orden..." /></AdminLayout>
  if (error) return <AdminLayout><ErrorState error={error} module="detalle de orden" onRetry={loadOrder} /></AdminLayout>
  if (!order) return <AdminLayout><div className="card"><div className="empty-state"><p>Orden no encontrada.</p></div></div></AdminLayout>

  return (
    <AdminLayout title={`Orden #${order.id}`} subtitle={order.customer_name || order.user_name}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Link to="/admin-orders" className="btn btn-sm btn-ghost">← Volver a órdenes</Link>
        <a
          href={`/api/checkout/orders/${order.id}/invoice-pdf/`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-outline"
          download
        >
          Descargar Factura (PDF)
        </a>
      </div>

      <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        <DetailCard title="Información de la Orden">
          <InfoRow label="ID" value={<code>#{order.id}</code>} />
          <InfoRow label="Estado Actual" value={
            <span className={`badge ${STATUS_BADGE[order.status] || 'badge-pending'}`}>
              {STATUS_LABELS[order.status] || order.status}
            </span>
          } />
          <InfoRow label="Cambiar Estado" value={
            <select
              value={order.status}
              disabled={updating}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
                cursor: updating ? 'wait' : 'pointer',
              }}
            >
              {Object.entries(STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          } />
          <InfoRow label="Total" value={formatCOP(order.total)} />
          <InfoRow label="Creada" value={order.created_at ? new Date(order.created_at).toLocaleString() : '—'} />
          <InfoRow label="Actualizada" value={order.updated_at ? new Date(order.updated_at).toLocaleString() : '—'} />
        </DetailCard>


        <DetailCard title="Cliente">
          <InfoRow label="Nombre" value={order.customer_name || order.user_name || '—'} />
          <InfoRow label="Email" value={order.customer_email || '—'} />
          <InfoRow label="Usuario ID" value={order.user ? <code>{order.user}</code> : 'Invitado'} />
        </DetailCard>

        {order.notes && (
          <DetailCard title="Notas">
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap' }}>{order.notes}</p>
          </DetailCard>
        )}

        <DetailCard title="Items" fullWidth>
          {(!order.items || order.items.length === 0) ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Sin items.</p>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Variante</th>
                  <th>Cantidad</th>
                  <th>Precio Unit.</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 6, background: '#eee' }} />
                        )}
                        <strong>{item.product_name}</strong>
                      </div>
                    </td>
                    <td>
                      <span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 4, fontSize: 13 }}>
                        {item.variant_size} / {item.variant_color}
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                    <td>{formatCOP(item.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </DetailCard>
      </div>
    </AdminLayout>
  )
}
