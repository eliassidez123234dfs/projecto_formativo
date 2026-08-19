import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import AdminLayout from '../components/AdminLayout'
import Spinner from '../components/Spinner'
import { fetchCloudinaryResources, deleteCloudinaryResources } from '../services/api'

const TABS = [
  { value: 'image', label: 'Imágenes' },
  { value: 'raw', label: 'Archivos (3D)' },
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
      subtitle="Gestiona las imágenes y archivos 3D almacenados en Cloudinary"
    >
      <div className="card">
        <div className="card-body">
          {/* Categorías y filtros rápidos */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center', borderBottom: '1px solid var(--color-gray-200, #e2e8f0)', paddingBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-gray-700)', marginRight: 4 }}>Categorías:</span>
            {TABS.map(t => (
              <button
                key={t.value}
                type="button"
                className={`btn btn-sm ${resourceType === t.value && !q ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => { setResourceType(t.value); setQ(''); }}
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              className={`btn btn-sm ${q === 'camisa' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setResourceType('image'); setQ(q === 'camisa' ? '' : 'camisa'); }}
            >
              👕 Camisas
            </button>
            <button
              type="button"
              className={`btn btn-sm ${q === 'tshirtify_designs' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setResourceType('image'); setQ(q === 'tshirtify_designs' ? '' : 'tshirtify_designs'); }}
            >
              🎨 Diseños 3D (/tshirtify_designs/)
            </button>
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
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 56 }}>Vista</th>
                    <th>Public ID</th>
                    <th>Dimensiones</th>
                    <th>Tamaño</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map(res => (
                    <tr key={res.public_id}>
                      <td>
                        {resourceType === 'image' ? (
                          <img src={res.thumbnail} alt={res.public_id} loading="lazy" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: 6, background: 'var(--color-bg-tertiary)', color: 'var(--color-text-muted)', fontSize: 10 }}>
                            <span aria-hidden="true" style={{ fontSize: 20 }}>📦</span>
                            {(res.format || '').toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td><code>{res.public_id}</code></td>
                      <td>{res.width}x{res.height}</td>
                      <td>{res.size_mb} MB · {res.format}</td>
                      <td>
                        <span className={`badge ${res.is_referenced ? 'badge-activo' : 'badge-inactivo'}`}>
                          {res.is_referenced ? 'En uso en BD' : 'Libre'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            <input type="checkbox" checked={selected.includes(res.public_id)} onChange={() => toggleSelect(res.public_id)} />
                            Seleccionar
                          </label>
                          <button className="btn btn-sm btn-ghost" type="button" style={{ color: 'var(--color-error)' }} onClick={() => handleDelete([res.public_id])} disabled={deleting}>
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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