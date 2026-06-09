import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import MainLayout from '../components/MainLayout'

export default function AdminCart() {
  const navigate = useNavigate()
  const [carts, setCarts] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 20

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (!usuario || usuario.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  const loadCarts = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const h = token ? { Authorization: 'Bearer ' + token } : {}
      const res = await fetch(`/api/admin/carts/?page=${page}&page_size=${pageSize}`, { headers: h })
      if (!res.ok) { setCarts({ results: [], count: 0 }); return }
      const data = await res.json()
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
