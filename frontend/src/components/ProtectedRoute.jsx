import { useState, useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated, getCurrentUser, restoreSession } from '../services/authService'

const ROLES = {
  ADMIN: 'Administrador',
  CLIENTE: 'Usuario',
}

export default function ProtectedRoute({ children, requiredRoles, redirectTo = '/login' }) {
  const location = useLocation()
  const [status, setStatus] = useState('loading')
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    async function check() {
      const authed = isAuthenticated()
      if (!authed) {
        const restored = await restoreSession()
        if (!restored) {
          if (mounted) setStatus('unauthenticated')
          return
        }
      }
      const currentUser = getCurrentUser()
      if (!currentUser) {
        if (mounted) setStatus('unauthenticated')
        return
      }
      if (mounted) {
        setUser(currentUser)
        setStatus('authenticated')
      }
    }
    check()
    return () => { mounted = false }
  }, [])

  if (status === 'loading') {
    return (
      <div className="flex-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-danger" role="status" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  if (requiredRoles && !requiredRoles.includes(user?.rol) && !user?.is_superuser) {
    const fallback = user?.rol === ROLES.ADMIN ? '/admin' : '/perfil'
    return <Navigate to={fallback} replace />
  }

  return children
}

export { ROLES }
