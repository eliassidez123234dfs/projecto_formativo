import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchAdminOrders } from '../services/api'
import MainLayout from '../components/MainLayout'
import { getCurrentUser } from '../services/authService'

const STATUS_STYLES = {
  pendiente: { bg: '#fef3c7', color: '#92400e', label: 'Pendiente' },
  pagado: { bg: '#dbeafe', color: '#1e40af', label: 'Pagado' },
  enviado: { bg: '#e0e7ff', color: '#3730a3', label: 'Enviado' },
  entregado: { bg: '#d1fae5', color: '#065f46', label: 'Entregado' },
  cancelado: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelado' },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || { bg: '#f3f4f6', color: '#6b7280', label: status }
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12,
      fontWeight: 600, background: style.bg, color: style.color,
    }}>
      {style.label}
    </span>
  )
}

// Admin orders list with status badges, pagination, and detail links
export default function AdminOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    const usuario = getCurrentUser()
    if (!usuario || usuario.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminOrders(page, pageSize)
      setOrders(data)
    } catch { setOrders({ results: [], count: 0 }) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { loadOrders() }, [loadOrders])

  const totalPages = Math.max(1, Math.ceil((orders.count || 0) / pageSize))

  return (
    <MainLayout title="Pedidos" subtitle="Gestión de pedidos del sistema">
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Cargando pedidos...</p></div>
        ) : !orders.results || orders.results.length === 0 ? (
          <div className="empty-state"><p>No hay pedidos registrados.</p></div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Fecha</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.results.map(order => (
                  <tr key={order.id}>
                    <td><code>#{order.id}</code></td>
                    <td>{order.customer_name || '—'}</td>
                    <td><StatusBadge status={order.status} /></td>
                    <td>${Number(order.total).toFixed(2)}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/admin-orders/${order.id}`} className="btn btn-sm btn-secondary">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                ← Anterior
              </button>
              <span className="pagination-info">Página {page} de {totalPages} ({orders.count} pedidos)</span>
              <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}