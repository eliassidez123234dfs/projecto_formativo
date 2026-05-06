import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/Auth.css';

export const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Detectar si estamos en ruta /register para mostrar registro por defecto
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

  // Limpiar errores cuando se cambia de formulario
  useEffect(() => {
    setErrors({});
    setSuccess(false);
  }, [isLogin]);

  // Handle Login
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error de ese campo cuando empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    
    try {
      const response = await fetch('http://localhost:8000/api/login/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (typeof data === 'object') {
          setErrors(data);
        } else {
          setErrors({ general: data.error || 'Error al iniciar sesión' });
        }
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

  // Handle Register
  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error de ese campo cuando empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    
    try {
      const response = await fetch('http://localhost:8000/api/auth/registro/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData)
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data);
      } else {
        setSuccess(true);
        setRegisterData({
          usuario: '',
          correo: '',
          contrasena: '',
          confirmar_contrasena: ''
        });
        setTimeout(() => {
          navigate('/verificar-email-pendiente');
        }, 2000);
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className={`auth-container ${isLogin ? 'login-active' : 'register-active'}`}>
        
        {/* Login Form - Right Side */}
        <div className="auth-form login-form">
          <div className="form-content">
            <h1>Iniciar Sesión</h1>
            <p className="form-subtitle">Bienvenido de vuelta</p>

            {errors.general && (
              <div className="error-message">⚠️ {errors.general}</div>
            )}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label htmlFor="login-correo">Correo electrónico</label>
                <input
                  type="email"
                  id="login-correo"
                  name="correo"
                  value={loginData.correo}
                  onChange={handleLoginChange}
                  placeholder="tu@email.com"
                  required
                />
                {errors.correo && <span className="error">❌ {errors.correo[0]}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="login-contrasena">Contraseña</label>
                <input
                  type="password"
                  id="login-contrasena"
                  name="contrasena"
                  value={loginData.contrasena}
                  onChange={handleLoginChange}
                  placeholder="Tu contraseña"
                  required
                />
                {errors.contrasena && <span className="error">❌ {errors.contrasena[0]}</span>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '⏳ Iniciando sesión...' : '🚀 Iniciar Sesión'}
              </button>
            </form>

            <div className="form-footer">
              <p>¿No tienes cuenta? 
                <button 
                  type="button" 
                  className="toggle-btn"
                  onClick={() => {
                    setIsLogin(false);
                    setErrors({});
                  }}
                >
                  Registrate aquí
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Register Form - Left Side */}
        <div className="auth-form register-form">
          <div className="form-content">
            <h1>Crear Cuenta</h1>
            <p className="form-subtitle">Únete a nuestra comunidad</p>
            
            {success && (
              <div className="success-message">
                ✅ Registro exitoso. Verifica tu correo para activar la cuenta.
              </div>
            )}

            {errors.general && (
              <div className="error-message">⚠️ {errors.general}</div>
            )}

            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label htmlFor="usuario">Nombre de usuario</label>
                <input
                  type="text"
                  id="usuario"
                  name="usuario"
                  value={registerData.usuario}
                  onChange={handleRegisterChange}
                  placeholder="Ej: miusuario"
                  required
                />
                {errors.usuario && <span className="error">❌ {errors.usuario[0]}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-correo">Correo electrónico</label>
                <input
                  type="email"
                  id="register-correo"
                  name="correo"
                  value={registerData.correo}
                  onChange={handleRegisterChange}
                  placeholder="tu@email.com"
                  required
                />
                {errors.correo && <span className="error">❌ {errors.correo[0]}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-contrasena">Contraseña</label>
                <input
                  type="password"
                  id="register-contrasena"
                  name="contrasena"
                  value={registerData.contrasena}
                  onChange={handleRegisterChange}
                  placeholder="Tu contraseña"
                  required
                />
                {errors.contrasena && <span className="error">❌ {errors.contrasena[0]}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="confirm-contrasena">Confirmar contraseña</label>
                <input
                  type="password"
                  id="confirm-contrasena"
                  name="confirmar_contrasena"
                  value={registerData.confirmar_contrasena}
                  onChange={handleRegisterChange}
                  placeholder="Confirma tu contraseña"
                  required
                />
                {errors.confirmar_contrasena && <span className="error">❌ {errors.confirmar_contrasena[0]}</span>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '⏳ Registrando...' : '🎉 Crear Cuenta'}
              </button>
            </form>

            <div className="form-footer">
              <p>¿Ya tienes cuenta? 
                <button 
                  type="button" 
                  className="toggle-btn"
                  onClick={() => {
                    setIsLogin(true);
                    setErrors({});
                  }}
                >
                  Inicia sesión aquí
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
