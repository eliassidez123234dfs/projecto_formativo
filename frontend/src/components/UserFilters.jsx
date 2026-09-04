import { useState, useEffect } from 'react'

export default function UserFilters({ onChange, initial }) {
  const [search, setSearch] = useState(initial.search || '')
  const [estado, setEstado] = useState(initial.estado || '')
  const [rol, setRol] = useState(initial.rol || '')
  const [pageSize, setPageSize] = useState(initial.page_size || 20)

  useEffect(() => {
    const t = setTimeout(() => {
      onChange({ search, estado, rol, page_size: pageSize })
    }, 400)
    return () => clearTimeout(t)
  }, [search, estado, rol, pageSize, onChange])

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="search-input" style={{ maxWidth: 260 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <select
        value={estado}
        onChange={e => setEstado(e.target.value)}
        style={{
          padding: '8px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
          background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13,
          outline: 'none', cursor: 'pointer', minWidth: 120,
        }}
      >
        <option value="">Todos estados</option>
        <option value="Activo">Activo</option>
        <option value="Inactivo">Inactivo</option>
        <option value="Bloqueado">Bloqueado</option>
      </select>
      <select
        value={rol}
        onChange={e => setRol(e.target.value)}
        style={{
          padding: '8px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
          background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13,
          outline: 'none', cursor: 'pointer', minWidth: 120,
        }}
      >
        <option value="">Todos roles</option>
        <option value="Administrador">Administrador</option>
        <option value="Usuario">Usuario</option>
      </select>
      <select
        value={pageSize}
        onChange={e => setPageSize(Number(e.target.value))}
        style={{
          padding: '8px 12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
          background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13,
          outline: 'none', cursor: 'pointer', minWidth: 100,
        }}
      >
        <option value={10}>10 / pág</option>
        <option value={25}>25 / pág</option>
        <option value={50}>50 / pág</option>
      </select>
    </div>
  )
}
