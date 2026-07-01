// ---------------------------------------------------------------
// Auth.jsx  —  Página de login/registro con doble modo (RF-055)
// APIs consumidas:
//   POST /api/login/login/           — inicio de sesión (JWT)
//   POST /api/auth/registro/         — registro de usuario
// Hooks: useState, useEffect, useNavigate, useLocation
// Estado global: authService (setTokens, getAccessToken)
// Validaciones: email con regex, contraseña con fortaleza
//               (mayúscula, minúscula, número, especial, >= 8)
// Flujo login: validateLogin → POST login → setTokens → redirect
// Flujo registro: validateRegister → POST registro → redirect a
//                 /verificar-email-pendiente
// ---------------------------------------------------------------
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { buildApiUrl } from '../services/api'
import { getAccessToken, setTokens } from '../services/authService'

// passwordStrength — evalúa seguridad de la contraseña (0-5)
// Devuelve: score, label (Débil/Regular/Buena/Fuerte), color, pct
function passwordStrength(pw) {
  let score = 0
  const checks = []
  if (pw.length >= 8) { score++; checks.push('8+ caracteres') }
  if (/[a-z]/.test(pw)) { score++; checks.push('minúscula') }
  if (/[A-Z]/.test(pw)) { score++; checks.push('mayúscula') }
  if (/\d/.test(pw)) { score++; checks.push('número') }
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) { score++; checks.push('especial') }
  const label = pw.length === 0 ? '' : score <= 2 ? 'Débil' : score <= 3 ? 'Regular' : score <= 4 ? 'Buena' : 'Fuerte'
  const color = pw.length === 0 ? '#d4d4d4' : score <= 2 ? '#dc2626' : score <= 3 ? '#f59e0b' : score <= 4 ? '#16a34a' : '#16a34a'
  const pct = pw.length === 0 ? 0 : (score / 5) * 100
  return { score, label, color, pct, checks }
}

export const Auth = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const [isLogin, setIsLogin] = useState(!location.pathname.includes('/register'))
  const [animKey, setAnimKey] = useState(0)
  const [loginData, setLoginData] = useState({ correo: '', contrasena: '' })
  const [registerData, setRegisterData] = useState({ usuario: '', correo: '', contrasena: '', confirmar_contrasena: '' })
  const [errors, setErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwTouched, setPwTouched] = useState(false)

  useEffect(() => { setErrors({}); setFieldErrors({}); setSuccess(false); setAnimKey(k => k + 1); setShowConfirm(false); setPwTouched(false) }, [isLogin])

  useEffect(() => {
    const token = getAccessToken()
    if (token) navigate('/dashboard')
  }, [navigate])

  function getError(errors, field) {
    const val = errors[field]
    if (!val) return null
    if (Array.isArray(val)) return val[0]
    if (typeof val === 'string') return val
    return null
  }

  function generalError(errors) {
    return getError(errors, 'general') || getError(errors, 'non_field_errors') || getError(errors, 'detail') || getError(errors, 'error') || null
  }

  // ---------------------------------------------------------------
  // validateLogin — validación cliente del formulario de login
  // Correo obligatorio con formato básico; contraseña obligatoria
  // ---------------------------------------------------------------
  function validateLogin() {
    const errs = {}
    if (!loginData.correo.trim()) errs.correo = 'El usuario o correo es obligatorio'
    if (!loginData.contrasena) errs.contrasena = 'La contraseña es obligatoria'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ---------------------------------------------------------------
  // validateRegister — validación cliente del formulario de registro
  // Usuario >= 3 caracteres; correo con formato; contraseña con
  // fortaleza (mayúscula, número, especial, >= 8); confirmación
  // ---------------------------------------------------------------
  function validateRegister() {
    const errs = {}
    if (!registerData.usuario.trim()) errs.usuario = 'El usuario es obligatorio'
    else if (registerData.usuario.length < 3) errs.usuario = 'Mínimo 3 caracteres'
    if (!registerData.correo.trim()) errs.correo = 'El correo es obligatorio'
    else if (!/\S+@\S+\.\S+/.test(registerData.correo)) errs.correo = 'Correo inválido'
    if (!registerData.contrasena) {
      errs.contrasena = 'La contraseña es obligatoria'
    } else {
      if (registerData.contrasena.length < 8) errs.contrasena = 'Mínimo 8 caracteres'
      else if (!/[A-Z]/.test(registerData.contrasena)) errs.contrasena = 'Debe incluir una mayúscula'
      else if (!/\d/.test(registerData.contrasena)) errs.contrasena = 'Debe incluir un número'
      else if (!/[!@#$%^&*(),.?":{}|<>]/.test(registerData.contrasena)) errs.contrasena = 'Debe incluir un carácter especial'
    }
    if (showConfirm && registerData.contrasena !== registerData.confirmar_contrasena) errs.confirmar_contrasena = 'Las contraseñas no coinciden'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ---------------------------------------------------------------
  // handleLoginSubmit — POST a login/login/ con credenciales
  // Éxito: almacena tokens JWT vía setTokens y redirige según rol
  // Error: muestra errores de campo o mensaje general (429, etc.)
  // ---------------------------------------------------------------
  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!validateLogin()) return
    setLoading(true); setErrors({})
    try {
      const response = await fetch(buildApiUrl('login/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      })
      const data = await response.json()
      if (!response.ok) {
        setErrors(typeof data === 'object' ? data : { general: data.error || 'Credenciales inválidas' })
      } else {
        setTokens(data.access, data.refresh, data.usuario)
        const usr = data.usuario || {}
        navigate('/dashboard')
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setLoading(false) }
  }

  // ---------------------------------------------------------------
  // handleRegisterSubmit — POST a auth/registro/ con datos
  // Éxito: muestra mensaje y redirige a verificar-email-pendiente
  // Error: muestra errores de campo o mensaje general
  // ---------------------------------------------------------------
  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!validateRegister()) return
    setLoading(true); setErrors({})
    try {
      const response = await fetch(buildApiUrl('auth/registro/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData),
      })
      const data = await response.json()
      if (!response.ok) setErrors(typeof data === 'object' ? data : { general: data.error || 'Error al registrar' })
      else {
        setSuccess(true)
        setRegisterData({ usuario: '', correo: '', contrasena: '', confirmar_contrasena: '' })
        setTimeout(() => navigate('/verificar-email-pendiente'), 2000)
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setLoading(false) }
  }

  const b = '#dc2626'
  const w = '#ffffff'
  const k = '#000000'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', background: w,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      flexDirection: window.innerWidth < 768 ? 'column' : 'row',
    }}>
      <div style={{
        flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(24px, 5vw, 64px)', background: w,
        minWidth: 0,
      }}>
        <div style={{ marginBottom: 24 }}>
          <Link to="/" style={{
            textDecoration: 'none', color: k, fontWeight: 800, fontSize: 22, letterSpacing: -0.5,
          }}>
            RED
          </Link>
        </div>

        <div style={{
          background: w, borderRadius: 16, border: '1px solid #e5e5e5',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)', overflow: 'hidden',
          width: '100%', maxWidth: 480,
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e5e5' }}>
            <button onClick={() => setIsLogin(true)}
              style={{
                flex: 1, padding: '18px 20px', border: 'none',
                background: 'transparent', color: isLogin ? b : '#999',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                borderBottom: isLogin ? `2px solid ${b}` : '2px solid transparent',
                transition: 'all 0.2s', marginBottom: -1, letterSpacing: 0.5,
              }}
            >INICIAR SESIÓN</button>
            <button onClick={() => setIsLogin(false)}
              style={{
                flex: 1, padding: '18px 20px', border: 'none',
                background: 'transparent', color: !isLogin ? b : '#999',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                borderBottom: !isLogin ? `2px solid ${b}` : '2px solid transparent',
                transition: 'all 0.2s', marginBottom: -1, letterSpacing: 0.5,
              }}
            >REGISTRARSE</button>
          </div>

          <div key={animKey} style={{
            padding: '32px',
            animation: `${isLogin ? 'slideInRight' : 'slideInLeft'} 0.3s ease`,
          }}>
            {generalError(errors) && (
              <div style={{
                padding: '10px 14px', background: '#fef2f2', color: '#991b1b',
                borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #fecaca',
              }}>{generalError(errors)}</div>
            )}
            {success && (
              <div style={{
                padding: '10px 14px', background: '#f0fdf4', color: '#065f46',
                borderRadius: 8, fontSize: 13, marginBottom: 16, border: '1px solid #bbf7d0',
              }}>Registro exitoso. Redirigiendo...</div>
            )}

            {isLogin ? (
              <form onSubmit={handleLoginSubmit}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: k, marginBottom: 6 }}>Usuario o correo</label>
                  <input type="text" name="correo" value={loginData.correo}
                    onChange={e => { setLoginData(p => ({ ...p, correo: e.target.value })); setFieldErrors(f => ({...f, correo: undefined})) }}
                    placeholder="usuario o correo" required
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 8,
                      border: fieldErrors.correo ? '1px solid #dc2626' : '1px solid #d4d4d4',
                      background: w, color: k, fontSize: 14, outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = b; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.08)' }}
                    onBlur={e => { e.target.style.borderColor = fieldErrors.correo ? '#dc2626' : '#d4d4d4'; e.target.style.boxShadow = 'none' }}
                  />
                  {(fieldErrors.correo || getError(errors, 'correo')) && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.correo || getError(errors, 'correo')}</p>}
                </div>
                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: k, marginBottom: 6 }}>Contraseña</label>
                  <input type="password" name="contrasena" value={loginData.contrasena}
                    onChange={e => { setLoginData(p => ({ ...p, contrasena: e.target.value })); setFieldErrors(f => ({...f, contrasena: undefined})) }}
                    placeholder="Tu contraseña" required
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 8,
                      border: fieldErrors.contrasena ? '1px solid #dc2626' : '1px solid #d4d4d4',
                      background: w, color: k, fontSize: 14, outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = b; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.08)' }}
                    onBlur={e => { e.target.style.borderColor = fieldErrors.contrasena ? '#dc2626' : '#d4d4d4'; e.target.style.boxShadow = 'none' }}
                  />
                  {(fieldErrors.contrasena || getError(errors, 'contrasena')) && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.contrasena || getError(errors, 'contrasena')}</p>}
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: 8, border: 'none',
                  background: loading ? '#999' : b, color: w,
                  fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: 1,
                }}>
                  {loading ? 'INICIANDO...' : 'INICIAR SESIÓN'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: k, marginBottom: 6 }}>Nombre de usuario</label>
                  <input type="text" name="usuario" value={registerData.usuario}
                    onChange={e => { setRegisterData(p => ({ ...p, usuario: e.target.value })); setFieldErrors(f => ({...f, usuario: undefined})) }}
                    placeholder="miusuario" required
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 8,
                      border: fieldErrors.usuario ? '1px solid #dc2626' : '1px solid #d4d4d4',
                      background: w, color: k, fontSize: 14, outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = b; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.08)' }}
                    onBlur={e => { e.target.style.borderColor = fieldErrors.usuario ? '#dc2626' : '#d4d4d4'; e.target.style.boxShadow = 'none' }}
                  />
                  {(fieldErrors.usuario || getError(errors, 'usuario')) && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.usuario || getError(errors, 'usuario')}</p>}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: k, marginBottom: 6 }}>Correo electrónico</label>
                  <input type="email" name="correo" value={registerData.correo}
                    onChange={e => { setRegisterData(p => ({ ...p, correo: e.target.value })); setFieldErrors(f => ({...f, correo: undefined})) }}
                    placeholder="tu@email.com" required
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 8,
                      border: fieldErrors.correo ? '1px solid #dc2626' : '1px solid #d4d4d4',
                      background: w, color: k, fontSize: 14, outline: 'none',
                    }}
                    onFocus={e => { e.target.style.borderColor = b; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.08)' }}
                    onBlur={e => { e.target.style.borderColor = fieldErrors.correo ? '#dc2626' : '#d4d4d4'; e.target.style.boxShadow = 'none' }}
                  />
                  {(fieldErrors.correo || getError(errors, 'correo')) && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.correo || getError(errors, 'correo')}</p>}
                </div>
                <div style={{ marginBottom: showConfirm ? 12 : 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: k, marginBottom: 6 }}>Contraseña</label>
                  <input type="password" name="contrasena" value={registerData.contrasena}
                    onChange={e => {
                      setRegisterData(p => ({ ...p, contrasena: e.target.value }))
                      setFieldErrors(f => ({...f, contrasena: undefined}))
                      if (!showConfirm && e.target.value.length > 0) setShowConfirm(true)
                    }}
                    placeholder="Mínimo 8 caracteres" required
                    onFocus={e => {
                      e.target.style.borderColor = b
                      e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.08)'
                      setPwTouched(true)
                      if (!showConfirm && registerData.contrasena.length > 0) setShowConfirm(true)
                    }}
                    onBlur={e => { e.target.style.borderColor = fieldErrors.contrasena ? '#dc2626' : '#d4d4d4'; e.target.style.boxShadow = 'none' }}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 8,
                      border: fieldErrors.contrasena ? '1px solid #dc2626' : '1px solid #d4d4d4',
                      background: w, color: k, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {pwTouched && registerData.contrasena.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ height: 4, background: '#e5e5e5', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${passwordStrength(registerData.contrasena).pct}%`, background: passwordStrength(registerData.contrasena).color, borderRadius: 2, transition: 'width 0.3s ease' }} />
                      </div>
                      <p style={{ fontSize: 11, color: passwordStrength(registerData.contrasena).color, margin: '3px 0 0', fontWeight: 600 }}>
                        {passwordStrength(registerData.contrasena).label}
                      </p>
                    </div>
                  )}
                  {(fieldErrors.contrasena || getError(errors, 'contrasena')) && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.contrasena || getError(errors, 'contrasena')}</p>}
                </div>
                <div className={`confirm-pw-wrap ${showConfirm ? 'visible' : ''}`} style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: k, marginBottom: 6 }}>Confirmar contraseña</label>
                  <input type="password" name="confirmar_contrasena" value={registerData.confirmar_contrasena}
                    onChange={e => { setRegisterData(p => ({ ...p, confirmar_contrasena: e.target.value })); setFieldErrors(f => ({...f, confirmar_contrasena: undefined})) }}
                    placeholder="Repite tu contraseña" required
                    onFocus={e => { e.target.style.borderColor = b; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.08)' }}
                    onBlur={e => { e.target.style.borderColor = fieldErrors.confirmar_contrasena ? '#dc2626' : '#d4d4d4'; e.target.style.boxShadow = 'none' }}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 8,
                      border: fieldErrors.confirmar_contrasena ? '1px solid #dc2626' : '1px solid #d4d4d4',
                      background: w, color: k, fontSize: 14, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {(fieldErrors.confirmar_contrasena || getError(errors, 'confirmar_contrasena')) && <p style={{ fontSize: 12, color: '#dc2626', margin: '4px 0 0' }}>{fieldErrors.confirmar_contrasena || getError(errors, 'confirmar_contrasena')}</p>}
                </div>
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: 8, border: 'none',
                  background: loading ? '#999' : b, color: w,
                  fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                  letterSpacing: 1,
                }}>
                  {loading ? 'CREANDO...' : 'CREAR CUENTA'}
                </button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: 20, paddingTop: 16, borderTop: '1px solid #e5e5e5' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#666' }}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <button type="button" onClick={() => setIsLogin(!isLogin)} style={{
                  background: 'none', border: 'none', color: b, fontWeight: 700,
                  fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
                }}>
                  {isLogin ? 'Regístrate aquí' : 'Inicia sesión aquí'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-benefits-col" style={{
        flex: 0.8, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: 'clamp(24px, 4vw, 48px)', background: w,
        borderLeft: '1px solid #e5e5e5',
      }}>
        <div>
          <h2 style={{
            fontSize: 'clamp(20px, 2.5vw, 28px)', fontWeight: 800, color: k,
            marginBottom: 8, letterSpacing: -0.5,
          }}>Únete a <span style={{ color: b }}>RED</span></h2>
          <p style={{
            color: '#666', marginBottom: 32, lineHeight: 1.6,
            fontSize: 'clamp(13px, 1.2vw, 15px)',
          }}>
            Accede a funciones exclusivas de personalización y gestión
          </p>
          {[
            { title: 'Editor 3D', desc: 'Personaliza camisas con nuestro editor avanzado' },
            { title: 'Guarda tus Diseños', desc: 'Accede desde cualquier dispositivo' },
            { title: 'Ofertas Exclusivas', desc: 'Recibe descuentos y ofertas especiales' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 20, alignItems: 'flex-start' }}>
              <div style={{
                width: 36, height: 36, background: b, color: w,
                borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 14, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ minWidth: 0 }}>
                <h3 style={{
                  fontSize: 'clamp(13px, 1.1vw, 15px)', fontWeight: 700, color: k,
                  marginBottom: 2,
                }}>{item.title}</h3>
                <p style={{
                  margin: 0, fontSize: 'clamp(12px, 1vw, 13px)', color: '#666',
                  lineHeight: 1.4,
                }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        .confirm-pw-wrap { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.35s ease, opacity 0.35s ease, margin 0.35s ease; margin-bottom: 0 !important; }
        .confirm-pw-wrap.visible { max-height: 120px; opacity: 1; margin-bottom: 22px !important; }
        @media (max-width: 768px) {
          .auth-benefits-col { display: none !important; }
        }
      `}</style>
    </div>
  )
}
