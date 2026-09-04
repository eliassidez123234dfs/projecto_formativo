import { useState, useEffect, useCallback } from 'react'
import { fetchAuditLogs } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import Pagination from '../components/Pagination'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'

/**
 * Componente principal de la página de auditoría.
 * Valida autenticación y rol de administrador, carga los registros
 * paginados y los presenta en una tabla de solo lectura.
 */
export default function AdminAudit() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)

  // Filtros
  const [filters, setFilters] = useState({
    usuario_admin: '',
    usuario_afectado: '',
    fecha_inicio: '',
    fecha_fin: '',
  })
  const [appliedFilters, setAppliedFilters] = useState({})

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (appliedFilters.usuario_admin) params.usuario_admin = appliedFilters.usuario_admin
      if (appliedFilters.usuario_afectado) params.usuario_afectado = appliedFilters.usuario_afectado
      if (appliedFilters.fecha_inicio) params.fecha_inicio = appliedFilters.fecha_inicio
      if (appliedFilters.fecha_fin) params.fecha_fin = appliedFilters.fecha_fin

      const data = await fetchAuditLogs(page, pageSize, params)
      const list = data.results || data
      setLogs(Array.isArray(list) ? list : [])
      setCount(data.count || list.length || 0)
      setError(null)
    } catch (err) { setLogs([]); setError(err) }
    finally { setLoading(false) }
  }, [page, pageSize, appliedFilters])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLogs();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadLogs])

  const handleApplyFilters = () => {
    setPage(1)
    setAppliedFilters({
      usuario_admin: filters.usuario_admin.trim(),
      usuario_afectado: filters.usuario_afectado.trim(),
      fecha_inicio: filters.fecha_inicio,
      fecha_fin: filters.fecha_fin,
    })
  }

  const handleClearFilters = () => {
    setPage(1)
    setFilters({ usuario_admin: '', usuario_afectado: '', fecha_inicio: '', fecha_fin: '' })
    setAppliedFilters({})
  }

  const hasActiveFilters = Object.values(appliedFilters).some(v => v)

  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  return (
    <AdminLayout title="Auditoría" subtitle="Registro de acciones de administradores sobre usuarios">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Admin ID</label>
              <input
                type="text"
                placeholder="ID del admin"
                value={filters.usuario_admin}
                onChange={e => setFilters(f => ({ ...f, usuario_admin: e.target.value }))}
                style={{ width: 100, padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Usuario ID</label>
              <input
                type="text"
                placeholder="ID del afectado"
                value={filters.usuario_afectado}
                onChange={e => setFilters(f => ({ ...f, usuario_afectado: e.target.value }))}
                style={{ width: 100, padding: '6px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Desde</label>
              <input
                type="date"
                value={filters.fecha_inicio}
                onChange={e => setFilters(f => ({ ...f, fecha_inicio: e.target.value }))}
                style={{ padding: '5px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4 }}>Hasta</label>
              <input
                type="date"
                value={filters.fecha_fin}
                onChange={e => setFilters(f => ({ ...f, fecha_fin: e.target.value }))}
                style={{ padding: '5px 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', fontSize: 13, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none' }}
              />
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleApplyFilters}>Buscar</button>
            {hasActiveFilters && (
              <button className="btn btn-sm btn-ghost" onClick={handleClearFilters}>Limpiar</button>
            )}
          </div>
        </div>
        <div className="admin-toolbar-right">
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{count} registros</span>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <Spinner text="Cargando registros..." />
        ) : error ? (
          <ErrorState error={error} module="auditoría" onRetry={loadLogs} />
        ) : logs.length === 0 ? (
          <div className="empty-state"><p>{hasActiveFilters ? 'No hay registros con los filtros seleccionados.' : 'No hay registros de auditoría.'}</p></div>
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

            <Pagination page={page} totalPages={totalPages} count={count} label="registros" onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
