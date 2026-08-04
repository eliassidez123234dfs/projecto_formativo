import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductForm from '../components/ProductForm'
import AdminLayout from '../components/AdminLayout'
import ErrorState from '../components/ErrorState'
import { formatCOP } from '../utils/format'

const ACTION_LABELS = {
  created: 'Creado',
  updated: 'Actualizado',
  published: 'Publicado',
  disapproved: 'Desaprobado',
}

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

function DetailCard({ title, children, fullWidth }) {
  return (
    <div className="card" style={fullWidth ? { gridColumn: '1 / -1' } : {}}>
      <div className="card-header">
        <h3>{title}</h3>
      </div>
      <div className="card-body" style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid var(--color-border-light)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 14, color: 'var(--color-text)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export default function AdminProductDetail() {
  const { id: productId } = useParams()
  const [product, setProduct] = useState(null)
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showDisapprove, setShowDisapprove] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [disapproving, setDisapproving] = useState(false)

  const loadProduct = useCallback(async () => {
    setLoading(true)
    try {
      const [productResponse, auditsResponse] = await Promise.all([
        fetch(`/api/products/${productId}/`),
        fetch(`/api/products/${productId}/audits/`),
      ])
      const productData = await productResponse.json()
      if (!productResponse.ok) {
        setProduct(null)
        setError({ message: 'Error al cargar el producto.', status: productResponse.status })
        return
      }
      const auditsData = await auditsResponse.json()
      // Normalize product data to avoid null reads in render
      const normalized = {
        id: productData?.id ?? null,
        name: productData?.name ?? '',
        description: productData?.description ?? '',
        base_price: productData?.base_price ?? 0,
        images: Array.isArray(productData?.images) ? productData.images : [],
        variants: Array.isArray(productData?.variants) ? productData.variants : [],
        categories: Array.isArray(productData?.categories) ? productData.categories : [],
        total_stock: productData?.total_stock ?? (Array.isArray(productData?.variants) ? productData.variants.reduce((s, v) => s + (v.stock || 0), 0) : 0),
        created_at: productData?.created_at ?? null,
        is_active: !!productData?.is_active,
        is_approved: !!productData?.is_approved,
        ready_to_publish: !!productData?.ready_to_publish,
      }
      setProduct(normalized)
      setAudits(Array.isArray(auditsData) ? auditsData : [])
      setError(null)
    } catch (err) { setProduct(null); setError({ message: 'Error al cargar el producto.', status: err?.status || null }) }
    finally { setLoading(false) }
  }, [productId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!cancelled) await loadProduct()
    })()
    return () => { cancelled = true }
  }, [loadProduct])

  async function handleDisapprove() {
    if (!motivo.trim()) return
    setDisapproving(true)
    try {
      const response = await fetch(`/api/products/${productId}/disapprove/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim() }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data?.motivo || 'Error al desaprobar el producto')
      }
      setShowDisapprove(false)
      setMotivo('')
      await loadProduct()
    } catch (err) {
      alert(err.message)
    } finally {
      setDisapproving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Detalle de Producto">
        <div className="card"><div className="empty-state"><p>Cargando detalle de producto...</p></div></div>
      </AdminLayout>
    )
  }

  if (!product) {
    return (
      <AdminLayout title="Detalle de Producto">
        <ErrorState status={error ? undefined : 404} error={error} module="detalle de producto" onRetry={loadProduct} />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout
      title={product.name}
      subtitle="Detalle y administración del producto"
    >
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            ID: <code>{product.id}</code> · Creado {product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}
          </span>
        </div>
        <div className="admin-toolbar-right">
          {(product.is_approved || product.is_active) && (
            <button className="btn btn-danger" onClick={() => setShowDisapprove(true)}>
              Desaprobar
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar Producto
          </button>
          <Link to="/admin-products" className="btn btn-secondary">
            Volver
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
        <DetailCard title="Información General">
          <InfoRow label="Nombre" value={product.name} />
          <InfoRow label="Descripción" value={product.description || '-'} />
          <InfoRow label="Precio Base" value={formatCOP(product.base_price ?? 0)} />
          <InfoRow label="Stock total" value={String(product.total_stock ?? 0)} />
          <InfoRow label="Categorías" value={(product.categories || []).map(c => c.name).join(', ') || '-'} />
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <span className={`badge ${product.is_active ? 'badge-active' : 'badge-inactive'}`}>
              {product.is_active ? 'Activo' : 'Inactivo'}
            </span>
            <span className={`badge ${product.is_approved ? 'badge-approved' : 'badge-pending'}`}>
              {product.is_approved ? 'Aprobado' : 'Pendiente'}
            </span>
            <span className={`badge ${product.ready_to_publish ? 'badge-approved' : 'badge-pending'}`}>
              {product.ready_to_publish ? 'Checklist Completo' : 'Checklist Pendiente'}
            </span>
          </div>
        </DetailCard>

        <DetailCard title="Variantes">
          {(product.variants || []).length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Sin variantes registradas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(product.variants || []).map(variant => (
                <div key={variant.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--color-bg-tertiary)',
                  borderRadius: 'var(--radius-lg)', fontSize: 14,
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--color-border)', background: variant.color_hex || '#6B7280', flexShrink: 0 }} />
                    {variant.size} / {variant.color}
                  </span>
                  <span style={{ display: 'flex', gap: 14, color: 'var(--color-text-secondary)' }}>
                    <span>
                      Precio: <strong style={{ color: 'var(--color-text)' }}>{formatCOP(variant.effective_price)}</strong>
                      {variant.price_variant != null && <small style={{ color: 'var(--color-text-muted)' }}> (propio)</small>}
                    </span>
                    <span>
                      Stock: <strong style={{ color: 'var(--color-text)' }}>{variant.stock}</strong>
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </DetailCard>

        <DetailCard title="Imágenes">
          {(product.images || []).length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Sin imágenes.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10 }}>
              {(product.images || []).sort((a, b) => a.order - b.order).map(image => (
                <div key={image.id} style={{ position: 'relative' }}>
                  <img
                    src={image.image_url}
                    alt=""
                    style={{
                      width: '100%', aspectRatio: '1', objectFit: 'cover',
                      borderRadius: 'var(--radius-lg)', border: image.is_main ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    }}
                  />
                  {image.is_main && (
                    <span style={{
                      position: 'absolute', top: 4, left: 4, fontSize: 9, fontWeight: 700,
                      background: 'var(--color-primary)', color: '#fff',
                      padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                    }}>PRINCIPAL</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </DetailCard>

        <DetailCard title="Auditoría" fullWidth>
          {audits.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Sin cambios auditados todavía.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {audits.map(entry => {
                const diffs = getAuditDiff(entry)
                return (
                  <div key={entry.id} style={{
                    padding: '14px 16px', background: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-light)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-primary)' }}>
                        {ACTION_LABELS[entry.action] || entry.action}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        ID: <code>{product.id}</code> · Creado {product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}
                      </span>
                    </div>
                    {entry.motivo && (
                      <p style={{ margin: '0 0 8px', padding: '6px 10px', fontSize: 13, color: 'var(--color-error)', background: 'color-mix(in srgb, var(--color-error) 10%, transparent)', borderRadius: 'var(--radius-md)' }}>
                        Motivo: {entry.motivo}
                      </p>
                    )}
                    {diffs.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Sin cambios detectables en campos serializados.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {diffs.map(diff => (
                          <div key={`${entry.id}-${diff.key}`} style={{
                            display: 'flex', gap: 8, fontSize: 13,
                            padding: '6px 0', borderBottom: '1px solid var(--color-border-light)',
                          }}>
                            <span style={{ fontWeight: 600, minWidth: 100, color: 'var(--color-text)' }}>{diff.key}</span>
                            <span style={{ color: 'var(--color-error)' }}>{diff.before}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>→</span>
                            <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{diff.after}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DetailCard>
      </div>

      {showForm && (
        <ProductForm
          key={product.id}
          product={product}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadProduct() }}
        />
      )}

      {showDisapprove && (
        <div className="form-modal-backdrop" onClick={() => setShowDisapprove(false)}>
          <div className="form-modal" onClick={e => e.stopPropagation()} style={{ width: 'min(460px, 95vw)' }}>
            <div className="form-modal-header">
              <h2>Desaprobar producto</h2>
              <button className="form-modal-close" onClick={() => setShowDisapprove(false)}>✕</button>
            </div>
            <div className="form-modal-body">
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
                El producto será desactivado y quedará pendiente de aprobación. Indica el motivo:
              </p>
              <textarea
                autoFocus
                rows={4}
                maxLength={255}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej.: Fotos en baja resolución, precio incorrecto..."
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)',
                  color: 'var(--color-text)', fontSize: 14, outline: 'none', resize: 'vertical',
                }}
              />
            </div>
            <div className="form-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDisapprove(false)} disabled={disapproving}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDisapprove} disabled={disapproving || !motivo.trim()}>
                {disapproving ? 'Desaprobando...' : 'Desaprobar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
