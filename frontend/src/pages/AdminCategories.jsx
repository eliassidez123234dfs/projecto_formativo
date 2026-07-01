import { useState, useEffect, useCallback } from 'react'
import { fetchCategories, createCategory, updateCategory, deleteCategory } from '../services/api'
import MainLayout from '../components/MainLayout'
import toast from 'react-hot-toast'

const emptyForm = { name: '', description: '', is_active: true }

export const AdminCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    try {
      const data = await fetchCategories()
      setCategories(data?.results || data || [])
    } catch { toast.error('Error al cargar categorías') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('El nombre es obligatorio'); return }
    try {
      if (editing) {
        await updateCategory(editing, form)
        toast.success('Categoría actualizada')
      } else {
        await createCategory(form)
        toast.success('Categoría creada')
      }
      setShowForm(false); setEditing(null); setForm(emptyForm)
      load()
    } catch { toast.error('Error al guardar') }
  }

  const handleEdit = (cat) => {
    setForm({ name: cat.name, description: cat.description || '', is_active: cat.is_active })
    setEditing(cat.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return
    try { await deleteCategory(id); toast.success('Eliminada'); load() }
    catch { toast.error('Error al eliminar') }
  }

  if (loading) return <div className="loading">Cargando categorías...</div>

  return (
    <MainLayout title="Categorías" subtitle="Administra las categorías de productos">
    <div className="admin-categories">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <h2 style={{ margin: 0, fontSize: 18 }}>Categorías</h2>
          <span className="item-count">{categories.length} categorías</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditing(null); setForm(emptyForm) }}>
          {showForm ? 'Cancelar' : '+ Nueva Categoría'}
        </button>
      </div>

      {showForm && (
        <div className="admin-form-card" style={{ background: 'var(--color-bg-tertiary)', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="form-control" placeholder="Nombre" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            <textarea className="form-control" placeholder="Descripción (opcional)" rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} />
              Activa
            </label>
            <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}

      <div className="table-responsive">
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
            {categories.map(cat => (
              <tr key={cat.id}>
                <td data-label="ID">{cat.id}</td>
                <td data-label="Nombre"><strong>{cat.name}</strong></td>
                <td data-label="Descripción">{cat.description || '—'}</td>
                <td data-label="Productos">{cat.product_count ?? '—'}</td>
                <td data-label="Activa">{cat.is_active ? '✓' : '✗'}</td>
                <td data-label="Acciones">
                  <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleEdit(cat)}>Editar</button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(cat.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>No hay categorías</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <style>{`
        .admin-categories .item-count {
          font-size: 13px;
          color: var(--color-text-muted, #9CA3AF);
        }
        .admin-form-card input, .admin-form-card textarea {
          max-width: 480px;
        }
        .admin-form-card label {
          color: var(--color-text-secondary, #6B7280);
        }
      `}</style>
    </div>
    </MainLayout>
  )
}
