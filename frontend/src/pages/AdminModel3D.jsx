import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import AdminLayout from '../components/AdminLayout'
import FormModal from '../components/FormModal'
import Spinner from '../components/Spinner'
import {
  fetchModel3DList,
  fetchModel3D,
  createModel3D,
  updateModel3D,
  deleteModel3D,
} from '../services/api'

const FILE_TYPE_LABELS = {
  glb: 'GLB', gltf: 'GLTF', obj: 'OBJ', fbx: 'FBX', dae: 'DAE',
}

function boolToSelect(value) {
  return value ? 'true' : 'false'
}

function mapForm(fields, data) {
  return fields.reduce((acc, f) => {
    acc[f.name] = data[f.name]
    return acc
  }, {})
}

export default function AdminModel3D() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchModel3DList()
      setItems(Array.isArray(data) ? data : data.results || [])
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'No se pudieron cargar los modelos 3D')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormError(null)
    setShowForm(true)
  }

  const openEdit = async (item) => {
    setFormError(null)
    try {
      const data = await fetchModel3D(item.id)
      setEditing(data)
      setShowForm(true)
    } catch (err) {
      toast.error('No se pudo cargar el modelo 3D')
    }
  }

  const handleSave = async (form) => {
    setSaving(true)
    setFormError(null)
    const payload = {
      name: form.name,
      description: form.description,
      cloudinary_url: form.cloudinary_url,
      cloudinary_public_id: form.cloudinary_public_id,
      file_type: form.file_type,
      file_size: form.file_size ? Number(form.file_size) : null,
      is_active: form.is_active === 'true',
      is_approved: form.is_approved === 'true',
    }
    try {
      if (editing?.id) {
        await updateModel3D(editing.id, payload)
        toast.success('Modelo 3D actualizado')
      } else {
        await createModel3D(payload)
        toast.success('Modelo 3D creado')
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch (err) {
      const detail = err?.response?.data?.cloudinary_url?.[0]
        || err?.response?.data?.name?.[0]
        || err?.response?.data?.detail
        || 'Ocurrió un error al guardar'
      setFormError(String(detail))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar el modelo 3D "${item.name}"?`)) return
    try {
      await deleteModel3D(item.id)
      toast.success('Modelo 3D eliminado')
      load()
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'No se pudo eliminar')
    }
  }

  const modalFields = [
    { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Nombre del modelo', value: editing?.name },
    { name: 'description', label: 'Descripción', type: 'textarea', value: editing?.description },
    { name: 'cloudinary_url', label: 'URL Cloudinary', type: 'url', required: true, placeholder: 'https://res.cloudinary.com/...', value: editing?.cloudinary_url },
    { name: 'cloudinary_public_id', label: 'Public ID Cloudinary', type: 'text', value: editing?.cloudinary_public_id },
    { name: 'file_type', label: 'Tipo de archivo', type: 'select', options: Object.entries(FILE_TYPE_LABELS).map(([value, label]) => ({ value, label })), value: editing?.file_type || 'glb' },
    { name: 'file_size', label: 'Tamaño (bytes)', type: 'number', value: editing?.file_size },
    { name: 'is_active', label: 'Activo', type: 'select', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }], value: boolToSelect(editing?.is_active ?? true) },
    { name: 'is_approved', label: 'Aprobado', type: 'select', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }], value: boolToSelect(editing?.is_approved ?? false) },
  ]

  return (
    <AdminLayout title="Diseños 3D" subtitle="Administra los modelos 3D y diseños creados">
      <div className="admin-toolbar">
        <div className="admin-toolbar-left" />
        <div className="admin-toolbar-right">
          <button className="btn btn-primary" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo Modelo 3D
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <p style={{ color: 'var(--color-gray-600)', padding: '1rem' }}>No hay modelos 3D registrados.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vista previa</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Activo</th>
                  <th>Aprobado</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td>
                      {item.preview_images?.[0]?.cloudinary_url ? (
                        <img
                          src={item.preview_images[0].cloudinary_url}
                          alt={item.name}
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6 }}
                        />
                      ) : (
                        <span style={{ color: 'var(--color-gray-400)' }}>—</span>
                      )}
                    </td>
                    <td style={{ maxWidth: 240 }}>
                      <strong>{item.name}</strong>
                      {item.description && (
                        <div style={{ fontSize: 12, color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description}</div>
                      )}
                    </td>
                    <td>{FILE_TYPE_LABELS[item.file_type] || item.file_type}</td>
                    <td>
                      <span className={`badge ${item.is_active ? 'badge-activo' : 'badge-inactivo'}`}>
                        {item.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${item.is_approved ? 'badge-approved' : 'badge-pending'}`}>
                        {item.is_approved ? 'Aprobado' : 'Pendiente'}
                      </span>
                    </td>
                    <td style={{ fontSize: 13 }}>{new Date(item.updated_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(item)}>Editar</button>
                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-error)' }} onClick={() => handleDelete(item)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <FormModal
        isOpen={showForm}
        title={editing?.id ? 'Editar Modelo 3D' : 'Nuevo Modelo 3D'}
        onClose={() => setShowForm(false)}
        onSubmit={handleSave}
        fields={modalFields}
        loading={saving}
        error={formError}
      />
    </AdminLayout>
  )
}