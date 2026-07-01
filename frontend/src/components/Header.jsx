import { useState, useEffect, useRef, useContext } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { CartContext } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'
import { isAuthenticated, clearAuth, getCurrentUser } from '../services/authService'

export const Header = ({ floating }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { cart } = useContext(CartContext)
  const cartCount = cart?.items?.length ?? 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const menuRef = useRef(null)
  const btnRef = useRef(null)
  const navRef = useRef(null)
  const loggedIn = isAuthenticated()
  const usuario = getCurrentUser()

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const checkOverflow = () => {
      if (navRef.current) {
        setOverflow(navRef.current.scrollWidth > navRef.current.clientWidth)
      }
    }
    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [loggedIn, cartCount])

  useEffect(() => {
    setMobileOpen(false)
  }, [location])

  const handleLogout = () => {
    clearAuth()
    setMenuOpen(false)
    navigate('/')
  }

  const initials = usuario?.usuario?.charAt(0).toUpperCase() || '?'

  const headerStyle = floating ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 60%, rgba(255,255,255,0.85))',
    backdropFilter: 'blur(8px)',
    borderBottom: '1px solid var(--color-border)',
  } : {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    background: 'var(--color-bg)',
    borderBottom: '1px solid var(--color-border)',
  }

  const showHamburger = overflow || mobileOpen

  return (
    <header style={headerStyle}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64,
      }}>
        <Link to="/" style={{
          textDecoration: 'none',
          color: 'var(--color-primary)', fontWeight: 800, fontSize: 20, letterSpacing: -0.5,
        }}>
          RED
        </Link>

        <nav ref={navRef} className="nav-desktop" style={{
          display: 'flex', alignItems: 'center', gap: 24, overflow: 'hidden',
        }}>
          <Link to="/catalog" style={{
            color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500, textDecoration: 'none',
            whiteSpace: 'nowrap', transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.target.style.color = 'var(--color-text)'}
            onMouseLeave={e => e.target.style.color = 'var(--color-text-secondary)'}
          >
            Catálogo
          </Link>

          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-secondary)', padding: 6,
              borderRadius: 8, transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; e.currentTarget.style.color = 'var(--color-text)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            {theme === 'dark' ? (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          {!loggedIn ? (
            <div style={{ display: 'flex', gap: 10, whiteSpace: 'nowrap' }}>
              <Link to="/login" style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-primary)',
                color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                transition: 'background 0.15s', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => { e.target.style.background = 'var(--color-primary-light)' }}
                onMouseLeave={e => { e.target.style.background = 'transparent' }}
              >
                Iniciar Sesión
              </Link>
              <Link to="/register" style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.target.style.background = 'var(--color-primary-dark)'}
                onMouseLeave={e => e.target.style.background = 'var(--color-primary)'}
              >
                Registrarse
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Link to="/cart" style={{
                color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500,
                textDecoration: 'none', position: 'relative', padding: 4,
              }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                {cartCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -4, right: -6, background: 'var(--color-primary)',
                    color: '#fff', borderRadius: '50%', width: 18, height: 18,
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{cartCount}</span>
                )}
              </Link>

              <div style={{ position: 'relative' }}>
                <button
                  ref={btnRef}
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '4px 8px 4px 4px', borderRadius: 999,
                    border: '1px solid var(--color-border)', background: 'var(--color-bg)',
                    cursor: 'pointer', transition: 'box-shadow 0.15s',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'var(--color-primary-light)', color: '#991b1b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700,
                  }}>
                    {initials}
                  </div>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {menuOpen && (
                  <div ref={menuRef} style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                    background: 'var(--color-bg)', borderRadius: 12,
                    border: '1px solid var(--color-border)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    minWidth: 200, padding: 6, zIndex: 200,
                  }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border-light)', marginBottom: 4 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{usuario?.usuario || ''}</p>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>{usuario?.correo || ''}</p>
                    </div>

                    <Link to="/perfil" onClick={() => setMenuOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 8, textDecoration: 'none', color: 'var(--color-text)',
                      fontSize: 14, transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> Mi Perfil
                    </Link>
                    <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 8, textDecoration: 'none', color: 'var(--color-text)',
                      fontSize: 14, transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> Dashboard
                    </Link>
                    <Link to="/cart" onClick={() => setMenuOpen(false)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                      borderRadius: 8, textDecoration: 'none', color: 'var(--color-text)',
                      fontSize: 14, transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg> Mi Carrito {cartCount > 0 && `(${cartCount})`}
                    </Link>

                    {(usuario?.rol === 'Administrador' || usuario?.is_superuser) && (
                      <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 8, textDecoration: 'none', color: 'var(--color-text)',
                        fontSize: 14, transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-tertiary)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Admin
                      </Link>
                    )}

                    <div style={{ borderTop: '1px solid var(--color-border-light)', marginTop: 4, paddingTop: 4 }}>
                      <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 8, border: 'none', background: 'transparent',
                        color: '#dc2626', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        width: '100%', textAlign: 'left',
                      }}>
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          style={{
            display: showHamburger ? 'block' : 'none',
            background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
            color: 'var(--color-text)', padding: 8,
          }}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileOpen ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="mobile-menu-panel" style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-bg)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
          position: floating ? 'fixed' : 'relative',
          top: floating ? 64 : 'auto',
          left: 0,
          right: 0,
          zIndex: 99,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link to="/catalog" onClick={() => setMobileOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text)', fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--color-border-light)' }}>Catálogo</Link>
            <button onClick={toggleTheme} style={{
              padding: '12px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--color-border-light)',
              color: 'var(--color-text)', fontSize: 15, cursor: 'pointer', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
            </button>
            {loggedIn && (
              <>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text)', fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--color-border-light)' }}>Dashboard</Link>
                <Link to="/cart" onClick={() => setMobileOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text)', fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--color-border-light)' }}>Carrito{cartCount > 0 ? ` (${cartCount})` : ''}</Link>
                <Link to="/perfil" onClick={() => setMobileOpen(false)} style={{ padding: '12px 0', color: 'var(--color-text)', fontSize: 15, textDecoration: 'none', borderBottom: '1px solid var(--color-border-light)' }}>Mi Perfil</Link>
                {(usuario?.rol === 'Administrador' || usuario?.is_superuser) && (
                  <Link to="/admin" onClick={() => setMobileOpen(false)} style={{ padding: '12px 0', color: 'var(--color-primary)', fontSize: 15, textDecoration: 'none', fontWeight: 600, borderBottom: '1px solid var(--color-border-light)' }}>Panel Admin</Link>
                )}
                <button onClick={() => { handleLogout(); setMobileOpen(false) }} style={{ padding: '12px 0', background: 'none', border: 'none', color: '#dc2626', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>Cerrar Sesión</button>
              </>
            )}
            {!loggedIn && (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} style={{ padding: '12px 0', color: 'var(--color-primary)', fontSize: 15, textDecoration: 'none', fontWeight: 600, borderBottom: '1px solid var(--color-border-light)' }}>Iniciar Sesión</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} style={{ padding: '12px 0', color: 'var(--color-primary)', fontSize: 15, textDecoration: 'none', fontWeight: 600 }}>Registrarse</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
