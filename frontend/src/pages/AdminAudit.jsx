/**
 * AdminAudit — Logs de auditoría del sistema.
 * Muestra en una tabla paginada y de solo lectura todas las acciones
 * realizadas por administradores sobre usuarios: quién hizo qué,
 * a quién afectó, cuándo y desde qué dirección IP.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAuditLogs } from '../services/api'
import MainLayout from '../components/MainLayout'
import { getCurrentUser } from '../services/authService'

/**
 * Componente principal de la página de auditoría.
 * Valida autenticación y rol de administrador, carga los registros
 * paginados y los presenta en una tabla de solo lectura.
 */
export default function AdminAudit() {
  const navigate = useNavigate()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  useEffect(() => {
    const u = getCurrentUser()
    if (!u || u.rol !== 'Administrador') navigate('/login')
  }, [navigate])

  useEffect(() => { loadLogs() }, [page])

  async function loadLogs() {
    setLoading(true)
    try {
      const data = await fetchAuditLogs(page, pageSize)
      const list = data.results || data
      setLogs(Array.isArray(list) ? list : [])
      setCount(data.count || list.length || 0)
    } catch { setLogs([]) }
    finally { setLoading(false) }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  return (
    <MainLayout title="Auditoría" subtitle="Registro de acciones de administradores sobre usuarios">
      <div className="card">
        {loading ? (
          <div className="empty-state"><p>Cargando registros...</p></div>
        ) : logs.length === 0 ? (
          <div className="empty-state"><p>No hay registros de auditoría.</p></div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Admin</th>
                  <th>Acción</th>
                  <th>Usuario afectado</th>
                  <th>Fecha</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td><code>{log.id}</code></td>
                    <td><strong>{log.usuario_admin?.usuario || '—'}</strong></td>
                    <td>{log.accion}</td>
                    <td>{log.usuario_afectado?.usuario || '—'}</td>
                    <td>{log.fecha_accion ? new Date(log.fecha_accion).toLocaleString() : '—'}</td>
                    <td><code>{log.ip_admin || '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <button className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                ← Anterior
              </button>
              <span className="pagination-info">Página {page} de {totalPages} — {count} registros</span>
              <button className="btn btn-sm btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                Siguiente →
              </button>
            </div>
          </>
        )}
      </div>
    </MainLayout>
  )
}