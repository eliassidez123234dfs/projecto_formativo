import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { getAccessToken, clearAuth, isAuthenticated, getCurrentUser } from '../services/authService'
import useAppStore from '../store/appStore'
import { fetchCurrentUser, buildApiUrl } from '../services/api'
import '../styles/main-layout.css'

const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Products: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Orders: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Cart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Clipboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Menu: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Store: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  CatalogIcon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
}

// Authenticated admin/user shell with sidebar navigation, header, footer, and access control
export default function MainLayout({ children, title, subtitle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const sidebarOpen = useAppStore(s => s.sidebarOpen)
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen)
  const [usuario, setUsuario] = useState(() => getCurrentUser())
  const [loadingUser, setLoadingUser] = useState(!usuario)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login')
      return
    }
    if (!usuario) {
      fetchCurrentUser().then(user => {
        if (user) {
          setUsuario(user)

        } else {
          navigate('/login')
        }
        setLoadingUser(false)
      })
    } else {
      setLoadingUser(false)
    }
  }, [navigate])

  const isAdmin = usuario?.rol === 'Administrador'
  const isActive = usuario?.estado === 'Activo'
  const isAdminRoute = location.pathname.startsWith('/admin')

  useEffect(() => {
    if (loadingUser) return
    if (!usuario || !isActive) {
      navigate('/login')
      return
    }
    if (isAdminRoute && !isAdmin) {
      navigate('/perfil')
    }
  }, [usuario, isAdmin, isActive, isAdminRoute, navigate, loadingUser])

  const menuItems = [
    { section: 'Gestión', admin: false, items: [
      { label: 'Dashboard', href: '/dashboard', icon: Icons.Dashboard, admin: false },
      { label: 'Catálogo', href: '/catalog', icon: Icons.CatalogIcon, admin: false },
      { label: 'Tienda', href: '/', icon: Icons.Store, admin: false },
    ]},
    { section: 'Administración', admin: true, items: [
      { label: 'Resumen', href: '/admin', icon: Icons.Dashboard },
      { label: 'Usuarios', href: '/admin-users', icon: Icons.Users },
      { label: 'Productos', href: '/admin-products', icon: Icons.Products },
      { label: 'Pedidos', href: '/admin-orders', icon: Icons.Orders },
      { label: 'Carritos', href: '/admin-cart', icon: Icons.Cart },
      { label: 'Contacto', href: '/admin-contact', icon: Icons.Mail },
      { label: 'Auditoría', href: '/admin-audit', icon: Icons.Clipboard },
    ]},
  ]

  const filteredSections = menuItems.map(section => ({
    ...section,
    items: section.items.filter(item => !item.admin || isAdmin),
  })).filter(section => section.items.length > 0)

  const handleLogout = async () => {
    try {
      await fetch(buildApiUrl('login/logout/'), { method: 'POST', credentials: 'include' })
    } catch {}
    clearAuth()
    navigate('/login')
  }

  const isActiveLink = (href) => {
    if (href === '/') return location.pathname === '/'
    if (href === '/dashboard') return location.pathname === '/dashboard'
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  if (loadingUser) return null

  return (
    <div className="main-layout" style={{ gridTemplateColumns: sidebarOpen ? '260px 1fr' : '60px 1fr' }}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <Link to="/" style={{ textDecoration: 'none' }}>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">RED</span>
              <span className="sidebar-brand-role">{isAdmin ? 'Admin' : 'Usuario'}</span>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {filteredSections.map((section) => (
            <div key={section.section}>
              {sidebarOpen && section.admin && isAdmin && (
                <div className="nav-section-label">{section.section}</div>
              )}
              {section.items.map(item => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`nav-item ${isActiveLink(item.href) ? 'active' : ''}`}
                  title={!sidebarOpen ? item.label : ''}
                >
                  <span className="nav-item-icon"><item.icon /></span>
                  {sidebarOpen && <span className="nav-label">{item.label}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-theme-toggle" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
            {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
          </div>

          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
          >
            {sidebarOpen ? <Icons.ChevronLeft /> : <Icons.ChevronRight />}
          </button>

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
          <button
            className="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <Icons.Menu />
          </button>
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
        </footer>
      </div>
    </div>
  )
}
