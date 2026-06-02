import React, { useState } from 'react'
import FormModal from './FormModal'

export default function UserEditModal({ user, onClose, onSaved }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (formData) => {
    setSaving(true)
    setError(null)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/admin/usuarios/${user.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })
      const data = await (async () => { try { return await res.json() } catch { return {} } })()
      if (!res.ok) {
        const known = { usuario: 'Nombre de usuario', correo: 'Correo', contrasena: 'Contraseña', rol: 'Rol', estado: 'Estado', email_verificado: 'Email verificado' }
        const parts = []
        for (const [key, msgs] of Object.entries(data)) {
          if (key === 'detail' || key === 'error') parts.push(Array.isArray(msgs) ? msgs[0] : msgs)
          else {
            const label = known[key] || key
            const msg = Array.isArray(msgs) ? msgs[0] : msgs
            parts.push(`${label}: ${msg}`)
          }
        }
        setError(parts.join('. ') || 'Error al guardar')
      } else {
        if (typeof onSaved === 'function') onSaved(data)
        onClose()
      }
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
