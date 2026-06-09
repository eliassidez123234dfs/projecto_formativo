import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import MainLayout from '../components/MainLayout'

export default function AdminCartDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const usuario = JSON.parse(localStorage.getItem('usuario') || 'null')
    if (!usuario || usuario.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  useEffect(() => {
    let mounted = true
    async function load() {
      const token = localStorage.getItem('access_token')
      const h = token ? { Authorization: 'Bearer ' + token } : {}
      try {
        const res = await fetch(`/api/admin/carts/${id}/`, { headers: h })
        const data = await res.json()
        if (mounted) setCart(data)
      } catch { if (mounted) setCart(null) }
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [id])

  if (loading) return <MainLayout><div className="card"><div className="empty-state"><p>Cargando...</p></div></div></MainLayout>
  if (!cart) return <MainLayout><div className="card"><div className="empty-state"><p>Carrito no encontrado.</p></div></div></MainLayout>

  return (
    <MainLayout
      title={`Carrito #${cart.id}`}
      subtitle={cart.user_name}
    >
      <div style={{ marginBottom: 16 }}>
        <Link to="/admin-cart" className="btn btn-sm btn-ghost">← Volver a carritos</Link>
      </div>

      <div className="card">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 24, fontSize: 14 }}>
          <div><strong>Usuario:</strong> {cart.user_name}</div>
          <div><strong>Items:</strong> {cart.total_items}</div>
          <div><strong>Total:</strong> ${Number(cart.total_amount).toFixed(2)}</div>
          <div><strong>Creado:</strong> {new Date(cart.created_at).toLocaleDateString()}</div>
        </div>

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
                <td>${Number(item.unit_price).toFixed(2)}</td>
                <td style={{ fontWeight: 600 }}>${Number(item.subtotal).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid var(--color-border)' }}>
              <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700, padding: '12px 16px' }}>Total</td>
              <td style={{ fontWeight: 700, padding: '12px 16px' }}>${Number(cart.total_amount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </MainLayout>
  )
}
