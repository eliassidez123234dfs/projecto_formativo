import { Link, useLocation } from 'react-router-dom'

const routeLabels = {
  '/': 'Inicio',
  '/catalog': 'Catálogo',
  '/cart': 'Carrito',
  '/catalogo': 'Catálogo',
  '/login': 'Iniciar Sesión',
  '/register': 'Registrarse',
  '/dashboard': 'Dashboard',
  '/perfil': 'Mi Perfil',
  '/admin': 'Panel Admin',
  '/admin-products': 'Productos',
  '/admin-users': 'Usuarios',
  '/admin-orders': 'Pedidos',
  '/admin-cart': 'Carritos',
  '/admin-contact': 'Contacto',
  '/admin-audit': 'Auditoría',
  '/admin-categories': 'Categorías',
  '/admin-images': 'Imágenes',
  '/admin-designs': 'Diseños 3D',
  '/mis-disenos': 'Mis Diseños',
  '/checkout': 'Pagar',
  '/checkout/resultado': 'Resultado del Pago',
  '/product': 'Producto',
  '/category': 'Categoría',
  '/ui': 'UI Showcase',
  '/email': 'Verificar Email',
  '/verificar-email': 'Verificar Email',
  '/verificar-email-pendiente': 'Verificación Pendiente',
  '/password': 'Recuperar Contraseña',
  '/nueva-password': 'Nueva Contraseña',
}

export const Breadcrumbs = ({ pageTitle }) => {
  const location = useLocation()
  const paths = location.pathname.split('/').filter(Boolean)
  if (paths.length === 0) return null

  const crumbs = [{ label: 'Inicio', path: '/' }]
  let accumulated = ''
  for (const segment of paths) {
    accumulated += '/' + segment
    const label = routeLabels[accumulated] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    crumbs.push({ label, path: accumulated })
  }

  if (pageTitle && crumbs.length > 0) {
    crumbs[crumbs.length - 1].label = pageTitle
  }

  return (
    <nav className="breadcrumbs" aria-label="breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb.path}>
          {i > 0 && <span className="breadcrumb-sep">/</span>}
          {i === crumbs.length - 1 ? (
            <span className="breadcrumb-current">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="breadcrumb-link">{crumb.label}</Link>
          )}
        </span>
      ))}
      <style>{`
        .breadcrumbs {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 0;
          font-size: 0.72rem;
          color: var(--color-text-muted, #9CA3AF);
          flex-wrap: wrap;
        }
        .breadcrumb-sep {
          margin: 0 3px;
          color: var(--color-border, #D1D5DB);
        }
        .breadcrumb-link {
          color: var(--color-primary, #DC2626);
          text-decoration: none;
        }
        .breadcrumb-link:hover {
          text-decoration: underline;
        }
        .breadcrumb-current {
          color: var(--color-text-secondary, #6B7280);
          font-weight: 500;
        }
      `}</style>
    </nav>
  )
}
