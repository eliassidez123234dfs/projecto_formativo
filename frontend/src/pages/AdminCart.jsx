import { useCallback, useEffect, useState } from 'react'
import MainLayout from '../components/MainLayout'

function CartRow({ item, onChangeQty, onRemove }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border-light)' }}>
      <img
        src={item.product_image || ''} alt={item.product_name}
        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 'var(--radius-md)', background: 'var(--color-bg-tertiary)' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{item.product_name}</p>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{item.variant_label}</p>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>${Number(item.unit_price).toFixed(2)}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="btn btn-sm btn-ghost" onClick={() => onChangeQty(item.id, Math.max(1, item.quantity - 1))} disabled={item.quantity <= 1}>−</button>
        <span style={{ fontWeight: 600, minWidth: 28, textAlign: 'center', fontSize: 14 }}>{item.quantity}</span>
        <button className="btn btn-sm btn-ghost" onClick={() => onChangeQty(item.id, item.quantity + 1)}>+</button>
      </div>
      <div style={{ textAlign: 'right', minWidth: 100 }}>
        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 15 }}>${Number(item.subtotal).toFixed(2)}</p>
        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-error)' }} onClick={() => onRemove(item.id)}>Eliminar</button>
      </div>
    </div>
  )
}

export default function AdminCart() {
  const [cart, setCart] = useState({ items: [], total_amount: '0.00', total_items: 0 })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadCart = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const h = token ? { Authorization: 'Bearer ' + token } : {}
      const res = await fetch('/api/cart/', { headers: h })
      const data = await res.json()
      setCart(data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadCart() }, [loadCart])

  async function updateQuantity(itemId, quantity) {
    const token = localStorage.getItem('access_token')
    const h = token ? { Authorization: 'Bearer ' + token } : {}
    const res = await fetch(`/api/cart/items/${itemId}/quantity/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ quantity }),
    })
    if (!res.ok) { const e = await res.json(); setMessage(e.quantity || 'Error'); return }
    await loadCart()
  }

  async function removeItem(itemId) {
    const token = localStorage.getItem('access_token')
    const h = token ? { Authorization: 'Bearer ' + token } : {}
    await fetch(`/api/cart/items/${itemId}/remove/`, { method: 'DELETE', headers: h })
    await loadCart()
  }

  async function clearCart() {
    const token = localStorage.getItem('access_token')
    const h = token ? { Authorization: 'Bearer ' + token } : {}
    await fetch('/api/cart/clear/', { method: 'DELETE', headers: h })
    setMessage('Carrito vaciado')
    setPage(1)
    await loadCart()
  }

  const totalPages = Math.max(1, Math.ceil((cart.items?.length || 0) / pageSize))
  const paginatedItems = (cart.items || []).slice((page - 1) * pageSize, page * pageSize)

  return (
    <MainLayout title="Carrito" subtitle="Gestiona los items del carrito">
      {message && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', color: '#065f46', borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #bbf7d0' }}>
          {message}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Cargando carrito...</p></div>
        ) : cart.items?.length === 0 ? (
          <div className="empty-state"><p>El carrito está vacío.</p></div>
        ) : (
          <>
            {paginatedItems.map(item => (
              <CartRow key={item.id} item={item} onChangeQty={updateQuantity} onRemove={removeItem} />
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--color-border)' }}>
              <div className="pagination" style={{ border: 'none', padding: 0 }}>
                <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Anterior</button>
                <span className="pagination-info">Página {page} de {totalPages}</span>
                <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente →</button>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--color-text-secondary)' }}>Productos: {cart.total_items}</p>
                <p style={{ margin: '0 0 12px', fontSize: 20, fontWeight: 700 }}>Total: ${Number(cart.total_amount).toFixed(2)}</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn btn-sm btn-ghost" onClick={clearCart}>Vaciar carrito</button>
                  <a className="btn btn-sm btn-primary" href="/checkout">Ir a checkout</a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}