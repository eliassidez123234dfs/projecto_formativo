import { useState, useEffect } from 'react'
import MainLayout from '../components/MainLayout'
import ProductList from '../components/ProductList'
import ProductForm from '../components/ProductForm'

function useAdminStats() {
  const [stats, setStats] = useState({ total: 0, active: 0, approved: 0, pending: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      const token = localStorage.getItem('access_token')
      const headers = token ? { Authorization: 'Bearer ' + token } : {}
      try {
        const res = await fetch('/api/admin/stats/', { headers })
        const data = await res.json()
        if (!mounted) return
        setStats({
          total: data.productos?.total ?? 0,
          active: data.productos?.activos ?? 0,
          approved: data.productos?.aprobados ?? 0,
          pending: data.productos?.no_aprobados ?? 0,
        })
      } catch { /* ignore */ }
      finally { if (mounted) setLoading(false) }
    }
    load()
    return () => { mounted = false }
  }, [])

  return { stats, loading }
}

export default function AdminProducts() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingProduct, setEditingProduct] = useState(null)
  const { stats } = useAdminStats()

  async function openEdit(productId) {
    const response = await fetch(`/api/products/${productId}/`)
    const data = await response.json()
    setEditingProduct(data)
    setShowForm(true)
  }

  async function toggleActive(productId) {
    await fetch(`/api/products/${productId}/toggle-active/`, { method: 'PATCH' })
    setRefreshKey(k => k + 1)
  }

  const statCards = [
    { value: stats.total, label: 'Total Productos', icon: 'primary' },
    { value: stats.active, label: 'Productos Activos', icon: 'success' },
    { value: stats.approved, label: 'Aprobados', icon: 'info' },
    { value: stats.pending, label: 'Pendientes', icon: 'warning' },
  ]

  return (
    <MainLayout
      title="Productos"
      subtitle="Administra el catálogo de productos de la plataforma"
    >
      <div className="admin-stats">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${s.icon}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {s.icon === 'primary' && <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></>}
                {s.icon === 'success' && <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                {s.icon === 'info' && <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>}
                {s.icon === 'warning' && <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>}
              </svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left" />
        <div className="admin-toolbar-right">
          <button
            className="btn btn-primary"
            onClick={() => { setEditingProduct(null); setShowForm(true) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <ProductList key={refreshKey} refreshKey={refreshKey} onEdit={openEdit} onToggle={toggleActive} />
        </div>
      </div>

      {showForm && (
        <ProductForm
          key={editingProduct?.id || 'new'}
          product={editingProduct}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            setEditingProduct(null)
            setRefreshKey(k => k + 1)
          }}
        />
      )}
    </MainLayout>
  )
}
