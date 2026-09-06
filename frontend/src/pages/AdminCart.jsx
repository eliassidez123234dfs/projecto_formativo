import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminCarts } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'
import { formatCOP } from '../utils/format'

export default function AdminCart() {
  const [carts, setCarts] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const loadCarts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchAdminCarts(page, pageSize)
      setCarts(data)
      setError(null)
    } catch (err) { setCarts({ results: [], count: 0 }); setError(err) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCarts();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCarts])

  const totalPages = Math.max(1, Math.ceil((carts.count || 0) / pageSize))

  return (
    <AdminLayout title="Carritos" subtitle="Carritos de usuarios registrados">
      <div className="card">
        {loading ? (
          <Spinner text="Cargando carritos..." />
        ) : error ? (
          <ErrorState error={error} module="carritos" onRetry={loadCarts} />
        ) : !carts.results || carts.results.length === 0 ? (
          <div className="empty-state"><p>No hay carritos de usuarios registrados.</p></div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Usuario Registrado</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Creado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {carts.results.map(cart => (
                  <tr key={cart.id}>
                    <td><code>{cart.id}</code></td>
                    <td>{cart.user_name}</td>
                    <td>{cart.items_count}</td>
                    <td>{formatCOP(cart.total_amount)}</td>
                    <td>{new Date(cart.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/admin-cart/${cart.id}`} className="btn btn-sm btn-secondary">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={carts.count} label="carritos" onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
