import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { getCurrentUser, clearAuth } from '../services/authService'
import './admin.css'

const Icons = {
  Dashboard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10.5V20h14v-9.5" />
      <path d="M9 20v-6h6v6" />
    </svg>
  ),
  Store: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16l-1 4H5L4 7Z" />
      <path d="M6 11v8h12v-8" />
      <path d="M9 15h6" />
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
  CheckCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
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
  Box: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Cloud: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </svg>
  ),
  Designs: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4.5v9L12 20l-8-4.5v-9L12 2z" />
      <polyline points="12 22 12 12" />
      <polyline points="12 12 20 7.5" />
    </svg>
  ),
  Edit3D: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12c2-4 4-6 9-6s7 2 9 6c-2 4-4 6-9 6s-7-2-9-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  ),
}

export default function AdminLayout({ children, title, subtitle }) {
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

  const menuItems = [
    { label: 'Dashboard', href: '/admin', icon: Icons.Dashboard },
    { label: 'Landing', href: '/', icon: Icons.Home },
    { label: 'Catálogo', href: '/catalog', icon: Icons.Store },
    { label: 'Productos', href: '/admin-products', icon: Icons.Products },
    { label: 'Aprobaciones', href: '/admin-products/approval', icon: Icons.CheckCircle },
    { label: 'Usuarios', href: '/admin-users', icon: Icons.Users },
    { label: 'Órdenes', href: '/admin-orders', icon: Icons.Orders },
    { label: 'Carritos', href: '/admin-cart', icon: Icons.Cart },
    { label: 'Contacto', href: '/admin-contact', icon: Icons.Mail },
    { label: 'Auditoría', href: '/admin-audit', icon: Icons.Clipboard },
    { label: 'Diseños 3D', href: '/admin-model3d', icon: Icons.Box },
    { label: 'Editor 3D', href: 'http://127.0.0.1:5174/', icon: Icons.Box, external: true },
    { label: 'Cloudinary', href: '/admin-cloudinary', icon: Icons.Cloud },
  ]

  const isActive = (href) => {
    if (href.startsWith('http')) return false
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <div className="main-layout">
      {/* Overlay backdrop for mobile sidebar */}
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Always-visible hamburger button (fixed top-left) */}
      <button
        className="sidebar-hamburger"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        <Icons.Menu />
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">RED</span>
            <span className="sidebar-brand-role">Admin</span>
          </div>
        </div>

        {sidebarOpen && <div className="nav-section-label">Navegación</div>}

        <nav className="sidebar-nav">
          <Link
            to="/"
            className="nav-item nav-store"
            title={!sidebarOpen ? 'Volver al inicio' : ''}
          >
            <span className="nav-item-icon"><Icons.Store /></span>
            {sidebarOpen && <span className="nav-label">Volver a la tienda</span>}
          </Link>

          {sidebarOpen && <div className="nav-section-label">Herramientas 3D</div>}

        <a
          href={import.meta.env.VITE_3D_EDITOR_URL || 'http://localhost:5174'}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-item nav-editor3d"
          title={!sidebarOpen ? 'Editor 3D' : ''}
        >
          <span className="nav-item-icon"><Icons.Edit3D /></span>
          {sidebarOpen && <span className="nav-label">Editor 3D</span>}
        </a>

        {sidebarOpen && <div className="nav-section-label">Navegación</div>}

          {menuItems.map(item => {
            const className = `nav-item ${isActive(item.href) ? 'active' : ''}`
            const title = !sidebarOpen ? item.label : ''

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={className}
                  title={title}
                >
                  <span className="nav-item-icon"><item.icon /></span>
                  {sidebarOpen && <span className="nav-label">{item.label}</span>}
                </a>
              )
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={className}
                title={title}
              >
                <span className="nav-item-icon"><item.icon /></span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            )
          })}
      </nav>

        <div className="sidebar-footer">
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
          <p>Panel de Administración</p>
        </footer>
      </div>
    </div>
  );
}
