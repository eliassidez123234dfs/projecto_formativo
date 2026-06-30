import { useState, useEffect, useRef, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartContext } from '../context/CartContext'
import { isAuthenticated, clearAuth, getCurrentUser } from '../services/authService'

// Public/global header with catalog link, cart icon, auth buttons, and user dropdown menu
export const Header = () => {
  const navigate = useNavigate()
  const { cart } = useContext(CartContext)
  const cartCount = cart?.items?.length ?? 0
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuRef = useRef(null)
  const btnRef = useRef(null)

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

  const handleLogout = () => {
    clearAuth()
    setMenuOpen(false)
    navigate('/')
  }

  const initials = usuario?.usuario?.charAt(0).toUpperCase() || '?'

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100, background: 'var(--color-bg)',
      borderBottom: '1px solid var(--color-border)',
    }}>
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

        <nav style={{ display: 'flex', alignItems: 'center', gap: 24 }} className="nav-desktop">
          <Link to="/catalog" style={{
            color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500, textDecoration: 'none',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => e.target.style.color = 'var(--color-text)'}
            onMouseLeave={e => e.target.style.color = 'var(--color-text-secondary)'}
          >
            Catálogo
          </Link>

          {!loggedIn ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/login" style={{
                padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-primary)',
                color: 'var(--color-primary)', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.target.style.background = 'var(--color-primary-light)' }}
                onMouseLeave={e => { e.target.style.background = 'transparent' }}
              >
                Iniciar Sesión
              </Link>
              <Link to="/register" style={{
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 600,
                textDecoration: 'none', transition: 'background 0.15s',
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
                  onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-sm)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
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

                    {usuario?.rol === 'Administrador' && (
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
                        width: '100%', textAlign: 'left', transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
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
          style={{ display: 'none', background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--color-text)', padding: 8 }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {mobileOpen && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/catalog" onClick={() => setMobileOpen(false)} style={{ padding: '10px 0', color: 'var(--color-text)', fontSize: 14, textDecoration: 'none' }}>Catálogo</Link>
            <Link to="/cart" onClick={() => setMobileOpen(false)} style={{ padding: '10px 0', color: 'var(--color-text)', fontSize: 14, textDecoration: 'none' }}>Carrito{cartCount > 0 ? ` (${cartCount})` : ''}</Link>
            {loggedIn ? (
              <>
                <Link to="/perfil" onClick={() => setMobileOpen(false)} style={{ padding: '10px 0', color: 'var(--color-text)', fontSize: 14, textDecoration: 'none' }}>Mi Perfil</Link>
                <button onClick={() => { handleLogout(); setMobileOpen(false) }} style={{ padding: '10px 0', background: 'none', border: 'none', color: '#dc2626', fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>Cerrar Sesión</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} style={{ padding: '10px 0', color: 'var(--color-primary)', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>Iniciar Sesión</Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} style={{ padding: '10px 0', color: 'var(--color-primary)', fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>Registrarse</Link>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 600px) {
          .nav-desktop > a, .nav-desktop > div { display: none !important; }
          .mobile-menu-toggle { display: block !important; }
        }
      `}</style>
    </header>
  )
}
