import { useCallback, useEffect, useState } from 'react'
import './shop.css'

function CartRow({ item, onChangeQty, onRemove }) {
  return (
    <article className="cart-row">
      <img src={item.product_image || ''} alt={item.product_name} className="cart-thumb" />
      <div>
        <h3>{item.product_name}</h3>
        <p>{item.variant_label}</p>
        <strong>${Number(item.unit_price).toFixed(2)}</strong>
      </div>
      <div className="cart-qty-actions">
        <button type="button" onClick={() => onChangeQty(item.id, Math.max(1, item.quantity - 1))}>-</button>
        <input type="number" min="1" value={item.quantity} onChange={e => onChangeQty(item.id, Number(e.target.value || 1))} />
        <button type="button" onClick={() => onChangeQty(item.id, item.quantity + 1)}>+</button>
      </div>
      <div className="cart-row-right">
        <strong>${Number(item.subtotal).toFixed(2)}</strong>
        <button type="button" className="shop-button secondary" onClick={() => onRemove(item.id)}>Eliminar</button>
      </div>
    </article>
  )
}

export default function CartPage() {
  const [cart, setCart] = useState({ items: [], total_amount: '0.00', total_items: 0 })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5

  const loadCart = useCallback(async () => {
    setLoading(true)
    const response = await fetch('/api/cart/')
    const data = await response.json()
    setCart(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (cancelled) return
      await loadCart()
    })()
    return () => {
      cancelled = true
    }
  }, [loadCart])

  async function updateQuantity(itemId, quantity) {
    const response = await fetch(`/api/cart/items/${itemId}/quantity/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    })
    if (!response.ok) {
      const errorData = await response.json()
      setMessage(errorData.quantity || 'No se pudo actualizar la cantidad')
      return
    }
    await loadCart()
  }

  async function removeItem(itemId) {
    const response = await fetch(`/api/cart/items/${itemId}/remove/`, { method: 'DELETE' })
    if (!response.ok && response.status !== 204) {
      setMessage('No se pudo eliminar el item')
      return
    }
    await loadCart()
  }

  async function clearCart() {
    const response = await fetch('/api/cart/clear/', { method: 'DELETE' })
    if (!response.ok && response.status !== 204) {
      setMessage('No se pudo vaciar el carrito')
      return
    }
    setMessage('Carrito vaciado correctamente')
    setPage(1)
    await loadCart()
  }

  const totalPages = Math.max(1, Math.ceil((cart.items?.length || 0) / pageSize))
  const paginatedItems = (cart.items || []).slice((page - 1) * pageSize, page * pageSize)

  return (
    <main className="shop-shell">
      <section className="admin-detail-hero">
        <div>
          <p className="eyebrow">Carrito de compras</p>
          <h1>Tu selección</h1>
          <p>Modifica cantidades, elimina productos y revisa el total en tiempo real.</p>
        </div>
        <div className="admin-detail-actions">
          <a className="shop-button secondary" href="/catalogo">Seguir comprando</a>
          <button type="button" className="shop-button secondary" disabled={cart.items.length === 0} onClick={clearCart}>Vaciar carrito</button>
          <a className="shop-button" href="/checkout">Ir a checkout</a>
        </div>
      </section>

      {loading ? (
        <div className="shop-empty">Cargando carrito...</div>
      ) : cart.items.length === 0 ? (
        <div className="shop-empty">Tu carrito está vacío.</div>
      ) : (
        <section className="cart-layout">
          <div className="cart-list">
            {paginatedItems.map(item => (
              <CartRow key={item.id} item={item} onChangeQty={updateQuantity} onRemove={removeItem} />
            ))}
            <nav className="pager" aria-label="Paginación carrito">
              <button type="button" className="shop-button secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
              <span>Página {page} de {totalPages}</span>
              <button type="button" className="shop-button secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
            </nav>
          </div>
          <aside className="cart-summary">
            <h2>Resumen</h2>
            <p>Productos: {cart.total_items}</p>
            <p>Total: <strong>${Number(cart.total_amount).toFixed(2)}</strong></p>
          </aside>
        </section>
      )}

      {message && <p className="detail-message">{message}</p>}
    </main>
  )
}
