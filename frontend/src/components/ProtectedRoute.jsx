import { Navigate, Outlet } from 'react-router-dom'
import { getCurrentUser } from '../services/authService'

export default function ProtectedRoute({ children, allowAllRoles = false }) {
  const usuario = getCurrentUser()

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Sin allowAllRoles: solo Administrador. Con allowAllRoles: cualquier usuario autenticado.
  if (!allowAllRoles && usuario.rol !== 'Administrador') {
    return <Navigate to="/login" replace />
  }

  return children || <Outlet />
}
