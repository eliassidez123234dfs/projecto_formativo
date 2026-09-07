import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { updateMyProfile, changeMyPassword, fetchMyOrders } from '../services/api'
import { getCurrentUser, subscribe, updateUser } from '../services/authService'
import { formatCOP } from '../utils/format'
import '../styles/UserProfile.scss'

const ORDER_STATUS = {
  pendiente: { label: 'En procesamiento', badge: 'processing' },
  pagado: { label: 'En procesamiento', badge: 'processing' },
  produccion: { label: 'En procesamiento', badge: 'processing' },
  enviado: { label: 'En camino', badge: 'shipping' },
  entregado: { label: 'Realizado', badge: 'delivered' },
  cancelado: { label: 'Cancelado', badge: 'cancelled' },
}

function orderStatusLabel(status) {
  return ORDER_STATUS[status]?.label || status
}

function orderStatusBadge(status) {
  return ORDER_STATUS[status]?.badge || 'processing'
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function UserProfile() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(() => getCurrentUser())
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showPassForm, setShowPassForm] = useState(false)
  const [passData, setPassData] = useState({})
  const [savingPass, setSavingPass] = useState(false)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribe((u) => setUsuario(u))
    return unsub
  }, [])

  useEffect(() => {
    if (!usuario) navigate('/login')
  }, [usuario, navigate])

  useEffect(() => {
    if (!usuario) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchMyOrders()
        if (!cancelled) setOrders(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setOrders([])
      } finally {
        if (!cancelled) setOrdersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [usuario])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const data = await updateMyProfile(editData)
      const updated = data.usuario || { ...usuario, ...editData }
      // Actualizar en authService (mantiene localStorage + subscribers sincronizados)
      updateUser(updated)
      setUsuario(updated)
      setEditing(false)
      setMsg({ type: 'success', text: 'Perfil actualizado correctamente' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.response?.data?.detail || e?.response?.data?.mensaje || 'Error al actualizar' })
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (passData.nueva !== passData.confirmar) {
      setMsg({ type: 'error', text: 'Las contraseñas no coinciden' })
      return
    }
    setSavingPass(true)
    setMsg(null)
    try {
      await changeMyPassword({
        contrasena_actual: passData.actual,
        contrasena_nueva: passData.nueva,
        confirmar_contrasena: passData.confirmar,
      })
      setShowPassForm(false)
      setPassData({})
      setMsg({ type: 'success', text: 'Contraseña cambiada correctamente' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg({ type: 'error', text: e?.response?.data?.error || e?.response?.data?.detail || 'Error al cambiar contraseña' })
    } finally {
      setSavingPass(false)
    }
  }

  function startEdit() {
    setEditData({ usuario: usuario.usuario, correo: usuario.correo })
    setEditing(true)
    setMsg(null)
  }

  if (!usuario) return null

  const initials = usuario.usuario?.charAt(0).toUpperCase() || '?'

  return (
    <div className="profile-page">
      <Header />

      <div className="profile-content">
        {msg && (
          <div className={`profile-msg profile-msg--${msg.type}`}>
            {msg.text}
          </div>
        )}

        <h1 className="profile-title">Mi Cuenta</h1>

        <div className="profile-grid">
          <aside className="profile-card">
            <div className="profile-card__header">
              <div className="profile-card__avatar">{initials}</div>
              <h2 className="profile-card__name">{usuario.usuario}</h2>
              <p className="profile-card__email">{usuario.correo}</p>
            </div>
            <div className="profile-card__body">
              <div className="profile-stat">
                <span className="profile-stat__label">Estado</span>
                <span className={`profile-stat__value ${usuario.estado === 'Activo' ? 'profile-stat__value--active' : ''}`}>
                  {usuario.estado}
                </span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat__label">Miembro desde</span>
                <span className="profile-stat__value">
                  {usuario.fecha_registro
                    ? new Date(usuario.fecha_registro).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat__label">Email verificado</span>
                <span className={`profile-stat__value ${usuario.email_verificado ? 'profile-stat__value--verified' : 'profile-stat__value--unverified'}`}>
                  {usuario.email_verificado ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          </aside>

          <div className="profile-sections">
            <section className="profile-section">
              <div className="profile-section__header">
                <h3 className="profile-section__title">Información personal</h3>
                {!editing && (
                  <button className="profile-btn--outline" onClick={startEdit}>Editar perfil</button>
                )}
              </div>

              {!editing ? (
                <div className="profile-field-grid">
                  <div className="profile-field">
                    <label>Usuario</label>
                    <p>{usuario.usuario}</p>
                  </div>
                  <div className="profile-field">
                    <label>Correo electrónico</label>
                    <p>{usuario.correo}</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveProfile}>
                  <div className="profile-field-grid">
                    <div className="profile-field">
                      <label>Usuario</label>
                      <input
                        className="profile-input"
                        value={editData.usuario}
                        onChange={e => setEditData(p => ({ ...p, usuario: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="profile-field">
                      <label>Correo electrónico</label>
                      <input
                        className="profile-input"
                        type="email"
                        value={editData.correo}
                        onChange={e => setEditData(p => ({ ...p, correo: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button className="profile-btn profile-btn--primary" disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button type="button" className="profile-btn--outline" onClick={() => { setEditing(false); setMsg(null) }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="profile-section">
              <div className="profile-section__header">
                <h3 className="profile-section__title">Seguridad</h3>
                {!showPassForm && (
                  <button className="profile-btn--outline" onClick={() => setShowPassForm(true)}>
                    Cambiar contraseña
                  </button>
                )}
              </div>

              {showPassForm && (
                <form onSubmit={handleChangePassword}>
                  <div className="profile-pass-grid">
                    <div className="profile-field">
                      <label>Contraseña actual</label>
                      <input
                        className="profile-input"
                        type="password"
                        value={passData.actual || ''}
                        onChange={e => setPassData(p => ({ ...p, actual: e.target.value }))}
                        required
                        placeholder="Ingresa tu contraseña actual"
                      />
                    </div>
                    <div className="profile-field">
                      <label>Nueva contraseña</label>
                      <input
                        className="profile-input"
                        type="password"
                        value={passData.nueva || ''}
                        onChange={e => setPassData(p => ({ ...p, nueva: e.target.value }))}
                        required minLength={8}
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                    <div className="profile-field">
                      <label>Confirmar nueva contraseña</label>
                      <input
                        className="profile-input"
                        type="password"
                        value={passData.confirmar || ''}
                        onChange={e => setPassData(p => ({ ...p, confirmar: e.target.value }))}
                        required minLength={8}
                        placeholder="Repite la contraseña"
                      />
                    </div>
                  </div>
                  <div className="profile-actions">
                    <button className="profile-btn profile-btn--primary" disabled={savingPass}>
                      {savingPass ? 'Guardando...' : 'Cambiar contraseña'}
                    </button>
                    <button type="button" className="profile-btn--outline" onClick={() => { setShowPassForm(false); setPassData({}); setMsg(null) }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </section>
          <section className="profile-section">
              <div className="profile-section__header">
                <h3 className="profile-section__title">Mis pedidos</h3>
              </div>

              {ordersLoading ? (
                <p className="profile-orders__empty">Cargando pedidos...</p>
              ) : orders.length === 0 ? (
                <p className="profile-orders__empty">Todavía no has realizado pedidos.</p>
              ) : (
                <ul className="profile-orders">
                  {orders.map(o => (
                    <li key={o.id} className="profile-order">
                      <div className="profile-order__main">
                        <div className="profile-order__head">
                          <span className="profile-order__number">{o.order_number}</span>
                          <span className={`profile-order__badge profile-order__badge--${orderStatusBadge(o.status)}`}>
                            {orderStatusLabel(o.status)}
                          </span>
                        </div>
                        <div className="profile-order__dates">
                          <span>Pedido: <strong>{formatDate(o.created_at)}</strong></span>
                          {o.status === 'entregado' && (
                            <span>Entregado el: <strong>{formatDate(o.delivered_at)}</strong></span>
                          )}
                        </div>
                      </div>
                      <div className="profile-order__side">
                        <span className="profile-order__items">
                          {o.items_count} {o.items_count === 1 ? 'artículo' : 'artículos'}
                        </span>
                        <span className="profile-order__total">{formatCOP(o.total)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
