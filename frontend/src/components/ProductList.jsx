import { useEffect, useState } from 'react'

function useProducts(refreshKey) {
  const [data, setData] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      const params = new URLSearchParams({ page, page_size: 20 })
      if (q) params.set('search', q)
      const res = await fetch(`/api/products/?${params.toString()}`)
      const json = await res.json()
      if (!mounted) return
      setData(json)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [page, q, refreshKey])

  return { data, loading, page, setPage, q, setQ }
}

export default function ProductList({ refreshKey, onEdit, onToggle }) {
  const { data, loading, page, setPage, q, setQ } = useProducts(refreshKey)

  return (
    <div className="product-list">
      <div className="toolbar">
        <input type="search" placeholder="Buscar por nombre" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {loading ? (
        <p>Cargando productos...</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Imágenes</th>
                <th>Variantes</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.base_price}</td>
                  <td>{p.images_count}</td>
                  <td>{p.variants_count}</td>
                  <td>{p.is_active ? 'Activo' : 'Inactivo'} / {p.is_approved ? 'Aprobado' : 'Pendiente'}</td>
                  <td>
                    <a className="btn btn-sm" href={`/admin-products/detail/${p.id}`}>Detalle</a>
                    <button className="btn btn-sm" type="button" onClick={() => onEdit?.(p.id)}>Editar</button>
                    <button className="btn btn-sm btn-secondary" type="button" onClick={() => onToggle?.(p.id)}>{p.is_active ? 'Desactivar' : 'Activar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
            <span> Página {page} </span>
            <button disabled={data.results.length === 0} onClick={() => setPage(page + 1)}>Siguiente</button>
          </div>
        </>
      )}
    </div>
  )
}
