import { useState, useEffect, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { buildApiUrl } from '../services/api'
import { isAuthenticated } from '../services/authService'
import { SwatchPanel } from '../components/SwatchPanel'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import heroImg from '../assets/hero.png'

const Product3DViewer = lazy(() => import('../components/Product3DViewer'))

// Swatches del "mini editor" del hero: paleta de marca Rojo/Negro/Gris.
const HERO_SWATCHES = [
  { value: '#dc2626', label: 'Rojo' },
  { value: '#111111', label: 'Negro' },
  { value: '#9ca3af', label: 'Gris' },
  { value: '#f5f5f5', label: 'Blanco' },
]

const HERO_CHECKS = ['Editor 3D', 'Tiempo real', 'Pago seguro']

// En móvil no cargamos el modelo 3D completo: mostramos una imagen estática.
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

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

const testimonials = [
  {
    name: 'Valentina R.',
    role: 'Compradora frecuente',
    quote: 'El editor 3D es increíble. Pude ver exactamente cómo quedaría mi diseño antes de pedirlo y quedó perfecto.',
  },
  {
    name: 'Andrés M.',
    role: 'Estudiante de diseño',
    quote: 'La calidad del estampado es superior a lo que esperaba. Los colores no se agrietan ni se destiñen con los lavados.',
  },
  {
    name: 'Sofía G.',
    role: 'Emprendedora',
    quote: 'Pedí camisetas personalizadas para mi marca y el proceso fue rapidísimo. En 48 horas ya las tenía en la puerta.',
  },
]

const stats = [
  { value: '4.9/5', label: 'Valoración promedio' },
  { value: '2,500+', label: 'Pedidos entregados' },
  { value: '48h', label: 'Tiempo de envío' },
  { value: '24/7', label: 'Editor disponible' },
]

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
  const isMobile = useIsMobile()
  const prefersReducedMotion = usePrefersReducedMotion()
  const [shirtColor, setShirtColor] = useState(null)
  const [spin, setSpin] = useState(true)
  const rotate = spin && !prefersReducedMotion
  const [formData, setFormData] = useState({ nombre: '', correo: '', asunto: '', mensaje: '' })
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const [featuredProducts, setFeaturedProducts] = useState([])
  const [featuredLoading, setFeaturedLoading] = useState(true)
  const [tIndex, setTIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setTIndex(i => (i + 1) % testimonials.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

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
          <span className="hero-badge">Tienda Virtual con Personalización 3D</span>
          <h1>Bienvenido a <span className="highlight">RED</span></h1>
          <p>Tu plataforma de personalización de camisetas con edición 3D en tiempo real.</p>
          <div className="hero-cta">
            <Link to="/catalog" className="btn btn-primary">Ver Catálogo</Link>
            {!loggedIn && <Link to="/register" className="btn btn-outline-primary">Crear Cuenta</Link>}
          </div>
          <ul className="hero-checks">
            {HERO_CHECKS.map((item) => (
              <li key={item}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="hero-visual">
          {isMobile ? (
            <div className="hero-visual-mobile">
              <img src={heroImg} alt="Camiseta RED personalizable" className="hero-visual-img" />
            </div>
          ) : (
            <div className="hero-viewer">
              <div className="hero-canvas">
                <Suspense fallback={<div className="hero-visual-placeholder"><span className="text-muted">Cargando visor 3D...</span></div>}>
                  <Product3DViewer height="100%" autoRotate={rotate} color={shirtColor} enableZoom={false} />
                </Suspense>
              </div>
              <SwatchPanel colors={HERO_SWATCHES} value={shirtColor} onChange={setShirtColor} label="Color de la camiseta" />
              <span className="hero-3d-badge">Editor 3D en tiempo real</span>
              <button
                type="button"
                className={`hero-360 ${rotate ? 'hero-360--active' : ''}`}
                onClick={() => setSpin(s => !s)}
                aria-label={rotate ? 'Desactivar rotación' : 'Activar rotación'}
                aria-pressed={rotate}
              >360°</button>
            </div>
          )}
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

      <section className="trust-bar">
        <div className="container trust-bar-grid">
          {stats.map((s, i) => (
            <div key={i} className="trust-stat">
              <div className="trust-value">{s.value}</div>
              <div className="trust-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="testimonios" className="testimonials">
        <div className="container">
          <div className="section-header">
            <h2>Lo que dicen nuestros clientes</h2>
            <p>Personas reales, camisetas reales, diseños únicos</p>
          </div>
          <div className="testimonial-carousel">
            <div className="testimonial-track" style={{ transform: `translateX(-${tIndex * 100}%)` }}>
              {testimonials.map((t, i) => (
                <div key={i} className="testimonial-slide">
                  <span className="testimonial-quote">“{t.quote}”</span>
                  <div className="testimonial-author">
                    <div className="testimonial-avatar">{t.name.charAt(0)}</div>
                    <div>
                      <div className="testimonial-name">{t.name}</div>
                      <div className="testimonial-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="testimonial-dots">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  className={`testimonial-dot ${i === tIndex ? 'active' : ''}`}
                  onClick={() => setTIndex(i)}
                  aria-label={`Testimonio ${i + 1}`}
                />
              ))}
            </div>
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
    </div>
  )
}
