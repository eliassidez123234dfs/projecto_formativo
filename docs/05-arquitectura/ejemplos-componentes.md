# Componentes Reutilizables — Ejemplos (RED Estampación)

> Ejemplos de código JSX de los componentes reutilizables del proyecto.
> Corresponden a los componentes base mencionados en `diseno-visual.md`.

```jsx
// ============================================
// COMPONENTES REUTILIZABLES - EJEMPLOS
// ============================================

// ============================================
// Header Component
// ============================================
import React from 'react';

export const Header = ({ cartCount = 0, isLoggedIn = false }) => {
  return (
    <header className="header">
      <div className="header-content container">
        <a href="/" className="header-logo">
          <div className="header-logo-icon">📦</div>
          <span>TShirtStudio</span>
        </a>

        <nav className="header-nav">
          <a href="/catalog">Catálogo</a>
          <a href="/about">Acerca de</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contacto</a>
        </nav>

        <div className="header-actions">
          <div className="cart-icon">
            🛒
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </div>

          {!isLoggedIn ? (
            <>
              <button className="header-button header-button-secondary">
                Iniciar Sesión
              </button>
              <button className="header-button header-button-primary">
                Registrarse
              </button>
            </>
          ) : (
            <button className="header-button header-button-secondary">
              Mi Cuenta
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

// ============================================
// Button Component
// ============================================
export const Button = ({ 
  children, 
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'md', // sm, md, lg
  fullWidth = false,
  disabled = false,
  onClick,
  ...props
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-block'
  ].filter(Boolean).join(' ');

  return (
    <button 
      className={classes} 
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
};

// ============================================
// FormInput Component
// ============================================
export const FormInput = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  ...props
}) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className={`form-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="form-input"
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

// ============================================
// ProductCard Component
// ============================================
export const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      <div className="product-image">
        {product.badge && (
          <span className="product-badge">{product.badge}</span>
        )}
        👕
      </div>
      <div className="product-info">
        <p className="product-name">{product.name}</p>
        <p className="product-price">${product.price}</p>
        <div className="product-footer">
          <Button size="sm" variant="outline">
            Ver
          </Button>
          <Button size="sm">
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Alert Component
// ============================================
export const Alert = ({ 
  type = 'info', // success, error, warning, info
  message,
  onClose
}) => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`alert alert-${type}`}>
      <span className="alert-icon">{icons[type]}</span>
      <div>
        <p>{message}</p>
      </div>
      {onClose && (
        <button 
          onClick={onClose}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

// ============================================
// Card Component
// ============================================
export const Card = ({ children, header, footer }) => {
  return (
    <div className="card">
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};

// ============================================
// HeroSection Component
// ============================================
export const HeroSection = ({ title, subtitle, primaryCTA, secondaryCTA }) => {
  return (
    <div className="hero">
      <div className="hero-content">
        <div className="hero-badge">🆕 Diseña tu propia camisa</div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className="hero-cta">
          <Button size="lg" onClick={() => window.location.href = primaryCTA.href}>
            {primaryCTA.text}
          </Button>
          <Button size="lg" variant="outline" onClick={() => window.location.href = secondaryCTA.href}>
            {secondaryCTA.text}
          </Button>
        </div>
      </div>
      <div className="hero-image">
        📦 [Imagen de producto]
      </div>
    </div>
  );
};

// ============================================
// FeatureCard Component
// ============================================
export const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
};

// ============================================
// DashboardTab Component
// ============================================
export const DashboardTab = ({ tabs, activeTab, onTabChange }) => {
  return (
    <>
      <div className="dashboard-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`dashboard-panel ${activeTab === tab.id ? 'active' : ''}`}
        >
          <h3>{tab.label}</h3>
          {tab.content}
        </div>
      ))}
    </>
  );
};

// ============================================
// OrdersTable Component
// ============================================
export const OrdersTable = ({ orders }) => {
  const statusMap = {
    pending: 'Pendiente',
    completed: 'Completado',
    shipped: 'Enviado',
    cancelled: 'Cancelado'
  };

  return (
    <table className="orders-table">
      <thead>
        <tr>
          <th>Número de Orden</th>
          <th>Fecha</th>
          <th>Estado</th>
          <th>Total</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>#{order.id}</td>
            <td>{new Date(order.date).toLocaleDateString()}</td>
            <td>
              <span className={`order-status ${order.status}`}>
                {statusMap[order.status]}
              </span>
            </td>
            <td className="order-price">${order.total}</td>
            <td>
              <Button size="sm" variant="ghost">
                Ver detalles
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ============================================
// CartItem Component
// ============================================
export const CartItem = ({ item, onQuantityChange, onRemove }) => {
  return (
    <div className="cart-item">
      <div className="cart-item-image">👕</div>
      <div className="cart-item-info">
        <p className="cart-item-name">{item.name}</p>
        <p className="cart-item-details">
          Talla: {item.size} | Color: {item.color}
        </p>
      </div>
      <div className="cart-item-quantity">
        <button onClick={() => onQuantityChange(item.id, item.quantity - 1)}>−</button>
        <span>{item.quantity}</span>
        <button onClick={() => onQuantityChange(item.id, item.quantity + 1)}>+</button>
      </div>
      <p className="cart-item-price">${(item.price * item.quantity).toFixed(2)}</p>
      <Button size="sm" variant="ghost" onClick={() => onRemove(item.id)}>
        Eliminar
      </Button>
    </div>
  );
};

// ============================================
// Footer Component
// ============================================
export const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Sobre Nosotros</h3>
            <a href="#about">Acerca de TShirtStudio</a>
            <a href="#blog">Blog</a>
            <a href="#careers">Empleos</a>
          </div>

          <div className="footer-section">
            <h3>Productos</h3>
            <a href="#catalog">Catálogo</a>
            <a href="#custom">Personalizar</a>
            <a href="#bundles">Bundles</a>
          </div>

          <div className="footer-section">
            <h3>Soporte</h3>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contacto</a>
            <a href="#shipping">Envíos</a>
          </div>

          <div className="footer-section">
            <h3>Legal</h3>
            <a href="#privacy">Privacidad</a>
            <a href="#terms">Términos</a>
            <a href="#cookies">Cookies</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 TShirtStudio. Todos los derechos reservados.</p>
          <p>Diseñado con ❤️ para creativos</p>
        </div>
      </div>
    </footer>
  );
};

// ============================================
// Ejemplo de uso en una página
// ============================================
/*
import React, { useState } from 'react';
import { 
  Header, 
  Button, 
  FormInput, 
  ProductCard,
  Alert,
  HeroSection,
  FeatureCard,
  Footer 
} from './components';

export const LandingPage = () => {
  const [cartCount] = useState(3);

  const products = [
    { id: 1, name: 'Camisa Clásica', price: 29.99, badge: 'NUEVO' },
    { id: 2, name: 'Camisa Premium', price: 49.99 },
    { id: 3, name: 'Camisa Personalizada', price: 59.99, badge: 'DESTACADO' },
  ];

  return (
    <>
      <Header cartCount={cartCount} isLoggedIn={false} />
      
      <div className="container">
        <HeroSection 
          title="Diseña tu Camisa Perfecta"
          subtitle="Personaliza camisas 3D con nuestro editor intuitivo"
          primaryCTA={{ text: 'Comenzar', href: '/catalog' }}
          secondaryCTA={{ text: 'Ver Galería', href: '/gallery' }}
        />

        <section className="features">
          <h2 className="text-center mb-2xl">¿Por qué elegirnos?</h2>
          <div className="features-grid">
            <FeatureCard 
              icon="🎨" 
              title="Editor 3D" 
              description="Visualiza tu diseño en tiempo real"
            />
            <FeatureCard 
              icon="📦" 
              title="Envío Rápido" 
              description="Entrega en 24-48 horas"
            />
            <FeatureCard 
              icon="✨" 
              title="Calidad Premium" 
              description="Materiales de la más alta calidad"
            />
          </div>
        </section>

        <section className="featured-products">
          <h2 className="text-center mb-2xl">Destacados</h2>
          <div className="products-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <section className="cta-section">
          <h2>¿Listo para crear?</h2>
          <p>Únete a miles de usuarios que ya personalizan sus camisas</p>
          <Button size="lg">Empezar Ahora</Button>
        </section>
      </div>

      <Footer />
    </>
  );
};
*/
