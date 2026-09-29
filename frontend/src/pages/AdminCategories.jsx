import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../services/api'
import AdminLayout from '../components/AdminLayout'
import Spinner from '../components/Spinner'
import ErrorState from '../components/ErrorState'
import Pagination from '../components/Pagination'
import toast from 'react-hot-toast'

const emptyForm = { name: '', description: '', is_active: true }
const pageSize = 20

function errMsg(error, fallback) {
  const data = error?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  return Object.values(data).flat().join(' | ') || fallback
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCategories({ page })
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
      setCategories(results)
      setCount(typeof data?.count === 'number' ? data.count : results.length)
      setError(null)
    } catch (err) {
      setCategories([])
      setCount(0)
      setError({ message: 'Error al cargar las categorías.', status: err?.response?.status || null })
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    )
  }, [categories, search])

  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  const openCreate = () => {
    setForm(emptyForm)
    setEditing(null)
    setShowForm(true)
  }

  const handleEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active })
    setEditing(cat.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateCategory(editing, form)
        toast.success('Categoría actualizada')
      } else {
        await createCategory(form)
        toast.success('Categoría creada')
      }
      setShowForm(false)
      setEditing(null)
      setForm(emptyForm)
      load()
    } catch (err) {
      toast.error(errMsg(err, 'Error al guardar la categoría'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?\n\nSe quitarán las asignaciones a productos (los productos no se eliminan).`)) return
    setDeleting(cat.id)
    try {
      await deleteCategory(cat.id)
      toast.success('Categoría eliminada')
      load()
    } catch (err) {
      toast.error(errMsg(err, 'Error al eliminar la categoría'))
    } finally {
      setDeleting(null)
    }
  }

  return (
    <AdminLayout title="Categorías" subtitle="Administra las categorías del catálogo">
      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-card-body">
            <div className="stat-card-value">{count}</div>
            <div className="stat-card-label">Categorías registradas</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="admin-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <input
            className="form-control"
            placeholder="Buscar categorías..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 280 }}
          />
          <button className="btn btn-primary" onClick={() => { showForm ? setShowForm(false) : openCreate() }}>
            {showForm ? 'Cancelar' : '+ Nueva Categoría'}
          </button>
        </div>

        {showForm && (
          <div className="admin-form-card" style={{ background: 'var(--color-bg-tertiary, #f9fafb)', padding: 20, borderRadius: 12, marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="form-control"
                placeholder="Nombre"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
              <textarea
                className="form-control"
                placeholder="Descripción (opcional)"
                rows={3}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                />
                Activa
              </label>
              <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <Spinner text="Cargando categorías..." />
        ) : error ? (
          <ErrorState error={error} module="gestión de categorías" onRetry={load} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? 'No hay categorías que coincidan con la búsqueda.' : 'No hay categorías registradas.'}</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Productos</th>
                  <th>Activa</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(cat => (
                  <tr key={cat.id}>
                    <td data-label="ID">{cat.id}</td>
                    <td data-label="Nombre"><strong>{cat.name}</strong></td>
                    <td data-label="Descripción">{cat.description || '—'}</td>
                    <td data-label="Productos">{cat.product_count ?? '—'}</td>
                    <td data-label="Activa">
                      <span className={`badge ${cat.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {cat.is_active ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleEdit(cat)}>
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--color-error)' }}
                          disabled={deleting === cat.id}
                          onClick={() => handleDelete(cat)}
                        >
                          {deleting === cat.id ? '...' : 'Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} count={count} label="categorías" onPageChange={setPage} />
          </>
        )}
      </div>
    </AdminLayout>
  )
}
