import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchAdminCarts } from '../services/api'
import MainLayout from '../components/MainLayout'
import { getCurrentUser } from '../services/authService'

const STATUS_STYLES = {
  pendiente: { bg: '#fef3c7', color: '#92400e' },
  pagado: { bg: '#dbeafe', color: '#1e40af' },
  enviado: { bg: '#e0e7ff', color: '#3730a3' },
  entregado: { bg: '#d1fae5', color: '#065f46' },
  cancelado: { bg: '#fee2e2', color: '#991b1b' },
}

// Admin cart listing with user info, item counts, and status display
export default function AdminCart() {
  const navigate = useNavigate()
  const [carts, setCarts] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    const usuario = getCurrentUser()
    if (!usuario || usuario.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  const loadCarts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminCarts(page, pageSize)
      setCarts(data)
    } catch { setCarts({ results: [], count: 0 }) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { loadCarts() }, [loadCarts])

  const totalPages = Math.max(1, Math.ceil((carts.count || 0) / pageSize))

  return (
    <MainLayout title="Carritos" subtitle="Todos los carritos del sistema">
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Cargando carritos...</p></div>
        ) : !carts.results || carts.results.length === 0 ? (
          <div className="empty-state"><p>No hay carritos registrados.</p></div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Creado</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {carts.results.map(cart => (
                  <tr key={cart.id}>
                    <td><code>{cart.id}</code></td>
                    <td>{cart.user_name}</td>
                    <td>{cart.items_count}</td>
                    <td>${Number(cart.total_amount).toFixed(2)}</td>
                    <td>{new Date(cart.created_at).toLocaleDateString()}</td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: 12,
                        fontWeight: 600, background: (STATUS_STYLES[cart.order_status] || { bg: '#fef3c7' }).bg,
                        color: (STATUS_STYLES[cart.order_status] || { color: '#92400e' }).color,
                      }}>
                        {cart.order_status_display}
                      </span>
                    </td>
                    <td>
                      <Link to={`/admin-cart/${cart.id}`} className="btn btn-sm btn-secondary">
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
              <span className="pagination-info">Página {page} de {totalPages} ({carts.count} carritos)</span>
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
