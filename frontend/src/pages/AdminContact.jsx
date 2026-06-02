import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MainLayout from '../components/MainLayout'
import InfoModal from '../components/InfoModal'

export default function AdminContact() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, unread: 0 })
  const [viewMsg, setViewMsg] = useState(null)

  function authHeaders() {
    const t = localStorage.getItem('access_token')
    return t ? { Authorization: 'Bearer ' + t } : {}
  }

  useEffect(() => {
    const u = (() => { try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null } })()
    if (!u || u.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  useEffect(() => { loadMessages() }, [])

  async function loadMessages() {
    setLoading(true)
    try {
      const res = await fetch('/api/contacto/', { headers: authHeaders() })
      if (!res.ok) { setMessages([]); return }
      const data = await res.json()
      const list = data.results || data
      setMessages(Array.isArray(list) ? list : [])
      setStats({
        total: data.count || list.length || 0,
        unread: (Array.isArray(list) ? list : []).filter(m => !m.leido).length,
      })
    } catch { setMessages([]) }
    finally { setLoading(false) }
  }

  async function marcarLeido(id) {
    try {
      const res = await fetch(`/api/contacto/${id}/marcar_leido/`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      })
      if (res.ok) loadMessages()
    } catch { /* ignore */ }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este mensaje?')) return
    try {
      await fetch(`/api/contacto/${id}/eliminar/`, {
        method: 'DELETE', headers: authHeaders(),
      })
      loadMessages()
    } catch { /* ignore */ }
  }

  const statCards = [
    { value: stats.total, label: 'Total Mensajes', color: 'primary' },
    { value: stats.unread, label: 'No leídos', color: 'warning' },
    { value: stats.total - stats.unread, label: 'Leídos', color: 'success' },
  ]

  return (
    <MainLayout title="Contacto" subtitle="Mensajes recibidos del formulario de contacto">
      {viewMsg && (
        <InfoModal
          type="info"
          title={`Mensaje de ${viewMsg.nombre}`}
          message={`De: ${viewMsg.nombre} (${viewMsg.correo})\nAsunto: ${viewMsg.asunto || 'Sin asunto'}\n\n${viewMsg.mensaje}`}
          onClose={() => setViewMsg(null)}
        />
      )}

      <div className="admin-stats">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-card-body`}>
              <div className="stat-card-value">{s.value}</div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Cargando mensajes...</p></div>
        ) : messages.length === 0 ? (
          <div className="empty-state"><p>No hay mensajes de contacto.</p></div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Asunto</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {messages.map(m => (
                  <tr key={m.id}>
                    <td><code>{m.id}</code></td>
                    <td><strong>{m.nombre}</strong></td>
                    <td>{m.correo}</td>
                    <td>{m.asunto || '—'}</td>
                    <td>
                      <span className={`badge ${m.leido ? 'badge-approved' : 'badge-pending'}`}>
                        {m.leido ? 'Leído' : 'No leído'}
                      </span>
                    </td>
                    <td>{m.fecha_envio ? new Date(m.fecha_envio).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-ghost" onClick={() => setViewMsg(m)}>Ver</button>
                        {!m.leido && (
                          <button className="btn btn-sm btn-ghost" onClick={() => marcarLeido(m.id)}>
                            Marcar leído
                          </button>
                        )}
                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-error)' }} onClick={() => eliminar(m.id)}>
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </MainLayout>
  )
}