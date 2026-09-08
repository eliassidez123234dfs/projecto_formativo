/**
 * AdminLayout.jsx — Layout exclusivo para el panel de administración.
 *
 * Estructura:
 * 1. Sidebar colapsable con navegación de secciones admin.
 * 2. Área de contenido principal con header y footer.
 * 3. Iconos SVG reutilizados para cada sección del menú.
 *
 * Decisiones de diseño:
 * - Estado del sidebar persistido en localStorage.
 * - El editor 3D se abre como link externo (mismo layout, diferente app).
 * - En móvil se muestra backdrop oscuro al abrir el sidebar.
 * -读取 usuario desde localStorage (no context global) para simplificar.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { openEditor } from '../utils/editor3d'
import '../styles/admin.css'

// ─── ICONOS SVG PARA EL MENÚ ───
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
}

// ─── COMPONENTE PRINCIPAL ───
export default function AdminLayout({ children, title, subtitle }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) return false
    try { return localStorage.getItem('sidebarOpen') !== 'false' } catch { return true }
  })
  const usuario = (() => { try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null } })()

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 768) {
      try { localStorage.setItem('sidebarOpen', String(sidebarOpen)) } catch {}
    }
  }, [sidebarOpen])

  // ─── ITEMS DEL MENÚ DE NAVEGACIÓN ───
  const menuItems = [
    { label: 'Dashboard', href: '/admin', icon: Icons.Dashboard },
    { label: 'Inicio', href: '/', icon: Icons.Home },
    { label: 'Catálogo', href: '/catalog', icon: Icons.Store },
    { label: 'Productos', href: '/admin-products', icon: Icons.Products },
    { label: 'Usuarios', href: '/admin-users', icon: Icons.Users },
    { label: 'Órdenes', href: '/admin-orders', icon: Icons.Orders },
    { label: 'Carritos', href: '/admin-cart', icon: Icons.Cart },
    { label: 'Contacto', href: '/admin-contact', icon: Icons.Mail },
    { label: 'Auditoría', href: '/admin-audit', icon: Icons.Clipboard },
    { label: 'Editor 3D', isEditor: true, icon: Icons.Box },
    { label: 'Cloudinary', href: '/admin-cloudinary', icon: Icons.Cloud },
  ]

  const isActive = (href) => {
    if (!href || href.startsWith('http')) return false
    if (href === '/admin') return location.pathname === '/admin'
    return location.pathname.startsWith(href)
  }

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setSidebarOpen(false)
    }
  }

  const handleOpenTestEditor = async (e) => {
    e.preventDefault()
    handleNavClick()
    try {
      await openEditor({ productId: 1, quantity: 1 })
    } catch {
      window.open('http://127.0.0.1:5174/?productId=1&mode=new', '_blank', 'noopener,noreferrer')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('usuario')
    navigate('/login')
  }

    return (
    <div
      className={`main-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}
      style={{ '--sidebar-width': sidebarOpen ? '220px' : '58px' }}
    >
      {/* ─── BACKDROP MÓVIL ─── */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop-mobile"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── SIDEBAR ─── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">RED</span>
            <span className="sidebar-brand-role">Admin</span>
          </div>
          <button
            className="sidebar-close-mobile"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            ✕
          </button>
        </div>

        {sidebarOpen && <div className="nav-section-label">Navegación</div>}

        <nav className="sidebar-nav">
          {menuItems.map(item => {
            const className = `nav-item ${isActive(item.href) ? 'active' : ''}`
            const title = !sidebarOpen ? item.label : ''

            if (item.isEditor) {
              return (
                <button
                  key="editor-3d"
                  type="button"
                  onClick={handleOpenTestEditor}
                  className={className}
                  title={title || 'Editor 3D (Objeto de prueba #1)'}
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', font: 'inherit' }}
                >
                  <span className="nav-item-icon"><item.icon /></span>
                  {sidebarOpen && <span className="nav-label">{item.label}</span>}
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                to={item.href}
                className={className}
                title={title}
                onClick={handleNavClick}
              >
                <span className="nav-item-icon"><item.icon /></span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-row">
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
          </div>

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

      {/* ─── CONTENIDO PRINCIPAL ─── */}
      <div className="main-content">
        <div className="content-header">
          <button
            className="mobile-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Abrir menú de administración"
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
          <p>Panel de Administración</p>
        </footer>
      </div>
    </div>
  )
}
