import React from 'react'
import './admin.css'

export default function AdminLayout({ children, title = 'Admin' }) {
  return (
    <div className="admin-shell">
      <header className="admin-topnav">
        <div className="logo">MiApp</div>
        <div className="search">Buscar...</div>
        <div className="profile">Admin</div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <nav>
            <ul>
              <li><a href="/admin-products">Productos</a></li>
              <li><a href="/admin-users">Usuarios</a></li>
              <li><a href="/admin-reports">Reportes</a></li>
            </ul>
          </nav>
        </aside>

        <main className="admin-main">
          <div className="admin-main-header">
            <h2>{title}</h2>
          </div>
          <div className="admin-main-content">{children}</div>
        </main>
      </div>

      <footer className="admin-footer">© {new Date().getFullYear()} MiApp</footer>
    </div>
  )
}
