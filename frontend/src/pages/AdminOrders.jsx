import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAdminOrders } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'
import { formatCOP } from '../utils/format'

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

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
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

  const statCards = [
    { value: orders.count ?? '—', label: 'Total Órdenes', color: 'primary' },
  ]

  return (
    <AdminLayout title="Órdenes" subtitle="Administra las órdenes de compra">
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
            {['', 'pending', 'paid', 'processing', 'completed', 'cancelled'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => handleStatusFilter(s)}
              >
                {s ? STATUS_LABELS[s] : 'Todas'}
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
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Items</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.results.map(order => (
                  <tr key={order.id}>
                    <td><code>{order.id}</code></td>
                    <td><strong>{order.customer_name || order.user_name || '—'}</strong></td>
                    <td>{order.customer_email || '—'}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[order.status] || 'badge-pending'}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td>{formatCOP(order.total)}</td>
                    <td>{order.items?.length || 0}</td>
                    <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <Link to={`/admin-orders/${order.id}`} className="btn btn-sm btn-secondary">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={orders.count} label="órdenes" onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
