/**
 * AdminProductDetail — Detalle y edición de un producto en el panel admin.
 * Muestra información general, variantes, imágenes, un historial de auditoría
 * con diferencias (diff) entre versiones, y permite editar el producto.
 */
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductForm from '../components/ProductForm'
import MainLayout from '../components/MainLayout'

/**
 * Convierte cualquier valor a texto plano para comparación en el diff de auditoría.
 * @param {any} value
 * @returns {string}
 */
function toText(value) {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

/**
 * Calcula las diferencias entre los datos antes/después de una entrada de auditoría.
 * @param {Object} entry — Entrada de auditoría con before_data y after_data.
 * @returns {Array<{key: string, before: string, after: string}>}
 */
function getAuditDiff(entry) {
  const before = entry.before_data || {}
  const after = entry.after_data || {}
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  return keys
    .filter(key => toText(before[key]) !== toText(after[key]))
    .map(key => ({ key, before: toText(before[key]), after: toText(after[key]) }))
}

/**
 * Tarjeta reutilizable para mostrar una sección del detalle.
 * @param {{ title: string, children: ReactNode, fullWidth?: boolean }}
 */
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

/**
 * Fila de información con label a la izquierda y valor a la derecha.
 * @param {{ label: string, value: string }}
 */
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
  const [showForm, setShowForm] = useState(false)

  const loadProduct = useCallback(async () => {
    setLoading(true)
    try {
      const [productResponse, auditsResponse] = await Promise.all([
        fetch(`/api/products/${productId}/`),
        fetch(`/api/products/${productId}/audits/`),
      ])
      const productData = await productResponse.json()
      const auditsData = await auditsResponse.json()
      setProduct(productData)
      setAudits(Array.isArray(auditsData) ? auditsData : [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [productId])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!cancelled) await loadProduct()
    })()
    return () => { cancelled = true }
  }, [loadProduct])

  if (loading) {
    return (
      <MainLayout title="Detalle de Producto">
        <div className="card"><div className="empty-state"><p>Cargando detalle de producto...</p></div></div>
      </MainLayout>
    )
  }

  if (!product) {
    return (
      <MainLayout title="Detalle de Producto">
        <div className="card"><div className="empty-state"><p>Producto no encontrado</p></div></div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title={product.name}
      subtitle="Detalle y administración del producto"
    >
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            ID: <code>{product.id}</code> · Creado {new Date(product.created_at || Date.now()).toLocaleDateString()}
          </span>
        </div>
        <div className="admin-toolbar-right">
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
          <InfoRow label="Precio Base" value={`$${Number(product.base_price).toFixed(2)}`} />
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
                  <span style={{ fontWeight: 600 }}>
                    {variant.size} / {variant.color}
                  </span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Stock: <strong style={{ color: 'var(--color-text)' }}>{variant.stock}</strong>
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
                        {entry.action}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                        {entry.actor || 'sistema'} · {new Date(entry.created_at).toLocaleString('es-CO')}
                      </span>
                    </div>
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
    </MainLayout>
  )
}
