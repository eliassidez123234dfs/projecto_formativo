import { useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { buildApiUrl } from '../services/api'
import { isAuthenticated, getCurrentUser } from '../services/authService'

const Product3DViewer = lazy(() => import('../components/Product3DViewer'))

const features = [
  {
    icon: 'cube',
    title: 'Editor 3D en Tiempo Real',
    desc: 'Visualiza tus diseños sobre la camiseta antes de comprar, gira y amplía para ver cada detalle.',
  },
  {
    icon: 'shield',
    title: 'Materiales de Calidad',
    desc: 'Camisetas estampadas de alta durabilidad que no se agrietan ni destiñen con los lavados.',
  },
  {
    icon: 'truck',
    title: 'Envío Rápido',
    desc: 'Procesamos tu pedido en 24-48 horas y lo recibes en la puerta de tu casa con seguimiento en tiempo real.',
  },
]

const ICON_MAP = {
  cube: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  shield: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
  truck: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
}

function StarRating({ rating, total_reviews }) {
  if (rating == null) return null
  return (
    <div className="d-inline-flex align-items-center gap-1">
      {[1,2,3,4,5].map(s => (
        <svg key={s} width="12" height="12" viewBox="0 0 24 24"
          fill={s <= Math.round(rating) ? '#F59E0B' : 'none'}
          stroke="#F59E0B" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      {total_reviews > 0 && <span className="text-xs text-muted ms-1">({total_reviews})</span>}
    </div>
  )
}

function FeaturedCard({ product }) {
  return (
    <Link to={`/product/${product.id}`} className="featured-card text-decoration-none">
      <div className="featured-card-img" style={{ background: product.main_image ? `url(${product.main_image}) center/cover` : undefined }}>
        {!product.main_image && <span className="text-muted fw-semibold">Sin imagen</span>}
      </div>
      <div className="featured-card-body">
        <h3 className="featured-card-title">{product.name}</h3>
        <p className="featured-card-price">${Number(product.base_price).toFixed(2)}</p>
        <StarRating rating={product.average_rating} total_reviews={product.total_reviews} />
      </div>
    </Link>
  )
}

export const Landing = () => {
  const [loggedIn] = useState(() => isAuthenticated())
  const [formData, setFormData] = useState({ nombre: '', correo: '', asunto: '', mensaje: '' })
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const [featuredProducts, setFeaturedProducts] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function loadFeatured() {
      try {
        const res = await fetch('/api/catalog/featured/')
        const data = await res.json()
        if (mounted) setFeaturedProducts(data.results || data || [])
      } catch {
        if (mounted) setFeaturedProducts([])
      } finally {
        if (mounted) setFeaturedLoading(false)
      }
    }
    loadFeatured()
    return () => { mounted = false }
  }, [])

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmitContacto = async (e) => {
    e.preventDefault()
    setSending(true); setErrors({}); setMessage('')
    try {
      const response = await fetch(buildApiUrl('contacto/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 429) setErrors({ general: 'Límite de envíos. Intenta en una hora.' })
        else setErrors(data)
      } else {
        setMessage('Mensaje enviado exitosamente.')
        setFormData({ nombre: '', correo: '', asunto: '', mensaje: '' })
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setSending(false) }
  }

  return (
    <div className="landing">
      <section id="inicio" className="hero container" style={{ paddingTop: '80px' }}>
        <div className="hero-content">
          <span className="hero-badge">Plataforma de Gestión</span>
          <h1>Bienvenido a <span className="highlight">RED</span></h1>
          <p>Tu plataforma de personalización de camisetas con edición 3D en tiempo real.</p>
          <div className="hero-cta">
            {loggedIn ? (
              <Link to="/catalog" className="btn btn-primary">Ver Catálogo</Link>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary">Iniciar Sesión</Link>
                <Link to="/register" className="btn btn-outline-primary">Crear Cuenta</Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-visual">
          <Suspense fallback={<div className="hero-visual-placeholder"><span className="text-muted">Cargando visor 3D...</span></div>}>
            <Product3DViewer height="100%" autoRotate={true} />
          </Suspense>
        </div>
      </section>

      <section id="nosotros" className="features">
        <div className="container">
          <div className="section-header">
            <h2>¿Por qué elegirnos?</h2>
            <p>Todo lo que necesitas para crear tus camisetas personalizadas</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">{ICON_MAP[f.icon]}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!featuredLoading && featuredProducts.length > 0 && (
        <section id="productos" className="featured-products">
          <div className="container">
            <div className="section-header">
              <h2>Productos Destacados</h2>
              <p>Los más populares de nuestra colección</p>
            </div>
            <div className="products-grid">
              {featuredProducts.slice(0, 8).map(p => <FeaturedCard key={p.id} product={p} />)}
            </div>
          </div>
        </section>
      )}

      <section id="contacto" className="contact-section">
        <div className="container">
          <div className="section-header">
            <h2>Contáctanos</h2>
            <p>¿Tienes preguntas? Nos encantaría escuchar de ti.</p>
          </div>
          <div className="contact-content">
            <div className="contact-info">
              <h3>Hablemos</h3>
              <p>Estamos aquí para ayudarte. Completa el formulario y te responderemos a la brevedad.</p>
            </div>
            <form onSubmit={handleSubmitContacto} className="contact-form">
              {message && <div className="success-message">{message}</div>}
              {errors.general && <div className="error-message">{errors.general}</div>}
              <div className="form-group">
                <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Tu nombre" required className={"form-control" + (errors.nombre ? ' is-invalid' : '')} />
                {errors.nombre && <div className="field-error">{Array.isArray(errors.nombre) ? errors.nombre[0] : errors.nombre}</div>}
              </div>
              <div className="form-group">
                <input type="email" name="correo" value={formData.correo} onChange={handleChange} placeholder="tu@email.com" required className={"form-control" + (errors.correo ? ' is-invalid' : '')} />
                {errors.correo && <div className="field-error">{Array.isArray(errors.correo) ? errors.correo[0] : errors.correo}</div>}
              </div>
              <div className="form-group">
                <input type="text" name="asunto" value={formData.asunto} onChange={handleChange} placeholder="Asunto" className={"form-control" + (errors.asunto ? ' is-invalid' : '')} />
                {errors.asunto && <div className="field-error">{Array.isArray(errors.asunto) ? errors.asunto[0] : errors.asunto}</div>}
              </div>
              <div className="form-group">
                <textarea name="mensaje" value={formData.mensaje} onChange={handleChange} placeholder="Tu mensaje..." rows={4} required className={"form-control" + (errors.mensaje ? ' is-invalid' : '')} />
                {errors.mensaje && <div className="field-error">{Array.isArray(errors.mensaje) ? errors.mensaje[0] : errors.mensaje}</div>}
              </div>
              <button type="submit" disabled={sending} className="btn btn-primary w-100">
                {sending ? 'Enviando...' : 'Enviar Mensaje'}
              </button>
              <p className="form-note">Máximo 3 mensajes por hora</p>
            </form>
          </div>
        </div>
      </section>

      <section id="empezar" className="cta-section container">
        <h2>¿Listo para empezar?</h2>
        <p>Únete a nuestra plataforma y descubre todas las funcionalidades.</p>
        <Link to="/register" className="btn btn-primary btn-lg">Crear Cuenta Gratis</Link>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3>Sobre Nosotros</h3>
              <a href="#about">Acerca de</a>
              <a href="#blog">Blog</a>
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
            <p>&copy; {new Date().getFullYear()} RED. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
