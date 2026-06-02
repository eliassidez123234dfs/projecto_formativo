import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'

export default function UserProfile() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null }
  })
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [showPassForm, setShowPassForm] = useState(false)
  const [passData, setPassData] = useState({})
  const [savingPass, setSavingPass] = useState(false)

  useEffect(() => {
    if (!usuario) navigate('/login')
  }, [usuario, navigate])

  async function handleSaveProfile(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/usuarios/${usuario.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editData),
      })
      const data = await (async () => { try { return await res.json() } catch { return {} } })()
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || data.detail || 'Error al actualizar' })
        return
      }
      const updated = { ...usuario, ...(data.usuario || editData) }
      localStorage.setItem('usuario', JSON.stringify(updated))
      setUsuario(updated)
      setEditing(false)
      setMsg({ type: 'success', text: 'Perfil actualizado correctamente' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg({ type: 'error', text: 'Error de conexión' })
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
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/usuarios/${usuario.id}/resetear_password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ nueva_contrasena: passData.nueva }),
      })
      const data = await (async () => { try { return await res.json() } catch { return {} } })()
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || data.detail || 'Error al cambiar contraseña' })
        return
      }
      setShowPassForm(false)
      setPassData({})
      setMsg({ type: 'success', text: 'Contraseña cambiada correctamente' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e) {
      setMsg({ type: 'error', text: 'Error de conexión' })
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
          <aside className="profile-card-left">
            <div className="profile-card-header">
              <div className="profile-avatar">{initials}</div>
              <h2>{usuario.usuario}</h2>
              <p>{usuario.correo}</p>
            </div>
            <div className="profile-card-body">
              <div className="profile-stat">
                <span className="profile-stat-label">Estado</span>
                <span className={`profile-stat-value ${usuario.estado === 'Activo' ? 'badge-active' : ''}`}>
                  {usuario.estado}
                </span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">Miembro desde</span>
                <span className="profile-stat-value">
                  {usuario.fecha_registro
                    ? new Date(usuario.fecha_registro).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
                    : '—'}
                </span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-label">Email verificado</span>
                <span className="profile-stat-value" style={{ color: usuario.email_verificado ? '#16A34A' : '#D97706' }}>
                  {usuario.email_verificado ? 'Sí' : 'No'}
                </span>
              </div>
            </div>
          </aside>

          <div className="profile-sections">
            <section className="profile-section">
              <div className="profile-section-header">
                <h3 className="profile-section-title">Información personal</h3>
                {!editing && (
                  <button className="btn-secondary-sm" onClick={startEdit}>Editar perfil</button>
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
                    <button className="btn btn-primary" disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button type="button" className="btn-secondary-sm" onClick={() => { setEditing(false); setMsg(null) }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </section>

            <section className="profile-section">
              <div className="profile-section-header">
                <h3 className="profile-section-title">Seguridad</h3>
                {!showPassForm && (
                  <button className="btn-secondary-sm" onClick={() => setShowPassForm(true)}>
                    Cambiar contraseña
                  </button>
                )}
              </div>

              {showPassForm && (
                <form onSubmit={handleChangePassword}>
                  <div style={{ display: 'grid', gap: 16, maxWidth: 400 }}>
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
                      <label>Confirmar contraseña</label>
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
                    <button className="btn btn-primary" disabled={savingPass}>
                      {savingPass ? 'Guardando...' : 'Cambiar contraseña'}
                    </button>
                    <button type="button" className="btn-secondary-sm" onClick={() => { setShowPassForm(false); setPassData({}); setMsg(null) }}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .profile-page {
          min-height: 100vh;
          background: var(--color-bg-secondary);
        }
        .profile-content {
          max-width: 1000px;
          margin: 2rem auto;
          padding: 0 1.5rem;
        }
        .profile-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 1.5rem;
        }
        .profile-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          gap: 1.5rem;
          align-items: start;
        }

        .profile-card-left {
          background: white;
          border-radius: 12px;
          border: 1px solid #F3F4F6;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          overflow: hidden;
          position: sticky;
          top: 80px;
        }
        .profile-card-header {
          background: #DC2626;
          padding: 1.5rem;
          text-align: center;
          color: white;
        }
        .profile-card-header h2 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }
        .profile-card-header p {
          margin: 4px 0 0;
          font-size: 0.8rem;
          color: rgba(255,255,255,0.8);
        }
        .profile-avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 auto 0.75rem;
          border: 2px solid rgba(255,255,255,0.4);
        }
        .profile-card-body {
          padding: 1rem 1.25rem;
        }
        .profile-stat {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0;
          border-bottom: 1px solid #F9FAFB;
          font-size: 0.85rem;
        }
        .profile-stat:last-child { border-bottom: none; }
        .profile-stat-label { color: #9CA3AF; }
        .profile-stat-value { font-weight: 500; color: #111827; }
        .badge-active { color: #16A34A; font-weight: 600; }

        .profile-sections {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .profile-section {
          background: white;
          border-radius: 12px;
          border: 1px solid #F3F4F6;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          padding: 1.25rem 1.5rem;
        }
        .profile-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .profile-section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }
        .btn-secondary-sm {
          padding: 6px 14px;
          font-size: 0.8rem;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          background: white;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-secondary-sm:hover {
          border-color: #DC2626;
          color: #DC2626;
        }
        .profile-field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .profile-field label {
          display: block;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9CA3AF;
          margin-bottom: 0.25rem;
        }
        .profile-field p {
          font-size: 0.9rem;
          color: #111827;
          font-weight: 500;
          margin: 0;
        }
        .profile-input {
          width: 100%;
          padding: 8px 10px;
          font-size: 0.9rem;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          background: white;
          color: #111827;
          outline: none;
        }
        .profile-input:focus {
          border-color: #DC2626;
          box-shadow: 0 0 0 2px rgba(220,38,38,0.1);
        }
        .profile-actions {
          display: flex;
          gap: 10px;
          margin-top: 1rem;
        }
        .profile-msg {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
          line-height: 1.5;
        }
        .profile-msg--success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .profile-msg--error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }

        @media (max-width: 768px) {
          .profile-grid {
            grid-template-columns: 1fr;
          }
          .profile-card-left {
            position: static;
          }
          .profile-field-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
