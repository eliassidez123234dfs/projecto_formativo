// frontend/src/components/Header.jsx
import React from 'react';

export const Header = ({ cartCount = 0, isLoggedIn = false }) => {
  return (
    <header className="header">
      <div className="header-content container">
        <a href="/" className="header-logo">
          <span>RED</span>
        </a>
        <nav className="header-nav">
          <a href="/catalog">Catálogo</a>
          <a href="/about">Acerca de</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contacto</a>
        </nav>
        <div className="header-actions">
            <a href="/cart" className="cart-icon">
            🛒
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </a>
          {!isLoggedIn ? (
            <>
              <a href="/login" className="header-button header-button-secondary">
                Iniciar Sesión
              </a>
              <a href="/register" className="header-button header-button-primary">
                Registrarse
              </a>
            </>
          ) : (
            <a href="/dashboard" className="header-button header-button-secondary">
              Mi Cuenta
            </a>
          )}
        </div>
      </div>
    </header>
  );
};