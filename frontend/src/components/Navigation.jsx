import { NavLink } from 'react-router-dom'

export default function Navigation() {
  return (
    <nav className="navbar navbar-expand-lg pf-navbar sticky-top">
      <div className="container py-2">
        <NavLink className="navbar-brand d-flex align-items-center gap-3" to="/" end>
          <span className="pf-brand-mark">RF</span>
          <span className="d-flex flex-column lh-sm">
            <strong>Proyecto Formativo</strong>
            <small>Tienda virtual de estampacion</small>
          </span>
        </NavLink>

        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Abrir menu de navegacion">
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto gap-lg-2">
            <li className="nav-item">
              <NavLink className="nav-link" to="/" end>Catalogo</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin-products">Admin productos</NavLink>
            </li>
            <li className="nav-item">
              <NavLink className="nav-link" to="/cart">Carrito</NavLink>
            </li>
          </ul>

          <ul className="navbar-nav align-items-lg-center gap-lg-2">
            <li className="nav-item">
              <a className="btn btn-sm btn-outline-light" href="http://localhost:8001/admin/" target="_blank" rel="noreferrer">
                Admin Django
              </a>
            </li>
            <li className="nav-item">
              <a className="btn btn-sm btn-light" href="http://localhost:8001/api/" target="_blank" rel="noreferrer">
                API
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  )
}
