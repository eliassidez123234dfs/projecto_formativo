import AdminLayout from '../components/AdminLayout'
import ErrorState from '../components/ErrorState'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import formatError from '../utils/formatError'
import toast from 'react-hot-toast'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAdminOrders, updateAdminOrderStatus, approveAdminOrder, downloadAdminOrderInvoicePdf } from '../services/api'
import { formatCOP } from '../utils/format'
import { useCallback, useEffect, useState } from 'react'

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  produccion: 'Producción (Aceptado)',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  // Alias de compatibilidad
  pending: 'Pendiente',
  processing: 'Producción',
  completed: 'Entregado',
}

const STATUS_BADGE = {
  pendiente: 'badge-pending',
  pending: 'badge-pending',
  pagado: 'badge-approved',
  paid: 'badge-approved',
  produccion: 'badge-active',
  processing: 'badge-active',
  enviado: 'badge-active',
  entregado: 'badge-active',
  completed: 'badge-active',
  cancelado: 'badge-inactive',
  cancelled: 'badge-inactive',
}

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [updatingId, setUpdatingId] = useState(null)
  const pageSize = 20
  const statusFilter = searchParams.get('status') || ''

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      const data = await fetchAdminOrders(page, pageSize, filters)
      setOrders(data)
      setError(null)
    } catch (err) { setOrders({ results: [], count: 0 }); setError(err) }
    finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { loadOrders() }, [loadOrders])

  const totalPages = Math.max(1, Math.ceil((orders.count || 0) / pageSize))

  const handleStatusFilter = (status) => {
    const params = new URLSearchParams(searchParams)
    if (status) params.set('status', status)
    else params.delete('status')
    setSearchParams(params)
    setPage(1)
  }

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingId(orderId)
    try {
      await updateAdminOrderStatus(orderId, newStatus)
      toast.success(`Orden #${orderId} actualizada a "${STATUS_LABELS[newStatus] || newStatus}"`)
      setOrders(prev => ({
        ...prev,
        results: prev.results.map(o => o.id === orderId ? { ...o, status: newStatus } : o),
      }))
    } catch (err) {
      toast.error(formatError(err, 'No se pudo actualizar el estado de la orden'))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleApproveOrder = async (orderId) => {
    setUpdatingId(orderId)
    try {
      const res = await approveAdminOrder(orderId)
      toast.success(res.message || `Estampación de orden #${orderId} aceptada y notificación enviada por correo.`)
      setOrders(prev => ({
        ...prev,
        results: prev.results.map(o => o.id === orderId ? { ...o, status: 'produccion' } : o),
      }))
    } catch (err) {
      toast.error(formatError(err, 'Error al aceptar la estampación del diseño.'))
    } finally {
      setUpdatingId(null)
    }
  }

  const statCards = [
    { value: orders.count ?? '—', label: 'Total Órdenes Registradas', color: 'primary' },
  ]

  const SELECTABLE_STATUSES = [
    { val: 'pendiente', label: 'Pendiente' },
    { val: 'pagado', label: 'Pagado' },
    { val: 'produccion', label: 'Producción' },
    { val: 'enviado', label: 'Enviado' },
    { val: 'entregado', label: 'Entregado' },
    { val: 'cancelado', label: 'Cancelado' },
  ]

  return (
    <AdminLayout title="Órdenes" subtitle="Administra, valida estampaciones y actualiza todas las órdenes de compra">
      <div className="admin-stats">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card-body">
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['', 'pendiente', 'pagado', 'produccion', 'enviado', 'entregado', 'cancelado'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleStatusFilter(s)}
              >
                {s ? STATUS_LABELS[s] || s : 'Todas'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner text="Cargando órdenes..." />
        ) : error ? (
          <ErrorState error={error} module="órdenes" onRetry={loadOrders} />
        ) : !orders.results || orders.results.length === 0 ? (
          <div className="empty-state"><p>No hay órdenes registradas.</p></div>
        ) : (
          <>
            <div className="card-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Estado Actual</th>
                    <th>Modificar Estado</th>
                    <th>Total</th>
                    <th>Items</th>
                    <th>Fecha</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.results.map(order => {
                    const isPending = order.status === 'pendiente' || order.status === 'pending'
                    return (
                      <tr key={order.id}>
                        <td><code>#{order.id}</code></td>
                        <td><strong>{order.customer_name || order.user_name || '—'}</strong></td>
                        <td>{order.customer_email || '—'}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[order.status] || 'badge-pending'}`}>
                            {STATUS_LABELS[order.status] || order.status}
                          </span>
                        </td>
                        <td>
                          <select
                            className="admin-select-status"
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={(e) => handleStatusChange(order.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              fontSize: 13,
                              border: '1px solid var(--color-border)',
                              background: 'var(--color-bg)',
                              cursor: updatingId === order.id ? 'wait' : 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            {SELECTABLE_STATUSES.map(opt => (
                              <option key={opt.val} value={opt.val}>{opt.label}</option>
                            ))}
                          </select>
                        </td>
                        <td><strong>{formatCOP(order.total)}</strong></td>
                        <td>{order.items?.length || 0}</td>
                        <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            {isPending && (
                              <button
                                type="button"
                                className="btn btn-sm btn-primary"
                                disabled={updatingId === order.id}
                                onClick={() => handleApproveOrder(order.id)}
                                title="Aceptar estampación y enviar email de notificación al cliente"
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                ✓ Aceptar Diseño
                              </button>
                            )}
                            <Link to={`/admin-orders/${order.id}`} className="btn btn-sm btn-secondary">
                              Ver detalle
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              title="Descargar Factura PDF"
                              onClick={() => downloadAdminOrderInvoicePdf(order.id, order.order_number)}
                            >
                              📄 Factura
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} count={orders.count} label="órdenes" onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
