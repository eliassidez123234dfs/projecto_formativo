import { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { fetchAdminStats, fetchAdminOrders, fetchProducts } from '../services/api'
import { getCurrentUser } from '../services/authService'
import AdminLayout from '../components/AdminLayout'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'
import { formatCOP } from '../utils/format'

const STATUS_LABELS = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En proceso',
  completed: 'Completado',
  cancelled: 'Cancelado',
}

const STATUS_BADGE = {
  pending: 'badge-pending',
  paid: 'badge-approved',
  processing: 'badge-active',
  completed: 'badge-active',
  cancelled: 'badge-inactive',
}

const quickLinks = [
  { label: 'Productos', href: '/admin-products', desc: 'Gestiona el catálogo', color: 'primary' },
  { label: 'Aprobaciones', href: '/admin-products/approval', desc: 'Revisa productos pendientes', color: 'warning' },
  { label: 'Usuarios', href: '/admin-users', desc: 'Administra usuarios', color: 'info' },
  { label: 'Órdenes', href: '/admin-orders', desc: 'Gestiona órdenes de compra', color: 'success' },
  { label: 'Carritos', href: '/admin-cart', desc: 'Carritos del sistema', color: 'primary' },
  { label: 'Contacto', href: '/admin-contact', desc: 'Mensajes de contacto', color: 'warning' },
  { label: 'Auditoría', href: '/admin-audit', desc: 'Registro de acciones', color: 'info' },
]

const Icons = {
  Package: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  ShoppingCart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recentOrders, setRecentOrders] = useState(null)
  const [recentProducts, setRecentProducts] = useState(null)
  const usuario = getCurrentUser()

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminStats()
      setStats(data)
    } catch (err) { setError(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStats();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadStats])

  useEffect(() => {
    let active = true
    const loadRecent = async () => {
      try {
        const [orders, products] = await Promise.allSettled([
          fetchAdminOrders(1, 6),
          fetchProducts({ page: 1, page_size: 6, ordering: '-created_at' }),
        ])
        if (!active) return
        if (orders.status === 'fulfilled') setRecentOrders(orders.value)
        if (products.status === 'fulfilled') setRecentProducts(products.value)
      } catch { /* no romper el dashboard */ }
    }
    loadRecent()
    return () => { active = false }
  }, [])

  const statCards = stats ? [
    { value: stats.productos?.total ?? '—', label: 'Productos', icon: Icons.Package, color: 'primary' },
    { value: stats.usuarios?.total ?? '—', label: 'Usuarios', icon: Icons.Users, color: 'info' },
    { value: stats.ordenes?.del_mes ?? '—', label: 'Órdenes del Mes', icon: Icons.ShoppingCart, color: 'success' },
    { value: stats.ordenes?.total_ventas ? `$${parseFloat(stats.ordenes.total_ventas).toLocaleString()}` : '—', label: 'Ventas Totales', icon: Icons.TrendingUp, color: 'warning' },
  ] : []

  return (
    <AdminLayout title="Dashboard" subtitle={`Bienvenido, ${usuario?.usuario || 'Administrador'}`}>
      {loading ? (
        <Spinner text="Cargando estadísticas..." />
      ) : error ? (
        <ErrorState error={error} module="estadísticas del panel" onRetry={loadStats} />
      ) : (
        <>
          <div className="admin-stats">
            {statCards.map((s, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-card-icon ${s.color}`}><s.icon /></div>
                <div className="stat-card-body">
                  <div className="stat-card-value">{s.value}</div>
                  <div className="stat-card-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>Acceso rápido</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {quickLinks.map(link => (
              <div
                key={link.href}
                className="stat-card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(link.href)}
              >
                <div className="stat-card-body">
                  <div className="stat-card-value" style={{ fontSize: 18 }}>{link.label}</div>
                  <div className="stat-card-label" style={{ marginTop: 2 }}>{link.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-recent">
            <div className="card">
              <div className="card-header-row">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Compras recientes</h3>
                <Link to="/admin-orders" className="btn btn-sm btn-ghost">Ver todas</Link>
              </div>
              {!recentOrders ? (
                <Spinner text="Cargando compras..." />
              ) : !recentOrders.results || recentOrders.results.length === 0 ? (
                <div className="empty-state"><p>No hay compras registradas aún.</p></div>
              ) : (
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Cliente</th>
                        <th>Estado</th>
                        <th>Total</th>
                        <th>Items</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.results.map(order => (
                        <tr key={order.id}>
                          <td><code>{order.id}</code></td>
                          <td><strong>{order.customer_name || order.user_name || '—'}</strong></td>
                          <td>
                            <span className={`badge ${STATUS_BADGE[order.status] || 'badge-pending'}`}>
                              {STATUS_LABELS[order.status] || order.status || 'Pendiente'}
                            </span>
                          </td>
                          <td>{formatCOP(order.total)}</td>
                          <td>{order.items?.length || 0}</td>
                          <td>{order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header-row">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Productos subidos recientemente</h3>
                <Link to="/admin-products" className="btn btn-sm btn-ghost">Ver todos</Link>
              </div>
              {!recentProducts ? (
                <Spinner text="Cargando productos..." />
              ) : !recentProducts.results || recentProducts.results.length === 0 ? (
                <div className="empty-state"><p>No hay productos subidos aún.</p></div>
              ) : (
                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th>Aprobación</th>
                        <th>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentProducts.results.map(p => (
                        <tr key={p.id}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {p.main_image ? (
                              <img src={p.main_image} alt={p.name} style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <div className="stat-card-icon primary" style={{ width: 40, height: 40, fontSize: 16 }}>◈</div>
                            )}
                            <strong>{p.name}</strong>
                          </td>
                          <td>{formatCOP(p.base_price ?? 0)}</td>
                          <td>
                            <span className={`badge ${p.is_active ? 'badge-active' : 'badge-inactive'}`}>
                              {p.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${p.is_approved ? 'badge-approved' : 'badge-pending'}`}>
                              {p.is_approved ? 'Aprobado' : 'Pendiente'}
                            </span>
                          </td>
                          <td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
