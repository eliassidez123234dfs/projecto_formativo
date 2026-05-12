// frontend/src/pages/Auth.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Ya no importamos Auth.css, ahora usaremos auth-new.css (ya se importa en index.css)
// Si aún necesitas Auth.css, elimínalo después de verificar que todo funciona

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLogin, setIsLogin] = useState(!location.pathname.includes('/register'));
  const [loginData, setLoginData] = useState({
    correo: '',
    contrasena: ''
  });
  const [registerData, setRegisterData] = useState({
    usuario: '',
    correo: '',
    contrasena: '',
    confirmar_contrasena: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setErrors({});
    setSuccess(false);
  }, [isLogin]);

  // --- Funciones handle sin cambios (las dejé igual, solo asegúrate de que siguen funcionando) ---
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const response = await fetch('http://localhost:8000/api/login/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await response.json();
      if (!response.ok) {
        if (typeof data === 'object') setErrors(data);
        else setErrors({ general: data.error || 'Error al iniciar sesión' });
      } else {
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        navigate('/dashboard');
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const response = await fetch('http://localhost:8000/api/auth/registro/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(data);
      } else {
        setSuccess(true);
        setRegisterData({ usuario: '', correo: '', contrasena: '', confirmar_contrasena: '' });
        setTimeout(() => navigate('/verificar-email-pendiente'), 2000);
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  // --- Render con nueva estructura de diseño ---
  return (
    <div className="auth-page">                     {/* Envuelve todo, según auth-new.css */}
      {/* Lado izquierdo: Beneficios (igual que la guía) */}
      <section className="auth-benefits-section">
        <div className="auth-benefits-container">
          <div className="auth-benefits-header">
            <h2>Únete a RED</h2>
            <p>Acceso a funciones exclusivas</p>
          </div>
          <div className="auth-benefits-list">
            <div className="benefit-item">
              <div className="benefit-icon"></div>
              <div className="benefit-content">
                <h3>Editor 3D Completo</h3>
                <p>Personaliza camisas con nuestro editor avanzado</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon"></div>
              <div className="benefit-content">
                <h3>Guarda tus Diseños</h3>
                <p>Accede a tus diseños desde cualquier dispositivo</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon"></div>
              <div className="benefit-content">
                <h3>Ofertas Exclusivas</h3>
                <p>Recibe descuentos y ofertas especiales</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon"></div>
              <div className="benefit-content">
                <h3>Seguimiento de Envíos</h3>
                <p>Rastreo en tiempo real de tus órdenes</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lado derecho: formulario (tu lógica original) */}
      <section className="auth-form-section">
        <div className="auth-form-container">
          {/* Toggle manual (tus botones de alternancia) */}
          <div className="auth-tabs">                {/* Usamos las clases de la guía */}
            <button
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(true)}
            >
              Iniciar Sesión
            </button>
            <button
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => setIsLogin(false)}
            >
              Registrarse
            </button>
          </div>

          {/* Formulario de Login */}
          {isLogin && (
            <form className="auth-form" onSubmit={handleLoginSubmit}>
              <div className="auth-form-header">
                <h1>Iniciar Sesión</h1>
                <p>Bienvenido de vuelta</p>
              </div>
              {errors.general && <div className="error-message">⚠️ {errors.general}</div>}
              <div className="form-group">
                <label htmlFor="login-correo">Correo electrónico</label>
                <input
                  type="email" id="login-correo" name="correo"
                  value={loginData.correo} onChange={handleLoginChange}
                  placeholder="tu@email.com" required
                />
                {errors.correo && <span className="form-error">❌ {errors.correo[0]}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="login-contrasena">Contraseña</label>
                <input
                  type="password" id="login-contrasena" name="contrasena"
                  value={loginData.contrasena} onChange={handleLoginChange}
                  placeholder="Tu contraseña" required
                />
                {errors.contrasena && <span className="form-error">❌ {errors.contrasena[0]}</span>}
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
                {loading ? '⏳ Iniciando...' : '🚀 Iniciar Sesión'}
              </button>
            </form>
          )}

          {/* Formulario de Registro */}
          {!isLogin && (
            <form className="auth-form" onSubmit={handleRegisterSubmit}>
              <div className="auth-form-header">
                <h1>Crear Cuenta</h1>
                <p>Únete a nuestra comunidad</p>
              </div>
              {success && <div className="success-message">✅ Registro exitoso. Verifica tu correo.</div>}
              {errors.general && <div className="error-message">⚠️ {errors.general}</div>}
              <div className="form-group">
                <label htmlFor="usuario">Nombre de usuario</label>
                <input
                  type="text" id="usuario" name="usuario"
                  value={registerData.usuario} onChange={handleRegisterChange}
                  placeholder="Ej: miusuario" required
                />
                {errors.usuario && <span className="form-error">❌ {errors.usuario[0]}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="register-correo">Correo electrónico</label>
                <input
                  type="email" id="register-correo" name="correo"
                  value={registerData.correo} onChange={handleRegisterChange}
                  placeholder="tu@email.com" required
                />
                {errors.correo && <span className="form-error">❌ {errors.correo[0]}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="register-contrasena">Contraseña</label>
                <input
                  type="password" id="register-contrasena" name="contrasena"
                  value={registerData.contrasena} onChange={handleRegisterChange}
                  placeholder="Tu contraseña" required
                />
                {errors.contrasena && <span className="form-error">❌ {errors.contrasena[0]}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="confirm-contrasena">Confirmar contraseña</label>
                <input
                  type="password" id="confirm-contrasena" name="confirmar_contrasena"
                  value={registerData.confirmar_contrasena} onChange={handleRegisterChange}
                  placeholder="Confirma tu contraseña" required
                />
                {errors.confirmar_contrasena && <span className="form-error">❌ {errors.confirmar_contrasena[0]}</span>}
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
                {loading ? '⏳ Registrando...' : '🎉 Crear Cuenta'}
              </button>
            </form>
          )}

          {/* Pie del formulario */}
          <div className="form-footer">
            <p>
              {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
              <button type="button" className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Regístrate aquí' : 'Inicia sesión aquí'}
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};