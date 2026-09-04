import { useState } from 'react'
import { updateAdminUser } from '../services/api'
import FormModal from './FormModal'

export default function UserEditModal({ user, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (formData) => {
    setSaving(true)
    setError(null)
    try {
      const data = await updateAdminUser(user.id, formData)
      if (typeof onSaved === 'function') onSaved(data)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const editFields = [
    { name: 'usuario', label: 'Nombre de usuario', value: user.usuario },
    { name: 'correo', label: 'Correo', type: 'email', value: user.correo },
    { name: 'estado', label: 'Estado', type: 'select', value: user.estado, options: [
      { value: 'Activo', label: 'Activo' },
      { value: 'Inactivo', label: 'Inactivo' },
      { value: 'Bloqueado', label: 'Bloqueado' }
    ]},
    { name: 'rol', label: 'Rol', type: 'select', value: user.rol, options: [
      { value: 'Usuario', label: 'Usuario' },
      { value: 'Administrador', label: 'Administrador' }
    ]},
  ]

  return (
    <FormModal
      isOpen={true}
      title="Editar usuario"
      onClose={onClose}
      onSubmit={handleSubmit}
      fields={editFields}
      loading={saving}
      error={error}
    />
  )
}
