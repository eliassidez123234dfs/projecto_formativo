import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAdminCarts } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'

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
    } catch { setCarts({ results: [], count: 0 }); setError('Error al cargar los carritos. Intenta de nuevo.') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { loadCarts() }, [loadCarts])

  const totalPages = Math.max(1, Math.ceil((carts.count || 0) / pageSize))

  return (
    <AdminLayout title="Carritos" subtitle="Todos los carritos del sistema">
      <div className="card">
        {loading ? (
          <Spinner text="Cargando carritos..." />
        ) : error ? (
          <div className="error-message"><p>{error}</p><button className="btn btn-sm btn-primary" onClick={loadCarts}>Reintentar</button></div>
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
