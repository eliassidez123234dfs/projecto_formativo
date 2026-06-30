import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { buildApiUrl } from '../services/api'
import { isAuthenticated, getCurrentUser } from '../services/authService'

const ProfessionalTshirtSVG = () => (
  <svg viewBox="0 0 200 180" width="200" height="180" xmlns="http://www.w3.org/2000/svg">
    <path d="M30,40 L0,70 L30,80 L30,170 L170,170 L170,80 L200,70 L170,40 L140,20 Q100,35 60,20 Z"
      fill="#DC2626" />
    <path d="M60,20 Q100,50 140,20 L140,45 Q100,65 60,45 Z"
      fill="#B91C1C" />
    <rect x="88" y="85" width="24" height="24" rx="3" fill="rgba(255,255,255,0.25)" />
  </svg>
)

const features = [
  {
    icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    title: 'Editor 3D en Tiempo Real',
    desc: 'Visualiza tus diseños sobre la camiseta antes de comprar, gira y amplía para ver cada detalle.',
  },
  {
    icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>,
    title: 'Materiales de Calidad',
    desc: 'Camisetas estampadas de alta durabilidad que no se agrietan ni destiñen con los lavados.',
  },
  {
    icon: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
    title: 'Envío Rápido',
    desc: 'Procesamos tu pedido en 24-48 horas y lo recibes en la puerta de tu casa con seguimiento en tiempo real.',
  },
]

// Public landing page — hero, feature cards, contact form with rate limiting, and footer
export const Landing = () => {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(() => isAuthenticated())
  const [usuario, setUsuario] = useState(() => getCurrentUser())

  const [formData, setFormData] = useState({ nombre: '', correo: '', asunto: '', mensaje: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})

  const handleChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleSubmitContacto = async (e) => {
    e.preventDefault()
    setLoading(true); setErrors({}); setMessage('')
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
    finally { setLoading(false) }
  }

  const r = 'var(--color-primary)'

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      minHeight: '100vh', background: 'var(--color-bg)', color: 'var(--color-text)',
    }}>
      <Header />

      <section style={{
        maxWidth: 1200, margin: '0 auto', padding: 'clamp(40px, 6vw, 80px) clamp(16px, 3vw, 24px)',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 'clamp(24px, 4vw, 64px)', alignItems: 'center',
      }}>
        <div>
          <span style={{
            display: 'inline-block', padding: '4px 14px', background: 'var(--color-primary-light)',
            color: '#991b1b', borderRadius: 20, fontSize: 12, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 20,
          }}>
            Plataforma de Gestión
          </span>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, lineHeight: 1.15,
            marginBottom: 16, letterSpacing: -1,
          }}>
            Bienvenido a <span style={{ color: r }}>RED</span>
          </h1>
          <p style={{
            fontSize: 'clamp(14px, 1.2vw, 16px)', color: 'var(--color-text-muted)',
            lineHeight: 1.7, marginBottom: 28,
          }}>
            Tu plataforma de personalización de camisetas con edición 3D en tiempo real.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {loggedIn ? (
              <Link to="/catalog" style={{
                padding: '12px 28px', borderRadius: 8, border: 'none',
                background: r, color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.target.style.background = '#b91c1c'}
                onMouseLeave={e => e.target.style.background = r}
              >
                Ver Catálogo
              </Link>
            ) : (
              <>
                <Link to="/login" style={{
                  padding: '12px 28px', borderRadius: 8, border: 'none',
                  background: r, color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none',
                }}>
                  Iniciar Sesión
                </Link>
                <Link to="/register" style={{
                  padding: '12px 28px', borderRadius: 8, border: `1px solid ${r}`,
                  color: r, fontWeight: 600, fontSize: 14, textDecoration: 'none',
                }}>
                  Crear Cuenta
                </Link>
              </>
            )}
          </div>
        </div>
        <div style={{
          width: '100%', aspectRatio: '4/3',
          background: 'linear-gradient(135deg, #fef2f2 0%, #fff 100%)',
          borderRadius: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--color-border)',
        }}>
          <ProfessionalTshirtSVG />
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--color-border)', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 24px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
              ¿Por qué elegirnos?
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>Todo lo que necesitas para crear tus camisetas personalizadas</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                padding: 28, border: '1px solid var(--color-border)', borderRadius: 12,
                background: 'var(--color-bg)', textAlign: 'center',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                <div style={{ marginBottom: 16, display: 'inline-flex' }}>{f.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ borderTop: '1px solid var(--color-border)', padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 24px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
              Contáctanos
            </h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>¿Tienes preguntas? Nos encantaría escuchar de ti.</p>
          </div>
          <div style={{
            display: 'flex', justifyContent: 'center',
          }}>
            <form onSubmit={handleSubmitContacto} style={{
              background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 12,
              padding: 28, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 420,
            }}>
              {message && <div style={{ padding: '10px 14px', background: 'var(--color-success-light)', color: '#065f46', borderRadius: 8, fontSize: 13 }}>{message}</div>}
              {errors.general && <div style={{ padding: '10px 14px', background: 'var(--color-error-light)', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>{errors.general}</div>}
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Tu nombre" required style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none' }} />
              <input type="email" name="correo" value={formData.correo} onChange={handleChange} placeholder="tu@email.com" required style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none' }} />
              <input type="text" name="asunto" value={formData.asunto} onChange={handleChange} placeholder="Asunto" style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none' }} />
              <textarea name="mensaje" value={formData.mensaje} onChange={handleChange} placeholder="Tu mensaje..." rows={4} required style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, outline: 'none', resize: 'vertical', minHeight: 100 }} />
              <button type="submit" disabled={loading} style={{
                padding: '12px', borderRadius: 8, border: 'none',
                background: loading ? 'var(--color-text-muted)' : 'var(--color-primary)',
                color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}>
                {loading ? 'Enviando...' : 'Enviar Mensaje'}
              </button>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>Máximo 3 mensajes por hora</p>
            </form>
          </div>
        </div>
      </section>

      <section style={{
        padding: 'clamp(32px, 5vw, 64px) clamp(16px, 3vw, 24px)', textAlign: 'center',
        borderTop: '1px solid var(--color-border)',
      }}>
        <h2 style={{ fontSize: 'clamp(20px, 2.5vw, 24px)', fontWeight: 800, marginBottom: 8 }}>
          ¿Listo para empezar?
        </h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24 }}>
          Únete a nuestra plataforma y descubre todas las funcionalidades.
        </p>
        <Link to="/register" style={{
          display: 'inline-block', padding: '12px 32px', borderRadius: 8,
          background: r, color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none',
        }}>
          Crear Cuenta Gratis
        </Link>
      </section>

      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '48px 24px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 32, marginBottom: 32 }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Sobre Nosotros</h3>
              <a href="#about" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>Acerca de</a>
              <a href="#blog" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>Blog</a>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Soporte</h3>
              <a href="#faq" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>FAQ</a>
              <a href="#contact" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>Contacto</a>
            </div>
            <div>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Legal</h3>
              <a href="#privacy" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>Privacidad</a>
              <a href="#terms" style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none', display: 'block', marginBottom: 6 }}>Términos</a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #334155', paddingTop: 16, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>&copy; {new Date().getFullYear()} RED. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
