import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import InfoModal, { formatChecklist } from './InfoModal'
import Pagination from './Pagination'
import Spinner from './Spinner'
import ErrorState from './ErrorState'
import { formatCOP } from '../utils/format'

async function safeJson(res) {
  try { return await res.json() } catch { return null }
}

function useProducts(refreshKey) {
  const [data, setData] = useState({ results: [], count: 0 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      const params = new URLSearchParams({ page, page_size: 20 })
      if (q) params.set('search', q)
      try {
        const res = await fetch(`/api/products/?${params.toString()}`)
        if (!res.ok) {
          if (mounted) {
            setData({ results: [], count: 0 })
            setError({ message: 'Error al cargar los productos.', status: res.status })
          }
          return
        }
        const json = await res.json()
        if (!mounted) return
        setData(json)
      } catch (err) {
        if (mounted) setError({ message: 'Error al cargar los productos.', status: err?.status || null })
      }
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [page, q, refreshKey])

  return { data, loading, page, setPage, q, setQ, error }
}

async function safeChecklist(productId, onResult) {
  const res = await fetch(`/api/products/${productId}/checklist/`)
  const data = await safeJson(res)
  if (!data) return onResult({ error: 'Error al cargar el checklist' })
  onResult({ checklist: formatChecklist(data), ready: data.ready_to_publish })
}

export default function ProductList({ refreshKey, onEdit, onToggle }) {
  const { data, loading, page, setPage, q, setQ, error } = useProducts(refreshKey)
  const [publishing, setPublishing] = useState(null)
  const [modal, setModal] = useState(null)
  const [checklistModal, setChecklistModal] = useState(null)
  const totalPages = Math.max(1, Math.ceil((data.count || 0) / 20))

  function handlePublish(productId) {
    if (!confirm('¿Publicar este producto? Se activará y aprobará automáticamente.')) return
    setPublishing(productId)
    fetch(`/api/products/${productId}/publish/`, { method: 'POST' })
      .then(async res => {
        const d = await safeJson(res)
        if (!res.ok) {
          setModal({
            type: 'error',
            title: 'No se pudo publicar',
            message: d?.detail || 'Error al publicar el producto',
            checklist: d?.checklist ? formatChecklist(d.checklist) : null,
          })
          return
        }
        setModal({ type: 'success', title: '', message: 'Producto publicado exitosamente' })
        setTimeout(() => window.location.reload(), 1200)
      })
      .catch(e => setModal({ type: 'error', title: 'Error de red', message: e.message }))
      .finally(() => setPublishing(null))
  }

  return (
    <>
      {modal && <InfoModal type={modal.type} title={modal.title} message={modal.message} checklist={modal.checklist} onClose={() => setModal(null)} />}
      {checklistModal?.checklist && <InfoModal type="info" title="Checklist del producto" message="" checklist={checklistModal.checklist} onClose={() => setChecklistModal(null)} />}
      {checklistModal?.error && <InfoModal type="error" title="Error" message={checklistModal.error} onClose={() => setChecklistModal(null)} />}

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <div className="search-input">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            placeholder="Buscar productos por nombre..."
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
          />
        </div>
      </div>

      {loading ? (
        <Spinner text="Cargando productos..." />
      ) : error ? (
        <ErrorState error={error} module="gestión de productos" onRetry={() => setPage(1)} />
      ) : data.results.length === 0 ? (
        <div className="empty-state"><p>No se encontraron productos.</p></div>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Foto</th>
                <th>ID</th>
                <th>Nombre</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Imágenes</th>
                <th>Variantes</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map(p => (
                <tr key={p.id}>
                  <td>
                    {p.main_image ? (
                      <img src={p.main_image} alt={p.name} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 6, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/><line x1="12" y1="12" x2="12" y2="12.01"/></svg>
                    </span>
                    )}
                  </td>
                  <td><code>{p.id}</code></td>
                  <td><strong>{p.name}</strong></td>
                  <td>{formatCOP(p.base_price ?? 0)}</td>
                  <td>
                    <span className={`badge ${(p.total_stock ?? 0) > 0 ? 'badge-active' : 'badge-inactive'}`}>
                      {p.total_stock ?? 0}
                    </span>
                  </td>
                  <td>{p.images_count || 0}</td>
                  <td>{p.variants_count || 0}</td>
                  <td>
                    <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                      {p.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                    <span className={`badge ${p.is_approved ? 'badge-approved' : 'badge-pending'}`}>
                      {p.is_approved ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Link to={`/admin-products/detail/${p.id}`} className="btn btn-sm btn-secondary">
                        Detalle
                      </Link>
                      <button className="btn btn-sm btn-ghost" type="button" onClick={() => onEdit?.(p.id)}>
                        Editar
                      </button>
                      <button className="btn btn-sm btn-ghost" type="button" onClick={() => { if (confirm(`¿${p.is_active ? 'Desactivar' : 'Activar'} el producto "${p.name}"?`)) onToggle?.(p.id) }}>
                        {p.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                      <button className="btn btn-sm btn-ghost" type="button" onClick={() => safeChecklist(p.id, setChecklistModal)}>
                        Checklist
                      </button>
                      {!p.is_approved && (
                        <button
                          className="btn btn-sm btn-primary"
                          type="button"
                          disabled={publishing === p.id}
                          onClick={() => handlePublish(p.id)}
                        >
                          {publishing === p.id ? '...' : 'Publicar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination page={page} totalPages={totalPages} count={data.count} label="productos" onPageChange={setPage} />
        </>
      )}
    </>
  )
}
