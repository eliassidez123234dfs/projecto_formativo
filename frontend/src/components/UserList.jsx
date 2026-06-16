import { useEffect, useState } from 'react'
import { fetchAdminUsers, adminUserAction } from '../services/api'
import UserEditModal from './UserEditModal'
import InfoModal from './InfoModal'

export default function UserList({ filters, onPageChange, onSaved }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const [next, setNext] = useState(null)
  const [previous, setPrevious] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    let aborted = false
    ;(async () => {
      setLoading(true)
      try {
        const data = await fetchAdminUsers(filters)
        const list = data.results || data
        if (!aborted) {
          setUsers(list)
          setCount(data.count || list.length)
          setNext(data.next || null)
          setPrevious(data.previous || null)
        }
      } catch (e) { console.error(e) }
      finally { if (!aborted) setLoading(false) }
    })()
    return () => { aborted = true }
  }, [filters])

  async function doAction(userId, action, payload = {}) {
    setActionLoading(`${action}-${userId}`)
    try {
      const data = await adminUserAction(userId, action, payload)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...(data.usuario || {}) } : u))
      setModal({ type: 'success', title: '', message: data.mensaje || 'Acción completada' })
    } catch (e) {
      setModal({ type: 'error', title: 'Error', message: e.response?.data?.error || e.response?.data?.detail || e.message })
    } finally {
      setActionLoading(null)
    }
  }

  async function cambiarEstado(user) {
    const estados = ['Activo', 'Inactivo', 'Bloqueado']
    const current = estados.indexOf(user.estado)
    const next = estados[(current + 1) % estados.length]
    await doAction(user.id, 'cambiar_estado', { estado: next, motivo: `Cambiado a ${next} por administrador` })
  }

  async function desbloquear(userId) {
    await doAction(userId, 'desbloquear')
  }

  async function resetearPassword(userId) {
    if (!confirm('¿Estás seguro de resetear la contraseña de este usuario?')) return
    await doAction(userId, 'resetear_password')
  }

  async function eliminar(userId) {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción es reversible por otro administrador.')) return
    await doAction(userId, 'eliminar_logicamente')
  }

  if (loading) return <div className="card"><div className="empty-state"><p>Cargando usuarios...</p></div></div>
  if (!users.length) return <div className="card"><div className="empty-state"><p>No se encontraron usuarios.</p></div></div>

  const page = Number(filters.page || 1)
  const pageSize = Number(filters.page_size || 20)
  const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize))

  return (
    <div className="card">
      {modal && <InfoModal type={modal.type} title={modal.title} message={modal.message} onClose={() => setModal(null)} />}

      <div className="card-body">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Estado</th>
              <th>Rol</th>
              <th>Fecha registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={u.eliminado ? 'row-eliminado' : ''}>
                <td><code>{u.id}</code></td>
                <td><strong style={u.eliminado ? { textDecoration: 'line-through', opacity: 0.6 } : {}}>{u.usuario}</strong></td>
                <td>{u.correo}</td>
                <td>
                  {u.eliminado ? (
                    <span className="badge badge-eliminado">Eliminado</span>
                  ) : (
                    <span className={`badge badge-${u.estado.toLowerCase()}`}>
                      {u.estado}
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge ${u.rol === 'Administrador' ? 'badge-admin' : 'badge-user'}`}>
                    {u.rol}
                  </span>
                </td>
                <td>{new Date(u.fecha_registro).toLocaleDateString()}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => setEditingUser(u)}>
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => cambiarEstado(u)}
                      disabled={actionLoading === `cambiar_estado-${u.id}`}
                    >
                      Estado → {u.estado === 'Activo' ? 'Inactivo' : u.estado === 'Inactivo' ? 'Bloqueado' : 'Activo'}
                    </button>
                    {u.estado === 'Bloqueado' && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => desbloquear(u.id)}
                        disabled={actionLoading === `desbloquear-${u.id}`}
                      >
                        Desbloquear
                      </button>
                    )}
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => resetearPassword(u.id)}
                      disabled={actionLoading === `resetear_password-${u.id}`}
                    >
                      Resetear Pass
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      style={{ color: 'var(--color-error)' }}
                      onClick={() => eliminar(u.id)}
                      disabled={actionLoading === `eliminar_logicamente-${u.id}`}
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null)
            if (typeof onSaved === 'function') onSaved()
            if (typeof onPageChange === 'function') onPageChange(page)
          }}
        />
      )}

      <div className="pagination">
        <button className="btn btn-sm btn-secondary" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          ← Anterior
        </button>
        <span className="pagination-info">Página {page} de {totalPages} — {count} usuarios</span>
        <button className="btn btn-sm btn-secondary" onClick={() => onPageChange(page + 1)} disabled={!next || page >= totalPages}>
          Siguiente →
        </button>
      </div>
    </div>
  )
}
