import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useCart } from '../context/CartContext'
import { buildApiUrl, fetchCatalog } from '../services/api'
import '../styles/Landing.css'

const FALLBACK_IMG = '/white-tshirt.png'
const ROTATE_MS = 3500

const ProductCarousel = ({ products }) => {
  const [idx, setIdx] = useState(0)
  const [fade, setFade] = useState(true)

  const images = products
    .map(p => p.main_image)
    .filter(Boolean)

  const total = images.length || 1

  const advance = useCallback(() => {
    setFade(false)
    setTimeout(() => {
      setIdx(i => (i + 1) % total)
      setFade(true)
    }, 300)
  }, [total])

  useEffect(() => {
    if (total <= 1) return
    const id = setInterval(advance, ROTATE_MS)
    return () => clearInterval(id)
  }, [advance, total])

  const src = images.length > 0 ? images[idx] : FALLBACK_IMG
  const name = products.find(p => p.main_image === src)?.name || ''

  return (
    <div className="relative flex h-full w-full items-center justify-center p-8">
      <img
        src={src}
        alt={name || 'Camiseta blanca personalizada'}
        className="w-[min(80%,380px)] h-auto object-contain drop-shadow-[0_0_10px_rgba(45,45,45,0.5)] drop-shadow-[0_22px_24px_rgba(120,20,30,0.22)] transition-opacity duration-300"
        style={{ opacity: fade ? 1 : 0 }}
      />
      {total > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => { setFade(false); setTimeout(() => { setIdx(i); setFade(true) }, 300) }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${i === idx ? 'bg-red-600 w-5' : 'bg-gray-300 hover:bg-gray-400'}`}
              aria-label={`Imagen ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const features = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    title: 'Editor 3D en tiempo real',
    desc: 'Visualiza tus diseños sobre la camiseta antes de comprar, gira y amplía para ver cada detalle.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
    title: 'Materiales de calidad',
    desc: 'Camisetas estampadas de alta durabilidad que no se agrietan ni destiñen con los lavados.',
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    title: 'Envío rápido',
    desc: 'Procesamos tu pedido en 24-48 horas y lo recibes en la puerta de tu casa con seguimiento en tiempo real.',
  },
]

const steps = [
  { num: '01', title: 'Elige tu camiseta', desc: 'Selecciona entre nuestra variedad de colores, tallas y materiales premium.' },
  { num: '02', title: 'Diseña en 3D', desc: 'Usa nuestro editor interactivo para personalizar tu diseño en tiempo real.' },
  { num: '03', title: 'Recibe en casa', desc: 'Procesamos y enviamos tu pedido en 24-48 horas con seguimiento completo.' },
]

export const Landing = () => {
  const navigate = useNavigate()
  const { cart } = useCart()
  const loggedIn = typeof window !== 'undefined' ? Boolean(localStorage.getItem('access_token')) : false
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetchCatalog({ page_size: 20, has_stock: true })
      .then(res => setProducts(res.results || []))
      .catch(() => {})
  }, [])

  const [formData, setFormData] = useState({ nombre: '', correo: '', asunto: '', mensaje: '' })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(p => ({ ...p, [name]: value }))
    if (fieldErrors[name]) setFieldErrors(p => ({ ...p, [name]: '' }))
  }

  const validateForm = () => {
    const errs = {}
    if (!formData.nombre.trim() || formData.nombre.trim().length < 3)
      errs.nombre = 'El nombre debe tener al menos 3 caracteres.'
    if (!formData.correo.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo.trim()))
      errs.correo = 'Ingrese un correo válido.'
    if (!formData.asunto.trim() || formData.asunto.trim().length < 3)
      errs.asunto = 'El asunto debe tener al menos 3 caracteres.'
    if (!formData.mensaje.trim() || formData.mensaje.trim().length < 10)
      errs.mensaje = 'El mensaje debe tener al menos 10 caracteres.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmitContacto = async (e) => {
    e.preventDefault()
    if (!validateForm()) return
    setLoading(true); setErrors({}); setMessage('')
    try {
      const response = await fetch(buildApiUrl('contacto/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          correo: formData.correo.trim(),
          asunto: formData.asunto.trim(),
          mensaje: formData.mensaje.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        if (response.status === 429) setErrors({ general: 'Límite de envíos. Intenta en una hora.' })
        else if (typeof data === 'object') setFieldErrors(data)
        else setErrors({ general: 'Error al enviar el mensaje.' })
      } else {
        setMessage('Mensaje enviado exitosamente.')
        setFormData({ nombre: '', correo: '', asunto: '', mensaje: '' })
        setFieldErrors({})
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setLoading(false) }
  }

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #fff1f2 48%, #f1f5f9 100%)',
      backgroundAttachment: 'fixed', color: 'var(--color-text)',
    }} id="landing-page">
      {/* Barra de navegación con el contador sincronizado del carrito */}
      <Header cartCount={cart?.total_items || 0} />

      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-red-200/40 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-32 w-[360px] h-[360px] rounded-full bg-rose-100/60 blur-3xl" />

        <div className="relative max-w-7xl !mx-auto !px-4 sm:!px-6 lg:!px-8 !py-16 md:!py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <h1 className="leading-[1.05] tracking-tight !mb-5">
              Bienvenido a <span className="!text-red-600">RED</span>
            </h1>
            <p className="!text-gray-500 leading-relaxed !mb-9 max-w-md">
              Tu plataforma de personalización de camisetas con edición 3D en tiempo real. Diseña, visualiza y recibe en la puerta de tu casa.
            </p>
            <div className="flex flex-wrap gap-3">
              {loggedIn ? (
                <Link to="/catalog" className="!px-7 !py-3 rounded-lg bg-red-600 !text-white font-semibold !text-sm shadow-[0_10px_24px_rgba(220,38,38,0.35)] hover:bg-red-700 hover:shadow-[0_14px_28px_rgba(220,38,38,0.4)] hover:-translate-y-0.5 transition-all duration-200 no-underline inline-flex items-center justify-center">
                  Ver catálogo
                </Link>
              ) : (
                <>
                  <Link to="/login" className="!px-7 !py-3 rounded-lg bg-red-600 !text-white font-semibold !text-sm shadow-[0_10px_24px_rgba(220,38,38,0.35)] hover:bg-red-700 hover:shadow-[0_14px_28px_rgba(220,38,38,0.4)] hover:-translate-y-0.5 transition-all duration-200 no-underline inline-flex items-center justify-center">
                    Iniciar sesión
                  </Link>
                  <Link to="/register" className="!px-7 !py-3 rounded-lg border border-red-200 bg-white/70 !text-red-600 font-semibold !text-sm hover:bg-red-50 hover:border-red-300 transition-colors duration-200 no-underline inline-flex items-center justify-center">
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="w-full aspect-[4/3] bg-gradient-to-br from-red-50 to-white rounded-3xl flex items-center justify-center border border-white/80 overflow-hidden">
            <ProductCarousel products={products} />
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="border-t border-gray-200/70 !py-16 md:!py-24 !px-4 sm:!px-6 lg:!px-8">
        <div className="max-w-7xl !mx-auto">
          <div className="text-center !mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] !text-red-600 !mb-3">
              Nuestra propuesta
            </span>
            <h2 className="tracking-tight !mb-3">
              ¿Por qué elegirnos?
            </h2>
            <p className="!text-gray-500">Todo lo que necesitas para crear tus camisetas personalizadas.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group !p-7 border border-white/80 rounded-2xl bg-white/55 transition-all duration-200 shadow-[0_14px_32px_rgba(30,30,30,0.06),inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-lg hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(90,20,30,0.14),inset_0_1px_0_rgba(255,255,255,0.9)]">
                <div className="!mb-5 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 border border-red-100">
                  {f.icon}
                </div>
                <h3 className="!mb-2">{f.title}</h3>
                <p className="!text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CÓMO FUNCIONA ─── */}
      <section className="border-t border-gray-200/70 !py-16 md:!py-24 !px-4 sm:!px-6 lg:!px-8 bg-white/40">
        <div className="max-w-7xl !mx-auto">
          <div className="text-center !mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] !text-red-600 !mb-3">
              Proceso simple
            </span>
            <h2 className="tracking-tight !mb-3">
              ¿Cómo funciona?
            </h2>
            <p className="!text-gray-500">Tres pasos para crear tu camiseta personalizada.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={i} className="text-center !p-8 rounded-2xl bg-white/60 border border-white/80 shadow-[0_10px_28px_rgba(30,30,30,0.05)] backdrop-blur-lg">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-600 !text-white font-bold text-sm !mb-5">
                  {s.num}
                </span>
                <h3 className="!mb-2">{s.title}</h3>
                <p className="!text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EXPLORA EL CATÁLOGO ─── */}
      <section className="border-t border-gray-200/70 !py-16 md:!py-24 !px-4 sm:!px-6 lg:!px-8">
        <div className="max-w-7xl !mx-auto">
          <div className="text-center !mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] !text-red-600 !mb-3">
              Catálogo destacado
            </span>
            <h2 className="tracking-tight !mb-3">
              Explora nuestra colección
            </h2>
            <p className="!text-gray-500">Descubre las opciones más populares de nuestros clientes.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 !mb-10">
            {products.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                to={`/product/${item.id}`}
                className="group rounded-2xl border border-white/80 bg-white/55 overflow-hidden shadow-[0_14px_32px_rgba(30,30,30,0.06)] backdrop-blur-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(90,20,30,0.14)] no-underline"
              >
                <div className="h-56 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                  {item.main_image ? (
                    <img
                      src={item.main_image}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={FALLBACK_IMG}
                      alt={item.name}
                      className="w-[60%] h-auto object-contain opacity-40"
                    />
                  )}
                </div>
                <div className="!p-5">
                  <h3 className="!mb-1 !text-gray-900">{item.name}</h3>
                  <p className="!text-red-600 font-bold">${Number(item.base_price).toLocaleString('es-CO')}</p>
                </div>
              </Link>
            ))}
            {products.length === 0 && [1, 2, 3].map(n => (
              <div key={n} className="rounded-2xl border border-white/80 bg-white/55 overflow-hidden shadow-[0_14px_32px_rgba(30,30,30,0.06)] backdrop-blur-lg animate-pulse">
                <div className="h-56 bg-gray-200" />
                <div className="!p-5 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link to="/catalog" className="inline-flex items-center gap-2 !px-8 !py-3 rounded-lg border border-red-200 bg-white/70 !text-red-600 font-semibold !text-sm hover:bg-red-50 hover:border-red-300 transition-colors duration-200 no-underline">
              Ver todo el catálogo
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CONTACTO ─── */}
      <section id="contact" className="border-t border-gray-200/70 !py-16 md:!py-24 !px-4 sm:!px-6 lg:!px-8 bg-white/40">
        <div className="max-w-7xl !mx-auto">
          <div className="text-center !mb-12">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] !text-red-600 !mb-3">
              Estamos para ayudarte
            </span>
            <h2 className="tracking-tight !mb-3">
              Contáctanos
            </h2>
            <p className="!text-gray-500">¿Tienes preguntas? Nos encantaría escuchar de ti.</p>
          </div>
          <div className="flex justify-center">
            <form onSubmit={handleSubmitContacto} className="bg-white/65 border border-white/85 rounded-2xl !p-8 flex flex-col gap-5 w-full max-w-lg shadow-[0_20px_44px_rgba(30,30,30,0.1),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
              {message && <div className="!px-4 !py-2.5 bg-green-50 !text-green-800 rounded-lg !text-sm border border-green-200">{message}</div>}
              {errors.general && <div className="!px-4 !py-2.5 bg-red-50 !text-red-800 rounded-lg !text-sm border border-red-200">{errors.general}</div>}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nombre" className="block !text-sm font-semibold !text-gray-800 !mb-1.5">Nombre</label>
                  <input
                    id="nombre" type="text" name="nombre" value={formData.nombre} onChange={handleChange}
                    placeholder="Tu nombre" required
                    className="w-full !px-4 !py-2.5 rounded-lg border border-gray-200 bg-white !text-gray-900 !text-sm outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label htmlFor="correo" className="block !text-sm font-semibold !text-gray-800 !mb-1.5">Correo</label>
                  <input
                    id="correo" type="email" name="correo" value={formData.correo} onChange={handleChange}
                    placeholder="tu@email.com" required
                    className="w-full !px-4 !py-2.5 rounded-lg border border-gray-200 bg-white !text-gray-900 !text-sm outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="asunto" className="block !text-sm font-semibold !text-gray-800 !mb-1.5">Asunto</label>
                <input
                  id="asunto" type="text" name="asunto" value={formData.asunto} onChange={handleChange}
                  placeholder="¿En qué podemos ayudarte?"
                  className="w-full !px-4 !py-2.5 rounded-lg border border-gray-200 bg-white !text-gray-900 !text-sm outline-none focus:ring-2 focus:ring-red-300 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label htmlFor="mensaje" className="block !text-sm font-semibold !text-gray-800 !mb-1.5">Mensaje</label>
                <textarea
                  id="mensaje" name="mensaje" value={formData.mensaje} onChange={handleChange}
                  placeholder="Escribe tu mensaje aquí..." rows={4} required
                  className="w-full !px-4 !py-2.5 rounded-lg border border-gray-200 bg-white !text-gray-900 !text-sm outline-none resize-y min-h-[100px] focus:ring-2 focus:ring-red-300 focus:border-transparent transition-shadow"
                />
              </div>

              <button
                type="submit" disabled={loading}
                className={`!px-4 !py-3 rounded-lg border-none font-semibold !text-sm transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 !text-white cursor-not-allowed'
                    : 'bg-red-600 !text-white shadow-[0_10px_24px_rgba(220,38,38,0.3)] hover:bg-red-700 hover:shadow-[0_14px_28px_rgba(220,38,38,0.38)] cursor-pointer'
                }`}
              >
                {loading ? 'Enviando...' : 'Enviar mensaje'}
              </button>
              <p className="!text-xs !text-gray-400 text-center">Máximo 3 mensajes por hora</p>
            </form>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="!px-4 sm:!px-6 lg:!px-8 !pb-16 md:!pb-24">
        <div className="max-w-7xl !mx-auto rounded-3xl bg-gradient-to-br from-red-600 to-red-700 !px-6 !py-14 md:!py-20 text-center shadow-[0_30px_60px_rgba(153,27,27,0.3)]">
          <h2 className="!mb-3 !text-white">
            ¿Listo para empezar?
          </h2>
          <p className="!text-red-100 !mb-8 max-w-md mx-auto">
            Únete a nuestra plataforma y descubre todas las funcionalidades. Crea tu cuenta gratuita en segundos.
          </p>
          <Link to="/register" className="inline-flex items-center justify-center !px-8 !py-3 rounded-lg bg-white !text-red-600 font-semibold !text-sm hover:bg-red-50 hover:-translate-y-0.5 transition-all duration-200 no-underline shadow-[0_10px_24px_rgba(0,0,0,0.15)]">
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="bg-gray-950 !text-gray-400">
        <div className="max-w-7xl !mx-auto !px-4 sm:!px-6 lg:!px-8 !pt-16 !pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 !mb-12">
            {/* Marca */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="inline-block !text-white font-extrabold text-xl tracking-tight no-underline !mb-4">
                RED
              </Link>
              <p className="text-sm leading-relaxed !mb-5 max-w-xs">
                Plataforma de personalización de camisetas con tecnología 3D. Diseña, visualiza y recibe en casa.
              </p>
              <div className="flex gap-3">
                <span className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center !text-gray-400 hover:bg-red-600 hover:!text-white transition-colors cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 4.557a9.83 9.83 0 01-2.828.775 4.932 4.932 0 002.165-2.724 9.864 9.864 0 01-3.127 1.195A4.916 4.916 0 0016.616 2c-2.72 0-4.924 2.204-4.924 4.924 0 .386.044.762.128 1.124C7.728 7.87 4.1 5.89 1.671 2.905a4.904 4.904 0 00-.672 2.475c0 1.71.872 3.213 2.19 4.096A4.903 4.903 0 01.96 6.56v.06c0 2.39 1.7 4.375 3.95 4.827a4.935 4.935 0 01-2.224.084c.627 1.956 2.444 3.38 4.6 3.42A9.868 9.868 0 010 19.54a13.94 13.94 0 007.548 2.212c9.057 0 14.01-7.513 14.01-14.01 0-.213-.005-.425-.014-.636A10.012 10.012 0 0024 4.557z" /></svg>
                </span>
                <span className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center !text-gray-400 hover:bg-red-600 hover:!text-white transition-colors cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                </span>
                <span className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center !text-gray-400 hover:bg-red-600 hover:!text-white transition-colors cursor-pointer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.93.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z" /></svg>
                </span>
              </div>
            </div>

            {/* Producto */}
            <div>
              <h4 className="!text-white !mb-4">Producto</h4>
              <ul className="space-y-2.5">
                <li><a href="#about" className="text-sm hover:!text-red-400 transition-colors">Catálogo</a></li>
                <li><a href="#features" className="text-sm hover:!text-red-400 transition-colors">Editor 3D</a></li>
                <li><a href="#pricing" className="text-sm hover:!text-red-400 transition-colors">Precios</a></li>
                <li><a href="#custom" className="text-sm hover:!text-red-400 transition-colors">Personalización</a></li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <h4 className="!text-white !mb-4">Empresa</h4>
              <ul className="space-y-2.5">
                <li><a href="#about" className="text-sm hover:!text-red-400 transition-colors">Sobre nosotros</a></li>
                <li><a href="#blog" className="text-sm hover:!text-red-400 transition-colors">Blog</a></li>
                <li><a href="#careers" className="text-sm hover:!text-red-400 transition-colors">Carreras</a></li>
                <li><a href="#press" className="text-sm hover:!text-red-400 transition-colors">Prensa</a></li>
              </ul>
            </div>

            {/* Soporte */}
            <div>
              <h4 className="!text-white !mb-4">Soporte</h4>
              <ul className="space-y-2.5">
                <li><a href="#faq" className="text-sm hover:!text-red-400 transition-colors">Preguntas frecuentes</a></li>
                <li><a href="#contact" className="text-sm hover:!text-red-400 transition-colors">Contacto</a></li>
                <li><a href="#terms" className="text-sm hover:!text-red-400 transition-colors">Términos de uso</a></li>
                <li><a href="#privacy" className="text-sm hover:!text-red-400 transition-colors">Política de privacidad</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 !pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="!text-xs !text-gray-500">
              &copy; {new Date().getFullYear()} RED — Red de Estampación. Todos los derechos reservados.
            </p>
            <div className="flex gap-5">
              <a href="#terms" className="!text-xs !text-gray-500 hover:!text-gray-300 transition-colors">Términos</a>
              <a href="#privacy" className="!text-xs !text-gray-500 hover:!text-gray-300 transition-colors">Privacidad</a>
              <a href="#cookies" className="!text-xs !text-gray-500 hover:!text-gray-300 transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
