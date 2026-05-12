# ⚡ Quick Start - Implementación del Nuevo Diseño

**Fecha:** 12 de mayo de 2026  
**Estado:** Pronto para implementar  
**Tiempo estimado:** 4-6 semanas

---

## 📋 Pre-requisitos

✅ Node.js 18+  
✅ npm/yarn  
✅ React 19+  
✅ Vite  
✅ Conocimiento de CSS3 + CSS Variables  

---

## 🚀 Paso 1: Preparar el Entorno

### 1.1 Importar estilos globales

**`frontend/src/index.css`** (o `main.jsx`):
```css
/* Importar en este orden */
@import './styles/globals.css';       /* Variables + Reset */
@import './styles/components.css';    /* Componentes base */
@import './styles/landing-new.css';   /* Páginas específicas */
@import './styles/auth-new.css';
@import './styles/dashboard-new.css';
```

### 1.2 Verificar que los CSS existen

```bash
frontend/src/styles/
├─ globals.css        ✅ NUEVO
├─ components.css     ✅ NUEVO
├─ landing-new.css    ✅ NUEVO
├─ auth-new.css       ✅ NUEVO
└─ dashboard-new.css  ✅ NUEVO
```

---

## 🎯 Paso 2: Crear Componentes Base

### 2.1 Header Component

**`frontend/src/components/Header.jsx`:**
```jsx
import React from 'react';
import './Header.css'; // Si necesita estilos específicos

export const Header = ({ cartCount = 0, isLoggedIn = false }) => {
  return (
    <header className="header">
      <div className="header-content container">
        {/* Logo */}
        <a href="/" className="header-logo">
          <div className="header-logo-icon">📦</div>
          <span>TShirtStudio</span>
        </a>

        {/* Navegación */}
        <nav className="header-nav">
          <a href="/catalog">Catálogo</a>
          <a href="/about">Acerca de</a>
          <a href="/faq">FAQ</a>
          <a href="/contact">Contacto</a>
        </nav>

        {/* Acciones */}
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
```

### 2.2 Button Component

**`frontend/src/components/Button.jsx`:**
```jsx
export const Button = ({ 
  children, 
  variant = 'primary',
  size = 'md',
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
```

### 2.3 FormInput Component

**`frontend/src/components/FormInput.jsx`:**
```jsx
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
```

### 2.4 ProductCard Component

**`frontend/src/components/ProductCard.jsx`:**
```jsx
import { Button } from './Button';

export const ProductCard = ({ product, onView, onAdd }) => {
  return (
    <div className="product-card">
      <div className="product-image">
        {product.badge && (
          <span className="product-badge">{product.badge}</span>
        )}
        {product.image || '👕'}
      </div>
      <div className="product-info">
        <p className="product-name">{product.name}</p>
        <p className="product-price">${product.price.toFixed(2)}</p>
        <div className="product-footer">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onView(product.id)}
          >
            Ver
          </Button>
          <Button 
            size="sm"
            onClick={() => onAdd(product.id)}
          >
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
};
```

---

## 🎨 Paso 3: Actualizar Páginas Principales

### 3.1 Landing.jsx

**`frontend/src/pages/Landing.jsx`:**
```jsx
import React from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { ProductCard } from '../components/ProductCard';

export const Landing = () => {
  const featuredProducts = [
    { id: 1, name: 'Camisa Clásica', price: 29.99, badge: 'NUEVO' },
    { id: 2, name: 'Premium', price: 49.99 },
    { id: 3, name: 'Personalizada', price: 59.99, badge: 'DESTACADO' },
    { id: 4, name: 'Edición Limitada', price: 79.99 },
  ];

  return (
    <>
      <Header isLoggedIn={false} />

      <div className="container">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <div className="hero-badge">🆕 Diseña tu propia camisa</div>
            <h1>Diseña tu Camisa <span className="highlight">Perfecta</span></h1>
            <p>
              Personaliza camisas premium con nuestro editor 3D intuitivo.
              Visualiza tu diseño en tiempo real antes de comprar.
            </p>
            <div className="hero-cta">
              <Button size="lg" onClick={() => window.location.href = '/catalog'}>
                Comenzar Diseño
              </Button>
              <Button size="lg" variant="outline">
                Ver Galería
              </Button>
            </div>
          </div>
          <div className="hero-image">
            [Imagen del producto]
          </div>
        </section>

        {/* Features */}
        <section className="features mt-4xl">
          <div className="section-header">
            <h2>¿Por qué elegirnos?</h2>
            <p>Ofrecemos todo lo que necesitas para crear camisas únicas</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎨</div>
              <h3>Editor 3D</h3>
              <p>Visualiza tu diseño en tiempo real antes de confirmar</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3>Envío Rápido</h3>
              <p>Entrega en 24-48 horas a todo el país</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✨</div>
              <h3>Calidad Premium</h3>
              <p>Materiales de la más alta calidad garantizados</p>
            </div>
          </div>
        </section>

        {/* Featured Products */}
        <section className="featured-products mt-4xl">
          <div className="section-header">
            <h2>Productos Destacados</h2>
            <p>Explora nuestra colección más popular</p>
          </div>
          <div className="products-grid">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={(id) => window.location.href = `/product/${id}`}
                onAdd={(id) => console.log('Agregar:', id)}
              />
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta-section mt-4xl">
          <h2>¿Listo para crear?</h2>
          <p>Únete a miles de usuarios que ya personalizan sus camisas premium</p>
          <Button size="lg">Empezar Ahora</Button>
        </section>
      </div>

      {/* Footer */}
      <footer className="footer mt-4xl">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Sobre Nosotros</h3>
              <a href="#about">Acerca de TShirtStudio</a>
              <a href="#blog">Blog</a>
            </div>
            <div className="footer-section">
              <h3>Productos</h3>
              <a href="#catalog">Catálogo</a>
              <a href="#custom">Personalizar</a>
            </div>
            <div className="footer-section">
              <h3>Soporte</h3>
              <a href="#faq">FAQ</a>
              <a href="#contact">Contacto</a>
            </div>
            <div className="footer-section">
              <h3>Legal</h3>
              <a href="#privacy">Privacidad</a>
              <a href="#terms">Términos</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 TShirtStudio. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  );
};
```

### 3.2 Auth.jsx (Rediseñada)

**`frontend/src/pages/Auth.jsx`:**
```jsx
import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { FormInput } from '../components/FormInput';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Submit:', formData);
  };

  return (
    <>
      <Header isLoggedIn={false} />

      <div className="auth-page">
        {/* Lado Izquierdo - Formulario */}
        <section className="auth-form-section">
          <div className="auth-form-container">
            <div className="auth-form-header">
              <h1>{isLogin ? 'Bienvenido' : 'Crear Cuenta'}</h1>
              <p>
                {isLogin
                  ? 'Accede a tu cuenta para continuar'
                  : 'Crea tu cuenta en segundos'}
              </p>
            </div>

            {/* Tabs */}
            <div className="auth-tabs">
              <button
                className={`auth-tab ${isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(true)}
              >
                Iniciar Sesión
              </button>
              <button
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => setIsLogin(false)}
              >
                Registrarse
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {/* Login */}
              <div className={`auth-form-content ${isLogin ? 'active' : ''}`}>
                <FormInput
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  label="Contraseña"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <div className="forgot-password">
                  <a href="#forgot">¿Olvidaste tu contraseña?</a>
                </div>
                <Button type="submit" size="lg" fullWidth>
                  Iniciar Sesión
                </Button>
              </div>

              {/* Register */}
              <div className={`auth-form-content ${!isLogin ? 'active' : ''}`}>
                <FormInput
                  label="Nombre de usuario"
                  name="username"
                  placeholder="tu_usuario"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  label="Contraseña"
                  name="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <FormInput
                  label="Confirmar contraseña"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <Button type="submit" size="lg" fullWidth>
                  Crear Cuenta
                </Button>
              </div>

              {/* Footer del formulario */}
              <div className="form-footer">
                <p>
                  {isLogin
                    ? '¿No tienes cuenta? '
                    : '¿Ya tienes cuenta? '}
                  <a href="#toggle" onClick={(e) => {
                    e.preventDefault();
                    setIsLogin(!isLogin);
                  }}>
                    {isLogin ? 'Regístrate' : 'Inicia sesión'}
                  </a>
                </p>
              </div>
            </form>
          </div>
        </section>

        {/* Lado Derecho - Beneficios */}
        <section className="auth-benefits-section">
          <div className="auth-benefits-container">
            <div className="auth-benefits-header">
              <h2>Únete a TShirtStudio</h2>
              <p>Acceso a funciones exclusivas</p>
            </div>

            <div className="auth-benefits-list">
              <div className="benefit-item">
                <div className="benefit-icon">🎨</div>
                <div className="benefit-content">
                  <h3>Editor 3D Completo</h3>
                  <p>Personaliza camisas con nuestro editor avanzado</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">💾</div>
                <div className="benefit-content">
                  <h3>Guarda tus Diseños</h3>
                  <p>Accede a tus diseños desde cualquier dispositivo</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">🎁</div>
                <div className="benefit-content">
                  <h3>Ofertas Exclusivas</h3>
                  <p>Recibe descuentos y ofertas especiales</p>
                </div>
              </div>

              <div className="benefit-item">
                <div className="benefit-icon">📦</div>
                <div className="benefit-content">
                  <h3>Seguimiento de Envíos</h3>
                  <p>Rastreo en tiempo real de tus órdenes</p>
                </div>
              </div>
            </div>

            <div className="auth-benefits-highlight">
              <p>"Con TShirtStudio he creado las camisas más originales que he visto. ¡El editor es increíble!" - María G.</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
};
```

---

## 📋 Paso 4: Checklist de Implementación

### Fase 1: Setup (Semana 1)
- [ ] Importar CSS globales en App.jsx
- [ ] Crear Header.jsx reutilizable
- [ ] Crear Button.jsx con variantes
- [ ] Crear FormInput.jsx con validación
- [ ] Crear ProductCard.jsx
- [ ] Crear Footer.jsx
- [ ] Actualizar App.jsx con nuevo Header

### Fase 2: Landing (Semana 2)
- [ ] Rediseñar Landing.jsx
- [ ] Agregar HeroSection
- [ ] Agregar FeatureCard (x3)
- [ ] Agregar Featured Products (grid)
- [ ] Agregar CTA Section
- [ ] Agregar Footer
- [ ] Testing responsive

### Fase 3: Auth (Semana 3)
- [ ] Rediseñar Auth.jsx
- [ ] Implementar Tab Switcher
- [ ] Agregar Benefits Sidebar
- [ ] Integrar validación con backend
- [ ] Testing de estilos

### Fase 4: Dashboard (Semana 4)
- [ ] Rediseñar Dashboard.jsx
- [ ] Crear TabNavigation
- [ ] Crear OrdersTable
- [ ] Crear CartItem
- [ ] Crear DashboardSidebar
- [ ] Testing de interactividad

### Fase 5: Catálogo (Semana 5)
- [ ] Crear Catalog.jsx
- [ ] Crear FilterSidebar
- [ ] Agregar Grid responsivo
- [ ] Integrar búsqueda

### Fase 6: Pulido (Semana 6)
- [ ] Testing responsivo en todos los dispositivos
- [ ] Optimización de performance
- [ ] Ajustes de colores/espaciado
- [ ] A/B testing

---

## 🔗 Recursos Rápidos

| Archivo | Descripción |
|---------|------------|
| `globals.css` | Variables CSS + reset |
| `components.css` | Header, Button, Forms |
| `landing-new.css` | Landing page |
| `auth-new.css` | Auth page |
| `dashboard-new.css` | Dashboard |
| `DESIGN_GUIDE.md` | Guía completa de diseño |
| `COMPONENTS_EXAMPLES.jsx` | Ejemplos de componentes |
| `SITEMAP_AND_FLOWS.md` | Estructura del sitio |

---

## 🚀 Comando Rápido para Empezar

```bash
# En el directorio frontend
npm install

# Iniciar dev server
npm run dev

# Build para producción
npm run build
```

---

## 💡 Tips Importantes

1. **Mobile-first:** Desarrolla mobile primero, luego expande
2. **Variables CSS:** Usa `var(--color-red)` siempre
3. **Reutilización:** No repitas clases, usa `@apply` o className
4. **Accesibilidad:** Verifica contrast y keyboard nav
5. **Performance:** Lazy load images, optimiza CSS
6. **Testing:** Prueba en múltiples dispositivos

---

**Próximo paso:** Comenzar con Fase 1 - Setup de componentes base

**¡Listo para empezar!** 🎉

---

*Última actualización: 12 de mayo de 2026*  
*Versión: 2.0 - Quick Start*
