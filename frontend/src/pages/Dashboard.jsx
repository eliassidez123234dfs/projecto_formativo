import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'

// User dashboard with profile editing, password change, and admin stats overview
export function Dashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    const usuario = getCurrentUser()

    if (!usuario) navigate('/login', { replace: true })
    else if (usuario.rol === 'Administrador') navigate('/admin', { replace: true })
    else navigate('/perfil', { replace: true })
  }, [navigate])

  return null
}
