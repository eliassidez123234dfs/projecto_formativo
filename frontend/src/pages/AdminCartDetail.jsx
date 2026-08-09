/**
 * AdminCartDetail — Detalle de un carrito de usuario en el panel admin.
 * Muestra productos, variantes, cantidades y subtotales. Permite cambiar
 * el estado de la orden asociada o reprocesarla si fue cancelada.
 */
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchAdminCartDetail } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import ErrorState from '../components/ErrorState'
import { formatCOP } from '../utils/format'

export default function AdminCartDetail() {
  const { id } = useParams()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await fetchAdminCartDetail(id)
        if (mounted) setCart(data)
      } catch (err) { if (mounted) { setCart(null); setError(err) } }
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [id])

  if (loading) return <AdminLayout><div className="card"><div className="empty-state"><p>Cargando...</p></div></div></AdminLayout>
  if (!cart) return <AdminLayout><ErrorState status={error ? undefined : 404} error={error} module="detalle de carrito" /></AdminLayout>

  const statusStyle = STATUS_STYLES[cart.order_status] || { bg: '#f3f4f6', color: '#6b7280' }

  return (
    <AdminLayout
      title={`Carrito #${cart.id}`}
      subtitle={cart.user_name}
    >
      <div style={{ marginBottom: 16 }}>
        <Link to="/admin-cart" className="btn btn-sm btn-ghost">← Volver a carritos</Link>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 24, fontSize: 14 }}>
          <div><strong>Usuario:</strong> {cart.user_name}</div>
          <div><strong>Items:</strong> {cart.total_items}</div>
          <div><strong>Total:</strong> {formatCOP(cart.total_amount)}</div>
          <div><strong>Creado:</strong> {new Date(cart.created_at).toLocaleDateString()}</div>
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', fontSize: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <strong>Estado del pedido:</strong>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 999, fontSize: 13,
              fontWeight: 600, background: statusStyle.bg, color: statusStyle.color,
            }}>
              {cart.order_status_display || 'Pendiente'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            {canEditStatus && (
              <>
                <strong style={{ fontSize: 13 }}>Cambiar a:</strong>
                <select
                  value=""
                  onChange={(e) => e.target.value && handleStatusChange(e.target.value)}
                  disabled={saving}
                  style={{
                    padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)',
                    fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </>
            )}

            {cart.order_status === 'cancelado' && cart.order_id && (
              <button
                onClick={handleReprocess}
                disabled={saving}
                className="btn btn-primary"
                style={{ background: '#059669', fontSize: 13 }}
              >
                {saving ? 'Procesando...' : 'Procesar nuevamente'}
              </button>
            )}
          </div>
        </div>

        {cart.order_status === 'pagado' && (
          <div style={{ padding: '0 20px 16px', fontSize: 13, color: '#dc2626' }}>
            Los pedidos pagados no pueden modificar su estado.
          </div>
        )}
        {cart.order_status === 'cancelado' && (
          <div style={{ padding: '0 20px 16px', fontSize: 13, color: '#dc2626' }}>
            Pedido cancelado. Use "Procesar nuevamente" para reactivarlo.
          </div>
        )}
      </div>

      <div className="card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Variante</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {cart.items?.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: 24, color: '#999' }}>Carrito vacío</td></tr>
            ) : cart.items.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 6, background: '#eee' }} />
                    )}
                    <strong>{item.product_name}</strong>
                  </div>
                </td>
                <td>
                  <span style={{ background: '#f3f4f6', padding: '3px 8px', borderRadius: 4, fontSize: 13, color: '#374151' }}>
                    Talla: {item.variant_size} · Color: {item.variant_color}
                  </span>
                </td>
                <td>{item.quantity}</td>
                <td>{formatCOP(item.unit_price)}</td>
                <td style={{ fontWeight: 600 }}>{formatCOP(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)' }}>
              <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700, padding: '12px 16px' }}>Total</td>
              <td style={{ fontWeight: 700, padding: '12px 16px' }}>{formatCOP(cart.total_amount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </AdminLayout>
  )
}