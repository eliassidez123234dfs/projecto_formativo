import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { fetchProductDetail } from '../services/api'
import { Card } from '../components/ui'
import Product3DViewer from '../components/Product3DViewer'

const EDITOR_URL = import.meta.env.VITE_TSHIRT3D_URL || (
  import.meta.env.DEV ? 'http://127.0.0.1:5174/' : '/editor/'
)

export const Product3D = () => {
  const { id } = useParams()
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const mode = params.get('mode') || 'view'
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('3d')

  useEffect(() => {
    if (!id) { setLoading(false); return }
    fetchProductDetail(id)
      .then(setProduct)
      .catch(() => setError('No se pudo cargar el producto'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-danger" />
      </div>
    )
  }

  const editorUrl = `${EDITOR_URL}?mode=${mode}${id ? `&productId=${id}` : ''}`

  return (
    <div className="container py-4">
      <Link to={id ? `/product/${id}` : '/catalog'} className="text-decoration-none mb-3 d-inline-block" style={{ color: 'var(--color-red)' }}>
        ← Volver
      </Link>

      <Card title={product ? `Vista 3D: ${product.name}` : 'Vista 3D'} className="mb-4">
        <div className="d-flex gap-2 mb-3">
          <button className={`btn btn-sm ${viewMode === '3d' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setViewMode('3d')}>
            Vista 3D
          </button>
          <button className={`btn btn-sm ${viewMode === 'editor' ? 'btn-danger' : 'btn-outline-secondary'}`} onClick={() => setViewMode('editor')}>
            Editor completo
          </button>
          <button className="btn btn-sm btn-outline-danger" onClick={() => window.open(editorUrl, '_blank')}>
            Abrir en nueva pestaña
          </button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {viewMode === '3d' ? (
          <Product3DViewer height={480} />
        ) : (
          <div style={{ width: '100%', height: 600, borderRadius: 12, overflow: 'hidden', border: '1px solid #ddd' }}>
            <iframe src={editorUrl} title="Editor 3D" width="100%" height="100%" style={{ border: 'none' }} />
          </div>
        )}
      </Card>
    </div>
  )
}
