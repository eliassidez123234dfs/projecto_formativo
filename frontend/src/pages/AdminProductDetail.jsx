import { useCallback, useEffect, useState } from 'react'
import ProductForm from '../components/ProductForm'
import './shop.css'

function toText(value) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getAuditDiff(entry) {
  const before = entry.before_data || {}
  const after = entry.after_data || {}
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  return keys
    .filter(key => toText(before[key]) !== toText(after[key]))
    .map(key => ({ key, before: toText(before[key]), after: toText(after[key]) }))
}

export default function AdminProductDetail({ productId }) {
  const [product, setProduct] = useState(null)
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const loadProduct = useCallback(async () => {
    setLoading(true)
    const [productResponse, auditsResponse] = await Promise.all([
      fetch(`/api/products/${productId}/`),
      fetch(`/api/products/${productId}/audits/`),
    ])
    const productData = await productResponse.json()
    const auditsData = await auditsResponse.json()
    setProduct(productData)
    setAudits(Array.isArray(auditsData) ? auditsData : [])
    setLoading(false)
  }, [productId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await loadProduct()
    })()
    return () => {
      cancelled = true
    }
  }, [loadProduct])

  if (loading) {
    return <main className="shop-shell"><div className="shop-empty">Cargando detalle de producto...</div></main>
  }

  if (!product) {
    return <main className="shop-shell"><div className="shop-empty">Producto no encontrado</div></main>
  }

  return (
    <main className="shop-shell">
      <section className="admin-detail-hero">
        <div>
          <p className="eyebrow">Detalle admin</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
        </div>
        <div className="admin-detail-actions">
          <button className="shop-button" type="button" onClick={() => setShowForm(true)}>Editar producto</button>
          <a className="shop-button secondary" href="/admin-products">Volver</a>
        </div>
      </section>

      <section className="admin-detail-grid">
        <article className="admin-detail-card">
          <h2>Estado</h2>
          <p>Activo: {product.is_active ? 'Sí' : 'No'}</p>
          <p>Aprobado: {product.is_approved ? 'Sí' : 'No'}</p>
          <p>Precio base: ${Number(product.base_price).toFixed(2)}</p>
          <p>Checklist: {product.ready_to_publish ? 'Completo' : 'Pendiente'}</p>
        </article>

        <article className="admin-detail-card">
          <h2>Variantes</h2>
          <ul className="clean-list">
            {(product.variants || []).map(variant => (
              <li key={variant.id}>{variant.size} / {variant.color} - Stock {variant.stock}</li>
            ))}
          </ul>
        </article>

        <article className="admin-detail-card">
          <h2>Imágenes</h2>
          <div className="detail-thumbs grid">
            {(product.images || []).map(image => (
              <img key={image.id} src={image.image_url} alt={product.name} className="detail-thumb-image" />
            ))}
          </div>
        </article>

        <article className="admin-detail-card full-width">
          <h2>Auditoría</h2>
          {audits.length === 0 ? (
            <p>Sin cambios auditados todavía.</p>
          ) : (
            <ul className="clean-list audit-list">
              {audits.map(entry => (
                <li key={entry.id} className="audit-item">
                  <div className="audit-content">
                    <strong>{entry.action}</strong>
                    <span className="audit-meta"> por {entry.actor || 'sistema'}</span>
                    <ul className="clean-list audit-diff-list">
                      {getAuditDiff(entry).length === 0 ? (
                        <li className="audit-diff-row">Sin cambios detectables en campos serializados.</li>
                      ) : (
                        getAuditDiff(entry).map(diff => (
                          <li key={`${entry.id}-${diff.key}`} className="audit-diff-row">
                            <span><strong>{diff.key}</strong></span>
                            <span>{diff.before} -> {diff.after}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  <small>{new Date(entry.created_at).toLocaleString('es-CO')}</small>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      {showForm && (
        <ProductForm
          key={product.id}
          product={product}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            loadProduct()
          }}
        />
      )}
    </main>
  )
}
