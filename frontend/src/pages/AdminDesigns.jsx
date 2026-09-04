import { useState, useEffect, useCallback } from 'react'
import { fetchDesigns, deleteDesign } from '../services/api'
import MainLayout from '../components/MainLayout'
import toast from 'react-hot-toast'

export const AdminDesigns = () => {
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  const load = useCallback(async () => {
    try {
      const data = await fetchDesigns({ page, page_size: pageSize })
      setDesigns(data?.results || data || [])
      setTotal(data?.total || 0)
    } catch { toast.error('Error al cargar diseños') }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este diseño 3D?')) return
    try { await deleteDesign(id); toast.success('Diseño eliminado'); load() }
    catch { toast.error('Error al eliminar') }
  }

  const totalPages = Math.ceil(total / pageSize)

  if (loading) return <div className="loading">Cargando diseños 3D...</div>

  return (
    <MainLayout title="Diseños 3D" subtitle="Administra los diseños 3D creados por los usuarios">
    <div className="admin-designs">
      <div className="content-header-inline">
        <h2 style={{ margin: 0, fontSize: 18 }}>Diseños 3D de Usuarios</h2>
        <span className="item-count">{total} diseños</span>
      </div>

      {designs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>🎨</p>
          <p>No hay diseños guardados por usuarios</p>
        </div>
      ) : (
        <div className="designs-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}>
          {designs.map(d => (
            <div key={d.id || d._id} className="design-card" style={{
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--color-bg)',
            }}>
              <div style={{
                aspectRatio: '16/9',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                overflow: 'hidden',
              }}>
                {d.preview_url ? (
                  <img src={d.preview_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span>3D</span>
                )}
              </div>
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>{d.name || 'Sin nombre'}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
                  Usuario: {d.user_id || d.user_name || '—'}
                  {d.is_published && <span style={{ marginLeft: 8, color: '#059669' }}>• Publicado</span>}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <span>❤️ {d.likes || 0}</span>
                  <span>💬 {d.comments?.length || 0}</span>
                </div>
                <button className="btn btn-sm btn-outline-danger w-100 mt-2" onClick={() => handleDelete(d.id || d._id)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="catalog-pagination" style={{ marginTop: 24, justifyContent: 'center' }}>
          <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>Página {page} de {totalPages}</span>
          <button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
        </div>
      )}

      <style>{`
        .admin-designs .content-header-inline {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-designs .item-count {
          font-size: 13px;
          color: var(--color-text-muted, #9CA3AF);
        }
        .admin-designs .design-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
    </MainLayout>
  )
}
