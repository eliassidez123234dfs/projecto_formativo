// frontend/src/components/Header.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const Header = ({ cartCount = 0, isLoggedIn = false }) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const loggedIn = isLoggedIn || Boolean(token);
  const navigate = useNavigate();

  const usuarioRaw = typeof window !== 'undefined' ? localStorage.getItem('usuario') : null;
  let usuarioName = '';
  try {
    usuarioName = usuarioRaw ? JSON.parse(usuarioRaw)?.usuario || '' : '';
  } catch (e) {
    usuarioName = '';
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-content container">
        <Link to={loggedIn ? '/dashboard' : '/'} className="header-logo">
          <span>RED</span>
        </Link>
        <nav className="header-nav">
          <Link to="/catalog">Catálogo</Link>
          <Link to="/about">Acerca de</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/contact">Contacto</Link>
        </nav>
        <div className="header-actions">
          <Link to="/cart" className="cart-icon">
            🛒
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>
          {!loggedIn ? (
            <>
              <Link to="/login" className="header-button header-button-secondary">
                Iniciar Sesión
              </Link>
              <Link to="/register" className="header-button header-button-primary">
                Registrarse
              </Link>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link to="/dashboard" className="header-button header-button-secondary" style={{ textDecoration: 'none' }}>
                {usuarioName || 'Mi Cuenta'}
              </Link>
              <button type="button" onClick={handleLogout} className="header-button header-button-secondary">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};