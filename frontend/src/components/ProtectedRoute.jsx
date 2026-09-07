import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'

export default function ProtectedRoute({ children }) {
  const usuario = getCurrentUser()

  if (!usuario || usuario.rol !== 'Administrador') {
    return <Navigate to="/login" replace />
  }

  return children || <Outlet />
}
