import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute({ children }) {
  let usuario = null
  try {
    const raw = localStorage.getItem('usuario')
    if (raw) usuario = JSON.parse(raw)
  } catch {}

  if (!usuario || usuario.rol !== 'Administrador') {
    return <Navigate to="/login" replace />
  }

  return children || <Outlet />
}
