import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCurrentUser, isAuthenticated } from '../services/authService'

export function Dashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true })
      return
    }
    const usuario = getCurrentUser()
    if (!usuario) navigate('/login', { replace: true })
    else if (usuario.rol === 'Administrador') navigate('/admin', { replace: true })
    else navigate('/perfil', { replace: true })
  }, [navigate])

  return null
}
