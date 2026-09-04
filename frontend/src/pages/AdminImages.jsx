import { useState, useEffect, useCallback } from 'react'
import { fetchProductImages, deleteProductImageById } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import { DEFAULT_IMAGE } from '../constants'
import toast from 'react-hot-toast'

export const AdminImages = () => {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const data = await fetchProductImages()
      setImages(data?.results || data || [])
    } catch { toast.error('Error al cargar imágenes') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (img) => {
    if (!confirm(`¿Eliminar esta imagen de "${img.product_name || 'Producto #' + img.product_id}"?`)) return
    try { await deleteProductImageById(img.id); toast.success('Imagen eliminada'); load() }
    catch { toast.error('Error al eliminar') }
  }

  if (loading) return <div className="loading">Cargando imágenes...</div>

  return (
    <AdminLayout title="Imágenes Cloudinary" subtitle="Administra las imágenes de productos subidas a Cloudinary">
    <div className="admin-images">
      <div className="content-header-inline">
        <h2 style={{ margin: 0, fontSize: 18 }}>Imágenes Cloudinary</h2>
        <span className="item-count">{images.length} imágenes</span>
      </div>

      {images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: 18, marginBottom: 8 }}>📷</p>
          <p>No hay imágenes cargadas en Cloudinary</p>
        </div>
      ) : (
        <div className="images-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          marginTop: 20,
        }}>
          {images.map(img => (
            <div key={img.id} className="image-card" style={{
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--color-bg)',
            }}>
              <div className="image-preview" style={{
                aspectRatio: '1',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}>
                {(img.cloudinary_url || img.image_url || img.image) ? (
                  <img
                    src={img.cloudinary_url || img.image_url || img.image}
                    alt={img.product_name || 'product image'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                    onError={e => { e.target.src = DEFAULT_IMAGE; e.target.style.objectFit = 'contain'; }}
                  />
                ) : (
                  <span style={{ color: '#999', fontSize: 12 }}>Sin preview</span>
                )}
              </div>
              <div style={{ padding: '10px 12px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {img.product_name || `Producto #${img.product}`}
                </div>
                <div style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {img.is_main ? '★ Principal' : `Orden ${img.order}`}
                </div>
                <button className="btn btn-sm btn-outline-danger w-100" onClick={() => handleDelete(img)}>
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .admin-images .content-header-inline {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-images .item-count {
          font-size: 13px;
          color: var(--color-text-muted, #9CA3AF);
        }
        .admin-images .image-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
      `}</style>
    </div>
    </AdminLayout>
  )
}
