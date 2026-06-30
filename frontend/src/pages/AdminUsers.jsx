import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminStats, createAdminUser } from '../services/api'
import MainLayout from '../components/MainLayout'
import UserFilters from '../components/UserFilters'
import UserList from '../components/UserList'
import FormModal from '../components/FormModal'
import { getCurrentUser } from '../services/authService'

function useUserStats() {
  const [stats, setStats] = useState({ total: 0, active: 0, admin: 0, blocked: 0 })

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await fetchAdminStats()
        if (!mounted) return
        setStats({
          total: data.usuarios?.total ?? 0,
          active: data.usuarios?.activos ?? 0,
          admin: data.usuarios?.administradores ?? 0,
          blocked: data.usuarios?.bloqueados ?? 0,
        })
      } catch { /* ignore */ }
    }
    load()
    return () => { mounted = false }
  }, [])

  return stats
}

// Admin user management page with stats, filtering, and create/edit modals
export default function AdminUsers() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({ page: 1, page_size: 20 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const stats = useUserStats()

  useEffect(() => {
    const usuario = getCurrentUser()
    if (!usuario || usuario.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  const onFiltersChange = useCallback((next) => {
    setFilters(prev => ({ ...prev, ...next, page: 1 }))
  }, [])

  const handleCreateUser = async (formData) => {
    setCreating(true)
    setCreateError(null)
    try {
      await createAdminUser(formData)
      setShowCreateModal(false)
      setRefreshKey(k => k + 1)
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const createFields = [
    { name: 'usuario', label: 'Nombre de usuario', type: 'text', placeholder: 'juan_doe', required: true },
    { name: 'correo', label: 'Correo', type: 'email', placeholder: 'juan@example.com', required: true },
    { name: 'password', label: 'Contraseña', type: 'password', required: true },
    { name: 'rol', label: 'Rol', type: 'select', required: true, options: [
      { value: 'Usuario', label: 'Usuario' },
      { value: 'Administrador', label: 'Administrador' },
    ]},
    { name: 'estado', label: 'Estado', type: 'select', value: 'Activo', options: [
      { value: 'Activo', label: 'Activo' },
      { value: 'Inactivo', label: 'Inactivo' },
      { value: 'Bloqueado', label: 'Bloqueado' },
    ]},
  ]

  const statCards = [
    { value: stats.total, label: 'Total Usuarios', icon: 'primary' },
    { value: stats.active, label: 'Usuarios Activos', icon: 'success' },
    { value: stats.admin, label: 'Administradores', icon: 'info' },
    { value: stats.blocked, label: 'Bloqueados', icon: 'warning' },
  ]

  return (
    <MainLayout title="Usuarios" subtitle="Administra los usuarios registrados en la plataforma">
      <div className="admin-stats">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-icon ${s.icon}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {s.icon === 'primary' && <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
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
        <div className="admin-toolbar-left">
          <UserFilters onChange={onFiltersChange} initial={filters} />
        </div>
        <div className="admin-toolbar-right">
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nuevo Usuario
          </button>
        </div>
      </div>

      <UserList key={refreshKey} filters={filters} onPageChange={(p) => setFilters(f => ({...f, page: p}))} onSaved={() => setRefreshKey(k => k + 1)} />

      <FormModal
        isOpen={showCreateModal}
        title="Crear Nuevo Usuario"
        onClose={() => { setShowCreateModal(false); setCreateError(null) }}
        onSubmit={handleCreateUser}
        fields={createFields}
        loading={creating}
        error={createError}
      />
    </MainLayout>
  )
}
