import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { buildApiUrl } from '../services/api'

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

export default function AuthPage({ defaultMode = 'login' }) {
  const navigate = useNavigate()
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

  useEffect(() => {
    setErrors({}); setFieldErrors({}); setSuccess(false); setAnimKey(k => k + 1); setShowConfirm(false); setPwTouched(false)
  }, [mode])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
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
        const errData = typeof data === 'object' ? data : { general: data.error || 'Credenciales inválidas' }
        setErrors(errData)
        setFieldErrors(extractFieldErrors(errData))
      } else {
        localStorage.setItem('access_token', data.access)
        localStorage.setItem('refresh_token', data.refresh)
        localStorage.setItem('usuario', JSON.stringify(data.usuario))
        const usr = data.usuario || {}
        navigate(usr.rol === 'Administrador' ? '/dashboard' : '/')
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setLoading(false) }
  }

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
      if (!response.ok) {
        const errData = typeof data === 'object' ? data : { general: data.error || 'Error al registrar' }
        setErrors(errData)
        setFieldErrors(extractFieldErrors(errData))
      }
      else {
        setSuccess(true)
        setRegisterData({ usuario: '', correo: '', contrasena: '', confirmar_contrasena: '' })
        setTimeout(() => navigate('/verificar-email-pendiente'), 2000)
      }
    } catch { setErrors({ general: 'Error al conectar con el servidor' }) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
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

      <div className="auth-form-panel">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>{mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}</h2>
            <p>
              {mode === 'login' ? 'Accede a tu cuenta para continuar' : 'Regístrate para empezar a personalizar'}
            </p>
          </div>

          <div key={animKey} className="auth-form-body">
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

      <style>{`
        .auth-page {
          display: flex;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .auth-brand {
          flex: 0 0 42%;
          background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          position: relative;
          overflow: hidden;
        }

        .auth-curve {
          position: absolute;
          right: -80px;
          top: 0;
          width: 160px;
          height: 100%;
          background: white;
          clip-path: ellipse(80px 100% at 80px 50%);
        }

        .auth-brand-content {
          position: relative;
          z-index: 1;
          max-width: 380px;
          color: white;
        }

        .auth-logo {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -1px;
          margin-bottom: 1rem;
        }

        .auth-tagline {
          font-size: 1.75rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 0.75rem;
        }

        .auth-desc {
          font-size: 0.95rem;
          color: rgba(255,255,255,0.75);
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .auth-benefits {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .auth-benefit {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: rgba(255,255,255,0.85);
        }

        .auth-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: white;
        }

        .auth-form-container {
          width: 100%;
          max-width: 400px;
        }

        .auth-form-header {
          margin-bottom: 2rem;
        }

        .auth-form-header h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.4rem;
        }

        .auth-form-header p {
          font-size: 0.9rem;
          color: #6B7280;
          margin: 0;
        }

        .auth-form-body {
          animation: authFadeIn 0.3s ease;
        }

        @keyframes authFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .auth-alert {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          line-height: 1.5;
          margin-bottom: 1.25rem;
        }

        .auth-alert--error {
          background: #FEF2F2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }

        .auth-alert--success {
          background: #ECFDF5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }

        .auth-field {
          margin-bottom: 1.25rem;
        }

        .auth-field label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.4rem;
        }

        .auth-field input {
          width: 100%;
          padding: 11px 14px;
          border: 1px solid #D1D5DB;
          border-radius: 8px;
          font-size: 0.9rem;
          color: #111827;
          background: white;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          box-sizing: border-box;
        }

        .auth-field input:focus {
          border-color: #DC2626;
          box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
        }

        .auth-field input.input-error {
          border-color: #DC2626;
        }

        .field-error {
          display: block;
          font-size: 0.75rem;
          color: #DC2626;
          margin-top: 4px;
        }

        .pw-strength {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
        }

        .pw-bar {
          flex: 1;
          height: 4px;
          background: #E5E7EB;
          border-radius: 2px;
          overflow: hidden;
        }

        .pw-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .pw-strength span {
          font-size: 0.75rem;
          font-weight: 600;
          min-width: 40px;
        }

        .confirm-wrap {
          overflow: hidden;
          max-height: 0;
          opacity: 0;
          transition: max-height 0.35s ease, opacity 0.35s ease, margin 0.35s ease;
          margin-bottom: 0 !important;
        }

        .confirm-wrap.visible {
          max-height: 120px;
          opacity: 1;
          margin-bottom: 1.25rem !important;
        }

        .auth-submit {
          width: 100%;
          padding: 13px;
          border: none;
          border-radius: 8px;
          background: #DC2626;
          color: white;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.15s;
        }

        .auth-submit:hover {
          background: #B91C1C;
        }

        .auth-submit:disabled {
          background: #9CA3AF;
          cursor: not-allowed;
        }

        .auth-switch {
          text-align: center;
          margin-top: 1.5rem;
          padding-top: 1.25rem;
          border-top: 1px solid #E5E7EB;
        }

        .auth-switch p {
          margin: 0;
          font-size: 0.85rem;
          color: #6B7280;
        }

        .auth-switch button {
          background: none;
          border: none;
          color: #DC2626;
          font-weight: 700;
          font-size: 0.85rem;
          cursor: pointer;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .auth-page {
            flex-direction: column;
          }
          .auth-brand {
            flex: none;
            padding: 2rem;
            min-height: 180px;
          }
          .auth-curve { display: none; }
          .auth-brand-content {
            max-width: 100%;
            text-align: center;
          }
          .auth-logo { font-size: 1.75rem; }
          .auth-tagline { font-size: 1.25rem; }
          .auth-benefits { align-items: center; }
          .auth-form-panel { padding: 2rem 1.25rem; }
        }
      `}</style>
    </div>
  )
}
