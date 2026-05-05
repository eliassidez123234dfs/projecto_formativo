import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

export const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    correo: '',
    contrasena: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    
    try {
      const response = await fetch('http://localhost:8000/api/login/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (typeof data === 'object') {
          setErrors(data);
        } else {
          setErrors({ general: data.error || 'Error al iniciar sesión' });
        }
      } else {
        // Guardar tokens
        localStorage.setItem('access_token', data.access);
        localStorage.setItem('refresh_token', data.refresh);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        
        // Redirigir al dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Iniciar Sesión</h1>

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="correo">Correo electrónico</label>
            <input
              type="email"
              id="correo"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
            />
            {errors.correo && <span className="error">{errors.correo[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              type="password"
              id="contrasena"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleChange}
              placeholder="Tu contraseña"
              required
            />
            {errors.contrasena && <span className="error">{errors.contrasena[0]}</span>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-link">
          ¿No tienes cuenta? <a href="/register">Crea una aquí</a>
        </p>
        <p className="auth-link">
          ¿Olvidaste tu contraseña? <a href="/recuperar-password">Recuperarla</a>
        </p>
      </div>
    </div>
  );
};
