import { Link, useLocation } from 'react-router-dom';
import '../pages/admin.css';

export default function AdminLayout({ children }) {
  const location = useLocation();
  const isActive = (path) => (
    location.pathname === path || location.pathname.startsWith(`${path}/`)
      ? 'active'
      : ''
  );

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2>Panel Admin</h2>
          <span className="admin-badge">RED</span>
        </div>
        <nav className="admin-nav">
          <Link to="/admin" className={`admin-nav-item ${isActive('/admin')}`}>
            <span className="admin-nav-icon">📊</span> Resumen
          </Link>
          <Link to="/admin-users" className={`admin-nav-item ${isActive('/admin-users')}`}>
            <span className="admin-nav-icon">👥</span> Usuarios
          </Link>
          <Link to="/admin-products" className={`admin-nav-item ${isActive('/admin-products')}`}>
            <span className="admin-nav-icon">📦</span> Productos
          </Link>
          <Link to="/admin-orders" className={`admin-nav-item ${isActive('/admin-orders')}`}>
            <span className="admin-nav-icon">📋</span> Pedidos
          </Link>
          <Link to="/admin-cart" className={`admin-nav-item ${isActive('/admin-cart')}`}>
            <span className="admin-nav-icon">🛒</span> Carritos
          </Link>
          <Link to="/admin-contact" className={`admin-nav-item ${isActive('/admin-contact')}`}>
            <span className="admin-nav-icon">✉️</span> Contacto
          </Link>
          <Link to="/admin-audit" className={`admin-nav-item ${isActive('/admin-audit')}`}>
            <span className="admin-nav-icon">📋</span> Auditoría
          </Link>
        </nav>
        <div className="admin-sidebar-footer">
          <Link to="/dashboard" className="admin-nav-item return-link">
            <span className="admin-nav-icon">⬅️</span> Volver al Dashboard
          </Link>
        </div>
      </aside>
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  );
}
