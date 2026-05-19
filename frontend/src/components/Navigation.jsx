import { Link } from 'react-router-dom'

export default function Navigation() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-4">
      <div className="container">
        <Link className="navbar-brand" to="/">
          🏪 Proyecto Formativo
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/">Catálogo</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/admin-products">Admin Productos</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/cart">Carrito</Link>
            </li>
          </ul>
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link" href="http://localhost:8001/admin/" target="_blank">
                🔧 Admin Django
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="http://localhost:8001/api/" target="_blank">
                📡 API Docs
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
