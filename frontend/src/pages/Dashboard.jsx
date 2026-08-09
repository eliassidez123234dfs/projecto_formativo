import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

// User dashboard with profile editing, password change, and admin stats overview
export function Dashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    let usuario = null
    try { usuario = JSON.parse(localStorage.getItem('usuario')) } catch {}

    if (!usuario) navigate('/login', { replace: true })
    else if (usuario.rol === 'Administrador') navigate('/admin', { replace: true })
    else navigate('/perfil', { replace: true })
  }, [navigate])

  return null
}
