import { useState, useEffect } from 'react'
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchProductDetail } from '../services/api'
import { Button, Card } from '../components/ui'
import Product3DViewer from '../components/Product3DViewer'

const EDITOR_URL = import.meta.env.VITE_3D_EDITOR_URL || 'http://localhost:5174'

// 3D product viewer / editor page — embeds the Three.js viewer or full editor iframe from the microservice
export const Product3D = () => {
  const { id } = useParams()
  const { search } = useLocation()
  const navigate = useNavigate()
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

  const editorUrl = `${EDITOR_URL}?mode=${mode}${id ? `&productId=${id}` : ''}`
  const iframeUrl = `${EDITOR_URL}/preview?productId=${id}`

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-danger" />
      </div>
    )
  }

  return (
    <div className="container py-4">
      <Link to={id ? `/product/${id}` : '/catalog'} className="text-decoration-none mb-3 d-inline-block" style={{ color: 'var(--color-red)' }}>
        ← Volver
      </Link>

      <Card title={product ? `Vista 3D: ${product.name}` : 'Vista 3D'} className="mb-4">
        <div className="d-flex gap-2 mb-3">
          <Button variant={viewMode === '3d' ? 'danger' : 'outline-secondary'} size="sm" onClick={() => setViewMode('3d')}>
            Vista 3D
          </Button>
          <Button variant={viewMode === 'editor' ? 'danger' : 'outline-secondary'} size="sm" onClick={() => setViewMode('editor')}>
            Editor completo
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => window.open(editorUrl, '_blank')}>
            Abrir en nueva pestaña
          </Button>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {viewMode === '3d' ? (
          <Product3DViewer height={480} />
        ) : (
          <div style={{ width: '100%', height: 600, borderRadius: 12, overflow: 'hidden', border: '1px solid #ddd' }}>
            <iframe src={iframeUrl} title="Editor 3D" width="100%" height="100%" style={{ border: 'none' }} />
          </div>
        )}
      </Card>

      <div className="text-muted small">
        <p className="mb-1">💡 El editor 3D completo debe ejecutarse en <code>microservices/Tshirt3D</code> con <code>npm run dev</code>.</p>
        <p className="mb-0">🔧 Configura la URL en <code>VITE_3D_EDITOR_URL</code> (archivo <code>.env</code>).</p>
      </div>
    </div>
  )
}
