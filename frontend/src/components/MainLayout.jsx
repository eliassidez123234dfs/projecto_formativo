import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { getCurrentUser, clearAuth } from '../services/authService'
import './admin.css'

export default function MainLayout({ children, title, subtitle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebarOpen') !== 'false' } catch { return true }
  })
  const [isMobile, setIsMobile] = useState(() => {
    try { return window.innerWidth <= 768 } catch { return false }
  })
  const usuario = getCurrentUser()

  useEffect(() => {
    try { localStorage.setItem('sidebarOpen', String(sidebarOpen)) } catch { /* ignore */ }
  }, [sidebarOpen])

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= 768)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isMobile) setSidebarOpen(false)
  }, [isMobile])

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const isActive = (href) => {
    if (href === '/perfil') return location.pathname === '/perfil'
    return location.pathname.startsWith(href)
  }

  const menuItems = [
    { label: 'Mi Perfil', href: '/perfil' },
    { label: 'Mis Diseños', href: '/mis-disenos' },
  ]

  return (
    <div className="main-layout">
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />
      )}

      <button
        className="sidebar-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">RED</span>
            <span className="sidebar-brand-role">Usuario</span>
          </div>
        </div>

        {sidebarOpen && <div className="nav-section-label">Mi Cuenta</div>}

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              title={!sidebarOpen ? item.label : ''}
            >
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={handleLogout} title="Cerrar sesión">
            <div className="sidebar-user-avatar">
              {usuario?.usuario?.charAt(0).toUpperCase() || '?'}
            </div>
            {sidebarOpen && (
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{usuario?.usuario || 'Usuario'}</div>
                <div className="sidebar-user-role">Cerrar sesión →</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="main-content">
        <div className="content-header">
          <div className="header-text">
            {title && <h1>{title}</h1>}
            {subtitle && <p className="subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="content-area">
          {children}
        </div>

        <footer className="main-footer">
          <p>&copy; {new Date().getFullYear()} RED. Todos los derechos reservados.</p>
          <p>Mi Cuenta</p>
        </footer>
      </div>
    </div>
  );
}
