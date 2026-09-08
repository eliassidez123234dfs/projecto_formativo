/**
 * AuthPage.jsx — Página de autenticación (login y registro).
 *
 * Sección izquierda: Panel de marca con beneficios de la plataforma.
 * Sección derecha: Formulario con dos modos (login/register) intercambiables.
 *
 * Decisiones de diseño:
 * - Validación en cliente antes de enviar al servidor.
 * - Barra de fortaleza de contraseña en tiempo real (registro).
 * - Redirección automática a /dashboard si ya existe sesión.
 * - Manejo de errores por campo y errores generales separados.
 */
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../services/api'
import { setTokens } from '../services/authService'
import '../styles/AuthPage.css'

// ─── UTILIDAD: EVALUACIÓN DE FORTALEZA DE CONTRASEÑA ───
// Retorna label, color y porcentaje basado en la complejidad del password.
function passwordStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[a-z]/.test(pw)) score++
  if (/[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(pw)) score++
  const label = pw.length === 0 ? '' : score <= 2 ? 'Débil' : score <= 3 ? 'Regular' : score <= 4 ? 'Buena' : 'Fuerte'
  const color = pw.length === 0 ? '#d4d4d4' : score <= 2 ? '#dc2626' : score <= 3 ? '#f59e0b' : '#16a34a'
  const pct = pw.length === 0 ? 0 : (score / 5) * 100
  return { label, color, pct }
}

// ─── COMPONENTE PRINCIPAL ───
export default function AuthPage({ defaultMode = 'login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mode, setMode] = useState(defaultMode)
  const [animKey, setAnimKey] = useState(0)
  const [loginData, setLoginData] = useState({ correo: '', contrasena: '' })
  const [registerData, setRegisterData] = useState({ usuario: '', correo: '', contrasena: '', confirmar_contrasena: '' })
  const [errors, setErrors] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwTouched, setPwTouched] = useState(false)
  const [verifiedMsg, setVerifiedMsg] = useState('')

  useEffect(() => {
    setErrors({})
    setFieldErrors({})
    setSuccess(false)
    setAnimKey(k => k + 1)
    setShowConfirm(false)
    setPwTouched(false)
  }, [mode])

  useEffect(() => {
    const token = localStorage.getItem('refresh_token')
    if (token) navigate('/dashboard', { replace: true })
  }, [navigate])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('verified') === '1') {
      setVerifiedMsg('Email verificado exitosamente. Ya puedes iniciar sesión.')
    } else if (params.get('error') === 'token-expirado') {
      setErrors({ general: 'El enlace de verificación ha expirado.' })
    } else if (params.get('error') === 'token-invalido') {
      setErrors({ general: 'El enlace de verificación no es válido.' })
    }
  }, [location.search])

// ─── UTILIDADES DE ERRORES ───
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

  function extractFieldErrors(errors) {
    const knownFields = ['usuario', 'correo', 'contrasena', 'confirmar_contrasena']
    const fieldErrs = {}
    for (const key of knownFields) {
      const val = errors[key]
      if (val) {
        fieldErrs[key] = Array.isArray(val) ? val[0] : (typeof val === 'string' ? val : null)
      }
    }
    return fieldErrs
  }

// ─── VALIDACIONES EN CLIENTE ───
function validateLogin() {
    const errs = {}
    if (!loginData.correo.trim()) errs.correo = 'El correo es obligatorio'
    else if (!/\S+@\S+\.\S+/.test(loginData.correo)) errs.correo = 'Correo inválido'
    if (!loginData.contrasena) errs.contrasena = 'La contraseña es obligatoria'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

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

// ─── HANDLERS DE ENVÍO ───
const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!validateLogin()) return
    setLoading(true)
    setErrors({})
    try {
      const response = await api.post('login/', loginData)
      const data = response.data
      setTokens(data.access, data.refresh, data.usuario)
      const usr = data.usuario || {}
      navigate(usr.rol === 'Administrador' ? '/dashboard' : '/')
    } catch (error) {
      const errData = error.response?.data || { general: 'Error al conectar con el servidor' }
      setErrors(errData)
      setFieldErrors(extractFieldErrors(errData))
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterSubmit = async (e) => {
    e.preventDefault()
    if (!validateRegister()) return
    setLoading(true)
    setErrors({})
    try {
      const response = await api.post('auth/registro/', registerData)
      setSuccess(true)
      setRegisterData({ usuario: '', correo: '', contrasena: '', confirmar_contrasena: '' })
      setTimeout(() => navigate('/verificar-email-pendiente'), 2000)
    } catch (error) {
      const errData = error.response?.data || { general: 'Error al conectar con el servidor' }
      setErrors(errData)
      setFieldErrors(extractFieldErrors(errData))
    } finally {
      setLoading(false)
    }
  }

// ─── RENDER: ESTRUCTURA DE LA PÁGINA ───
return (
    <div className="auth-page">
      {/* ─── PANEL IZQUIERDO: MARCA Y BENEFICIOS ─── */}
      <div className="auth-brand">
        <div className="auth-brand-content">
          <div className="auth-logo">RED</div>
          <h1 className="auth-tagline">Personaliza tu estilo</h1>
          <p className="auth-desc">
            Crea camisetas únicas con nuestro editor 3D. Diseña, personaliza y ordena desde cualquier lugar.
          </p>
          <div className="auth-benefits">
            {['Editor 3D en tiempo real', 'Materiales de alta calidad', 'Envío rápido y seguro'].map((text, i) => (
              <div key={i} className="auth-benefit">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="auth-curve" />
      </div>

      {/* ─── PANEL DERECHO: FORMULARIO ─── */}
      <div className="auth-form-panel">
        <div className="auth-form-container">
          <button type="button" className="auth-back-home" onClick={() => navigate('/')}>
            <span aria-hidden="true">←</span>
            Volver al inicio
          </button>

          <div className="auth-form-header">
            <h2>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
            <p>
              {mode === 'login' ? 'Accede a tu cuenta para continuar' : 'Regístrate para empezar a personalizar'}
            </p>
          </div>

          <div key={animKey} className="auth-form-body">
            {verifiedMsg && (
              <div className="auth-alert auth-alert--success">{verifiedMsg}</div>
            )}
            {generalError(errors) && (
              <div className="auth-alert auth-alert--error">{generalError(errors)}</div>
            )}
            {success && (
              <div className="auth-alert auth-alert--success">Registro exitoso. Redirigiendo...</div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <div className="auth-field">
                  <label>Correo electrónico</label>
                  <input type="email" value={loginData.correo}
                    onChange={e => { setLoginData(p => ({ ...p, correo: e.target.value })); setFieldErrors(f => ({...f, correo: undefined})) }}
                    placeholder="tu@email.com" required
                    className={fieldErrors.correo ? 'input-error' : ''}
                  />
                  {fieldErrors.correo && <span className="field-error">{fieldErrors.correo}</span>}
                </div>
                <div className="auth-field">
                  <label>Contraseña</label>
                  <input type="password" value={loginData.contrasena}
                    onChange={e => { setLoginData(p => ({ ...p, contrasena: e.target.value })); setFieldErrors(f => ({...f, contrasena: undefined})) }}
                    placeholder="Tu contraseña" required
                    className={fieldErrors.contrasena ? 'input-error' : ''}
                  />
                  {fieldErrors.contrasena && <span className="field-error">{fieldErrors.contrasena}</span>}
                </div>
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div className="auth-field">
                  <label>Nombre de usuario</label>
                  <input type="text" value={registerData.usuario}
                    onChange={e => { setRegisterData(p => ({ ...p, usuario: e.target.value })); setFieldErrors(f => ({...f, usuario: undefined})) }}
                    placeholder="miusuario" required
                    className={fieldErrors.usuario ? 'input-error' : ''}
                  />
                  {fieldErrors.usuario && <span className="field-error">{fieldErrors.usuario}</span>}
                </div>
                <div className="auth-field">
                  <label>Correo electrónico</label>
                  <input type="email" value={registerData.correo}
                    onChange={e => { setRegisterData(p => ({ ...p, correo: e.target.value })); setFieldErrors(f => ({...f, correo: undefined})) }}
                    placeholder="tu@email.com" required
                    className={fieldErrors.correo ? 'input-error' : ''}
                  />
                  {fieldErrors.correo && <span className="field-error">{fieldErrors.correo}</span>}
                </div>
                <div className="auth-field">
                  <label>Contraseña</label>
                  <input type="password" value={registerData.contrasena}
                    onChange={e => {
                      setRegisterData(p => ({ ...p, contrasena: e.target.value }))
                      setFieldErrors(f => ({...f, contrasena: undefined}))
                      if (!showConfirm && e.target.value.length > 0) setShowConfirm(true)
                    }}
                    placeholder="Mínimo 8 caracteres" required
                    onFocus={() => { setPwTouched(true); if (!showConfirm && registerData.contrasena.length > 0) setShowConfirm(true) }}
                    className={fieldErrors.contrasena ? 'input-error' : ''}
                  />
                  {pwTouched && registerData.contrasena.length > 0 && (
                    <div className="pw-strength">
                      <div className="pw-bar"><div className="pw-fill" style={{ width: `${passwordStrength(registerData.contrasena).pct}%`, background: passwordStrength(registerData.contrasena).color }} /></div>
                      <span style={{ color: passwordStrength(registerData.contrasena).color }}>{passwordStrength(registerData.contrasena).label}</span>
                    </div>
                  )}
                  {fieldErrors.contrasena && <span className="field-error">{fieldErrors.contrasena}</span>}
                </div>
                <div className={`auth-field confirm-wrap ${showConfirm ? 'visible' : ''}`}>
                  <label>Confirmar contraseña</label>
                  <input type="password" value={registerData.confirmar_contrasena}
                    onChange={e => { setRegisterData(p => ({ ...p, confirmar_contrasena: e.target.value })); setFieldErrors(f => ({...f, confirmar_contrasena: undefined})) }}
                    placeholder="Repite tu contraseña" required
                    className={fieldErrors.confirmar_contrasena ? 'input-error' : ''}
                  />
                  {fieldErrors.confirmar_contrasena && <span className="field-error">{fieldErrors.confirmar_contrasena}</span>}
                </div>
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Cuenta'}
                </button>
              </form>
            )}

            <div className="auth-switch">
              <p>
                {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                  {mode === 'login' ? 'Regístrate aquí' : 'Inicia sesión aquí'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
