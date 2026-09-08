import { useState, useEffect, useCallback } from 'react'
import { fetchDesigns, deleteDesign } from '../services/api'
import toast from 'react-hot-toast'
import { Breadcrumbs } from '../components/Breadcrumbs'

export const UserDesigns = () => {
  const [designs, setDesigns] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchDesigns()
      setDesigns(data?.results || data || [])
    } catch { toast.error('Error al cargar tus diseños') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este diseño?')) return
    try { await deleteDesign(id); toast.success('Diseño eliminado'); load() }
    catch { toast.error('Error al eliminar') }
  }

  if (loading) return <div className="loading">Cargando tus diseños...</div>

  return (
    <div className="user-designs" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
      <Breadcrumbs pageTitle="Mis Diseños 3D" />
      <h2 style={{ margin: '16px 0 8px', fontSize: 22 }}>Mis Diseños 3D</h2>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
        {designs.length} diseño{designs.length !== 1 ? 's' : ''} guardado{designs.length !== 1 ? 's' : ''}
      </p>

      {designs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: 40, marginBottom: 8 }}>🎨</p>
          <p style={{ fontSize: 16, marginBottom: 4 }}>No has creado ningún diseño aún</p>
          <p style={{ fontSize: 14 }}>Usa el editor 3D para crear tu primer diseño</p>
        </div>
      ) : (
        <div className="designs-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}>
          {designs.map(d => (
            <div key={d.id || d._id} className="design-card" style={{
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--color-bg)',
              transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{
                aspectRatio: '16/9',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 24,
                fontWeight: 700,
              }}>
                {d.preview_url ? (
                  <img src={d.preview_url} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : '3D'}
              </div>
              <div style={{ padding: '14px' }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{d.name || 'Sin nombre'}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
                  <span>❤️ {d.likes || 0}</span>
                  <span>💬 {d.comments?.length || 0}</span>
                  {d.is_published && <span style={{ color: '#059669' }}>🌍 Publicado</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {d.is_published ? (
                    <span className="badge bg-success" style={{ fontSize: 11 }}>Publicado</span>
                  ) : (
                    <span className="badge bg-secondary" style={{ fontSize: 11 }}>Borrador</span>
                  )}
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d.id || d._id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
