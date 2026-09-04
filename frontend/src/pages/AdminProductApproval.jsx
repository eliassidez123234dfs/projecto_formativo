import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../components/AdminLayout'
import InfoModal from '../components/InfoModal'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'
import { formatCOP } from '../utils/format'
import { fetchProducts, publishProduct, disapproveProduct } from '../services/api'

function errMsg(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  return Object.values(data).flat().join(' | ') || fallback
}

const CHECKLIST_LABELS = {
  name: 'Nombre del producto',
  description: 'Descripción del producto',
  main_image: 'Imagen principal',
  variant_with_stock: 'Variante con stock disponible',
  ready_to_publish: 'Listo para publicar',
}
const CHECKLIST_ORDER = ['name', 'description', 'main_image', 'variant_with_stock', 'ready_to_publish']

function formatChecklist(checklist) {
  return CHECKLIST_ORDER.map(k => ({
    label: CHECKLIST_LABELS[k] || k,
    ok: checklist[k],
  }))
}

export default function AdminProductApproval() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [processing, setProcessing] = useState(null)
  const [modal, setModal] = useState(null)
  const pageSize = 20

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchProducts({ is_approved: 'false', page, page_size: pageSize })
      setProducts(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : [])
      setCount(data.count || 0)
      setError(null)
    } catch (err) { setProducts([]); setCount(0); setError({ message: 'Error al cargar los productos pendientes.', status: err?.response?.status || null }) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => {
    const t = setTimeout(() => { loadProducts() }, 0);
    return () => clearTimeout(t);
  }, [loadProducts])

  async function handleApprove(productId) {
    setProcessing(productId)
    try {
      const data = await publishProduct(productId)
      setModal({ type: 'success', title: 'Producto aprobado', message: `"${data.name}" fue aprobado y publicado exitosamente.` })
      setTimeout(() => { setModal(null); loadProducts() }, 1500)
    } catch (e) {
      const d = e?.response?.data
      setModal({
        type: 'error',
        title: 'No se pudo aprobar',
        message: d?.detail || 'Error al aprobar el producto',
        checklist: d?.checklist ? formatChecklist(d.checklist) : null,
      })
    }
    finally { setProcessing(null) }
  }

  async function handleReject(productId) {
    setProcessing(productId)
    const motivo = window.prompt('Motivo del rechazo (se guardará en la auditoría del producto):', '')
    if (motivo === null) { setProcessing(null); return }
    try {
      await disapproveProduct(productId, { motivo: motivo.trim() })
      setModal({ type: 'success', title: 'Producto rechazado', message: 'El producto ha sido desaprobado y desactivado.' })
      setTimeout(() => { setModal(null); loadProducts() }, 1500)
    } catch (e) {
      setModal({ type: 'error', title: 'Error', message: errMsg(e, 'Error al rechazar el producto') })
    }
    finally { setProcessing(null) }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  return (
    <AdminLayout title="Aprobación de Productos" subtitle="Revisa y aprueba productos pendientes">
      {modal && (
        <InfoModal
          type={modal.type}
          title={modal.title}
          message={modal.message}
          checklist={modal.checklist}
          onClose={() => setModal(null)}
        />
      )}

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card-body">
            <div className="stat-card-value">{count}</div>
            <div className="stat-card-label">Productos pendientes de aprobación</div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner text="Cargando productos pendientes..." />
        ) : error ? (
          <ErrorState error={error} module="aprobación de productos" onRetry={loadProducts} />
        ) : products.length === 0 ? (
          <div className="empty-state"><p>No hay productos pendientes de aprobación.</p></div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Checklist</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {p.main_image ? (
                          <img src={p.main_image} alt={p.name} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 48, height: 48, borderRadius: 6, background: '#eee' }} />
                        )}
                        <div>
                          <strong>{p.name}</strong>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{p.description?.slice(0, 60)}</div>
                        </div>
                      </div>
                    </td>
                    <td>{formatCOP(p.base_price ?? 0)}</td>
                    <td>
                      <span className={`badge ${(p.total_stock ?? 0) > 0 ? 'badge-active' : 'badge-inactive'}`}>
                        {p.total_stock ?? 0}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.ready_to_publish ? 'badge-approved' : 'badge-pending'}`}>
                        {p.ready_to_publish ? 'Listo' : 'Incompleto'}
                      </span>
                    </td>
                    <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={processing === p.id || !p.ready_to_publish}
                          onClick={() => { if (confirm(`¿Aprobar y publicar "${p.name}"?`)) handleApprove(p.id) }}
                          title={!p.ready_to_publish ? 'Completa el checklist antes de aprobar' : ''}
                        >
                          {processing === p.id ? '...' : 'Aprobar'}
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--color-error)' }}
                          disabled={processing === p.id}
                          onClick={() => { if (confirm(`¿Rechazar y desactivar "${p.name}"?`)) handleReject(p.id) }}
                        >
                          Rechazar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={count} label="productos" onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
