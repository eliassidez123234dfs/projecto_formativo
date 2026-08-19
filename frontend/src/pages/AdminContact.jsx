import { useState, useEffect, useCallback } from 'react'
import { fetchContactMessages, markContactRead, deleteContactMessage } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import InfoModal from '../components/InfoModal'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'

/**
 * Página principal de la bandeja de contacto administrativa.
 * Valida rol de administrador, carga los mensajes y maneja
 * las acciones de marcar como leído y eliminar.
 */
export default function AdminContact() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({ total: 0, unread: 0 })
  const [viewMsg, setViewMsg] = useState(null)
  const [modal, setModal] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchContactMessages(page)
      const list = data.results || data
      setMessages(Array.isArray(list) ? list : [])
      setTotalPages(Math.max(1, Math.ceil((data.count || 0) / 20)))
      setStats({
        total: data.count || list.length || 0,
        unread: (Array.isArray(list) ? list : []).filter(m => !m.leido).length,
      })
    } catch (err) { setMessages([]); setError(err) }
    finally { setLoading(false) }
  }, [page])

  useEffect(() => { loadMessages() }, [loadMessages])

  async function marcarLeido(id) {
    try {
      await markContactRead(id)
      loadMessages()
    } catch { setModal({ type: 'error', title: 'Error', message: 'No se pudo marcar como leído.' }) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este mensaje?')) return
    try {
      await deleteContactMessage(id)
      loadMessages()
    } catch { setModal({ type: 'error', title: 'Error', message: 'No se pudo eliminar el mensaje.' }) }
  }

  const statCards = [
    { value: stats.total, label: 'Total Mensajes', color: 'primary' },
    { value: stats.unread, label: 'No leídos', color: 'warning' },
    { value: stats.total - stats.unread, label: 'Leídos', color: 'success' },
  ]

  console.log('MENSAJE SELECCIONADO: ', viewMsg)
  return (
    <AdminLayout title="Contacto" subtitle="Mensajes recibidos del formulario de contacto">
      {modal && (
        <InfoModal type={modal.type} title={modal.title} message={modal.message} onClose={() => setModal(null)} />
      )}
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
          <Spinner text="Cargando mensajes..." />
        ) : error ? (
          <ErrorState error={error} module="mensajes de contacto" onRetry={loadMessages} />
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
            <Pagination page={page} totalPages={totalPages} count={stats.total} label="mensajes" onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  )
}