import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { buildApiUrl } from '../services/api';

export const RecuperarPassword = () => {
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage('');

    try {
      const response = await fetch(buildApiUrl('auth/recuperar_password/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data);
      } else {
        setMessage('✓ Se ha enviado un enlace de recuperación a tu correo.');
        setCorreo('');
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
        <h1>Recuperar Contraseña</h1>
        <p>Ingresa tu correo y te enviaremos un enlace para recuperar tu contraseña.</p>

        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="correo">Correo electrónico</label>
            <input
              type="email"
              id="correo"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu@email.com"
              required autoComplete="email"
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+" maxLength={254}
            />
            {errors.correo && <span className="error">{errors.correo[0]}</span>}
            {errors.general && <span className="error">{errors.general}</span>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Enviando...' : 'Enviar Enlace'}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/login">Volver al login</Link>
        </p>
      </div>
    </div>
  );
};

export const NuevaPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    token: searchParams.get('token') || '',
    contrasena: '',
    confirmar_contrasena: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

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
    setMessage('');

    try {
      const response = await fetch(buildApiUrl('auth/nueva_password/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data);
      } else {
        setMessage('✓ Contraseña actualizada exitosamente. Redirigiendo...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
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
        <h1>Nueva Contraseña</h1>

        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="contrasena">Nueva Contraseña</label>
            <input
              type="password"
              id="contrasena"
              name="contrasena"
              value={formData.contrasena}
              onChange={handleChange}
              placeholder="Mín 8 caracteres"
              required
            />
            {errors.contrasena && <span className="error">{errors.contrasena[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmar_contrasena">Confirmar Contraseña</label>
            <input
              type="password"
              id="confirmar_contrasena"
              name="confirmar_contrasena"
              value={formData.confirmar_contrasena}
              onChange={handleChange}
              placeholder="Repite tu contraseña"
              required
            />
            {errors.confirmar_contrasena && <span className="error">{errors.confirmar_contrasena[0]}</span>}
          </div>

          {errors.general && <div className="error-message">{errors.general}</div>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar Contraseña'}
          </button>
        </form>

        <p className="auth-link">
          <Link to="/login">Volver al login</Link>
        </p>
      </div>
    </div>
  );
};
