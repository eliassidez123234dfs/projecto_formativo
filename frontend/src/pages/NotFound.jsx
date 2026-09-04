import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: '2rem',
    }}>
      <h1 style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 0 }}>404</h1>
      <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
        Página no encontrada
      </p>
      <Link to="/" className="btn btn-primary">Volver al inicio</Link>
    </div>
  )
}
