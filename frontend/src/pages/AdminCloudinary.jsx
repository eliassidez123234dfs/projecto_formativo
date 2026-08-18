import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import AdminLayout from '../components/AdminLayout'
import Spinner from '../components/Spinner'
import { fetchCloudinaryResources, deleteCloudinaryResources } from '../services/api'

const TABS = [
  { value: 'image', label: 'Imágenes' },
  { value: 'raw', label: 'Archivos (3D)' },
  { value: 'video', label: 'Videos' },
]

export default function AdminCloudinary() {
  const [resourceType, setResourceType] = useState('image')
  const [q, setQ] = useState('')
  const [perPage, setPerPage] = useState('12')
  const [resources, setResources] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)
  const pageCursorsRef = useRef({ 1: '' })
  const requestIdRef = useRef(0)

  const loadPage = useCallback(async (targetPage = 1) => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    setSelected([])

    try {
      const perPageNumber = Number(perPage) || 12
      const cursors = { ...pageCursorsRef.current }
      let startPage = targetPage

      while (startPage > 1 && cursors[startPage] === undefined) {
        startPage -= 1
      }
      if (cursors[startPage] === undefined) {
        startPage = 1
      }

      let response = null

      for (let page = startPage; page <= targetPage; page += 1) {
        const cursor = cursors[page] || ''
        response = await fetchCloudinaryResources({
          resource_type: resourceType,
          per_page: perPageNumber,
          q: q || undefined,
          next_cursor: cursor || undefined,
        })
        cursors[page + 1] = response.next_cursor || ''
      }

      if (requestId !== requestIdRef.current || !response) return

      pageCursorsRef.current = cursors
      setResources(response.resources || [])
      setTotalCount(Number(response.total_count || 0))
      setCurrentPage(targetPage)
      if (response.error) setError(response.error)
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setError(err?.response?.data?.detail || err.message || 'Error al cargar Cloudinary')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [resourceType, perPage, q])

  useEffect(() => {
    pageCursorsRef.current = { 1: '' }
    setCurrentPage(1)
    setTotalCount(0)
    loadPage(1)
  }, [loadPage])

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / (Number(perPage) || 12)) : 0

  const toggleSelect = (pid) => {
    setSelected(prev => prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid])
  }

  const refresh = () => {
    loadPage(currentPage)
  }

  const handleDelete = async (publicIds = selected) => {
    if (!publicIds.length) return
    const many = publicIds.length > 1
    if (!window.confirm(`¿Eliminar ${publicIds.length} recurso(s) de Cloudinary permanentemente?`)) return
    setDeleting(true)
    try {
      const res = await deleteCloudinaryResources(publicIds, resourceType)
      if (res.error) {
        toast.error(`Error: ${res.error}`)
      } else if (Array.isArray(res.deleted) && res.deleted.length) {
        toast.success(`Se eliminaron ${res.deleted.length} recurso(s) de Cloudinary`)
      } else {
        toast.warning('No se pudo eliminar ningún recurso')
      }
      refresh()
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'No se pudo eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const goToPage = (page) => {
    if (page < 1 || page === currentPage) return
    loadPage(page)
  }

  const getPageNumbers = () => {
    if (totalPages <= 10) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages = []
    pages.push(1)

    let start = Math.max(2, currentPage - 2)
    let end = Math.min(totalPages - 1, currentPage + 2)

    if (currentPage <= 4) {
      end = Math.min(totalPages - 1, 6)
    } else if (currentPage >= totalPages - 3) {
      start = Math.max(2, totalPages - 5)
    }

    if (start > 2) {
      pages.push('ellipsis-start')
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (end < totalPages - 1) {
      pages.push('ellipsis-end')
    }

    pages.push(totalPages)
    return pages
  }

  return (
    <AdminLayout
      title="Gestor Cloudinary"
      subtitle="Todos los recursos de Cloudinary: imágenes, archivos 3D y videos (no solo los de camisas)"
    >
      <div className="card">
        <div className="card-body">
          {/* Tabs de tipo de recurso */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {TABS.map(t => (
              <button
                key={t.value}
                className={`btn btn-sm ${resourceType === t.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setResourceType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Búsqueda + cantidad por página */}
          <form
            style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}
            onSubmit={e => { e.preventDefault(); refresh() }}
          >
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar por public_id..."
              style={{ padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', maxWidth: 320 }}
            />
            <select
              value={perPage}
              onChange={e => setPerPage(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', maxWidth: 160 }}
            >
              <option value="12">12 por página</option>
              <option value="24">24 por página</option>
              <option value="36">36 por página</option>
            </select>
            <button className="btn btn-primary" type="submit">Filtrar</button>
            {selected.length > 0 && (
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => handleDelete()}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : `Eliminar ${selected.length} seleccionado(s)`}
              </button>
            )}
          </form>

          {error && (
            <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(220,53,69,.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(220,53,69,.3)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <Spinner text="Cargando recursos de Cloudinary..." />
          ) : resources.length === 0 ? (
            <div className="empty-state"><p>No hay recursos que coincidan con la búsqueda.</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12 }}>
              {resources.map(res => (
                <div
                  key={res.public_id}
                  style={{
                    border: `1px solid ${res.is_referenced ? 'var(--color-success, #28a745)' : 'var(--color-gray-300)'}`,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: 'var(--color-white, #fff)',
                  }}
                >
                  <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', overflow: 'hidden' }}>
                    {resourceType === 'image' ? (
                      <img src={res.thumbnail} alt={res.public_id} loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 8 }}>
                        <div style={{ fontSize: 30 }}>{resourceType === 'video' ? '🎬' : '📦'}</div>
                        <div style={{ fontSize: 11 }}>{(res.format || '').toUpperCase()}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px', fontSize: 12 }}>
                    <span
                      className={res.is_referenced ? 'badge badge-activo' : 'badge badge-inactivo'}
                    >
                      {res.is_referenced ? 'En uso en BD' : 'Libre'}
                    </span>
                    <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 11, color: '#555', marginTop: 4 }}>{res.public_id}</div>
                    <div style={{ color: '#777' }}>
                      {res.width}x{res.height} · {res.size_mb} MB · {res.format}
                    </div>
                    <label style={{ display: 'block', marginTop: 6, cursor: 'pointer' }}>
                      <input type="checkbox" checked={selected.includes(res.public_id)} onChange={() => toggleSelect(res.public_id)} />
                      <span style={{ marginLeft: 6 }}>Seleccionar</span>
                    </label>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ color: 'var(--color-error)', marginTop: 4, width: '100%' }}
                      onClick={() => handleDelete([res.public_id])}
                      disabled={deleting}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación dinamicamente calculada y bidireccional */}
          {totalPages > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => goToPage(currentPage - 1)}
                disabled={loading || currentPage === 1}
              >
                Anterior
              </button>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {getPageNumbers().map(p => {
                  if (typeof p === 'string') {
                    return (
                      <span key={p} style={{ padding: '0 4px', color: 'var(--color-gray-500)', fontSize: 14 }}>
                        ...
                      </span>
                    )
                  }
                  return (
                    <button
                      key={p}
                      className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => goToPage(p)}
                      disabled={loading}
                      aria-current={p === currentPage ? 'page' : undefined}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>

              <button
                className="btn btn-sm btn-secondary"
                onClick={() => goToPage(currentPage + 1)}
                disabled={loading || currentPage === totalPages}
              >
                Siguiente
              </button>

              <span className="pagination-info" style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--color-gray-600)' }}>
                {resources.length} recursos mostrados · {totalCount} totales · página {currentPage} de {totalPages}
              </span>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}