import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import { buildApiUrl, fetchAdminStats } from '../services/api'

const Icons = {
  Package: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  ),
  ShoppingCart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  TrendingUp: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
    </svg>
  ),
}

export function Dashboard() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(null)
  const [formData, setFormData] = useState({})
  const [passwordForm, setPasswordForm] = useState({ contrasena_actual: '', contrasena_nueva: '', confirmar_contrasena: '' })
  const [activeTab, setActiveTab] = useState('perfil')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const usuarioData = localStorage.getItem('usuario')
    if (usuarioData) {
      const user = JSON.parse(usuarioData)
      setUsuario(user)
      setFormData(user)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!loading && !usuario) navigate('/login')
    else if (!loading && usuario?.rol !== 'Administrador') navigate('/perfil')
  }, [loading, usuario, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordForm(prev => ({ ...prev, [name]: value }))
  }

  const handleUpdatePerfil = async (e) => {
    e.preventDefault()
    setSaving(true); setErrors({}); setMessage('')
    const accessToken = localStorage.getItem('access_token')
    try {
      const response = await fetch(buildApiUrl('usuarios/actualizar_perfil/'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) setErrors(data)
      else {
        setMessage('Perfil actualizado exitosamente')
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
        setUsuario(data.usuario)
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setSaving(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setSaving(true); setErrors({}); setMessage('')
    const accessToken = localStorage.getItem('access_token')
    try {
      const response = await fetch(buildApiUrl('usuarios/cambiar_password/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(passwordForm),
      })
      const data = await response.json()
      if (!response.ok) setErrors(data)
      else {
        setMessage('Contraseña actualizada exitosamente')
        setPasswordForm({ contrasena_actual: '', contrasena_nueva: '', confirmar_contrasena: '' })
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setSaving(false) }
  }

  const [stats, setStats] = useState({ products: '—', users: '—', orders: '—', ventas: '—' })
  const isAdmin = usuario?.rol === 'Administrador'

  useEffect(() => {
    if (!isAdmin) return
    let mounted = true
    async function loadStats() {
      try {
        const data = await fetchAdminStats()
        if (!mounted) return
        setStats({
          products: data.productos?.total ?? '—',
          users: data.usuarios?.total ?? '—',
          orders: data.ordenes?.del_mes ?? '—',
          ventas: data.ordenes?.total_ventas != null ? '$' + parseFloat(data.ordenes.total_ventas).toLocaleString() : '—',
        })
      } catch { /* ignore */ }
    }
    loadStats()
    return () => { mounted = false }
  }, [isAdmin])

  if (loading) return <MainLayout><div className="card"><div className="empty-state"><p>Cargando...</p></div></div></MainLayout>
  if (!usuario) return <MainLayout><div className="card"><div className="empty-state"><p>No hay sesión activa</p></div></div></MainLayout>

  const quickActions = [
    { label: 'Ver Catálogo', action: () => navigate('/catalog'), variant: 'btn-secondary' },
    ...(isAdmin ? [
      { label: 'Panel Admin', action: () => navigate('/admin'), variant: 'btn-primary' },
      { label: 'Productos', action: () => navigate('/admin-products'), variant: 'btn-secondary' },
      { label: 'Usuarios', action: () => navigate('/admin-users'), variant: 'btn-secondary' },
      { label: 'Carritos', action: () => navigate('/admin-cart'), variant: 'btn-secondary' },
    ] : []),
    { label: 'Mi Carrito', action: () => navigate('/cart'), variant: 'btn-secondary' },
  ]

  const statCards = [
    { value: stats.products, label: 'Productos Activos', icon: Icons.Package, color: 'primary' },
    { value: stats.users, label: 'Usuarios Registrados', icon: Icons.Users, color: 'info' },
    { value: stats.orders, label: 'Órdenes del Mes', icon: Icons.ShoppingCart, color: 'success' },
    { value: stats.ventas, label: 'Ventas Totales', icon: Icons.TrendingUp, color: 'warning' },
  ]

  return (
    <MainLayout title="Dashboard" subtitle={`Bienvenido de nuevo, ${usuario.usuario}`}>
      {isAdmin && (
        <div className="admin-stats">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card">
              <div className={`stat-card-icon ${s.color}`}>
                <s.icon />
              </div>
              <div className="stat-card-body">
                <div className="stat-card-value">{s.value}</div>
                <div className="stat-card-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        {quickActions.map((action, i) => (
          <button key={i} className={`btn ${action.variant}`} onClick={action.action}>
            {action.label}
          </button>
        ))}
      </div>

      {message && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-lg)', marginBottom: 16,
          background: 'var(--color-success-light)', color: '#065f46', fontSize: 14,
          border: '1px solid var(--color-success)',
        }}>
          ✓ {message}
        </div>
      )}
      {errors.general && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-lg)', marginBottom: 16,
          background: 'var(--color-error-light)', color: '#991b1b', fontSize: 14,
          border: '1px solid var(--color-error)',
        }}>
          ✗ {errors.general}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>{activeTab === 'perfil' ? 'Mi Perfil' : 'Cambiar Contraseña'}</h3>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`btn btn-sm ${activeTab === 'perfil' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('perfil')}
            >
              Perfil
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'password' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('password')}
            >
              Contraseña
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: '24px' }}>
          {activeTab === 'perfil' && (
            <form onSubmit={handleUpdatePerfil} style={{ maxWidth: 500 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                  Nombre de Usuario
                </label>
                <input
                  type="text" name="usuario" value={formData.usuario || ''} onChange={handleChange}
                  disabled
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text)', fontSize: 14, outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                  Correo Electrónico
                </label>
                <input
                  type="email" name="correo" value={formData.correo || ''} onChange={handleChange}
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: 14, outline: 'none',
                  }}
                />
                {errors.correo && <p style={{ fontSize: 12, color: 'var(--color-error)', margin: '4px 0 0' }}>{errors.correo[0]}</p>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} style={{ maxWidth: 500 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                  Contraseña Actual
                </label>
                <input
                  type="password" name="contrasena_actual" value={passwordForm.contrasena_actual} onChange={handlePasswordChange}
                  required
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: 14, outline: 'none',
                  }}
                />
                {errors.contrasena_actual && <p style={{ fontSize: 12, color: 'var(--color-error)', margin: '4px 0 0' }}>{errors.contrasena_actual[0]}</p>}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                  Nueva Contraseña
                </label>
                <input
                  type="password" name="contrasena_nueva" value={passwordForm.contrasena_nueva} onChange={handlePasswordChange}
                  placeholder="Mín 8 caracteres, mayúscula, número y símbolo" required
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: 14, outline: 'none',
                  }}
                />
                {errors.contrasena_nueva && <p style={{ fontSize: 12, color: 'var(--color-error)', margin: '4px 0 0' }}>{errors.contrasena_nueva[0]}</p>}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--color-text)' }}>
                  Confirmar Contraseña
                </label>
                <input
                  type="password" name="confirmar_contrasena" value={passwordForm.confirmar_contrasena} onChange={handlePasswordChange} required
                  style={{
                    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', background: 'var(--color-bg)',
                    color: 'var(--color-text)', fontSize: 14, outline: 'none',
                  }}
                />
                {errors.confirmar_contrasena && <p style={{ fontSize: 12, color: 'var(--color-error)', margin: '4px 0 0' }}>{errors.confirmar_contrasena[0]}</p>}
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
