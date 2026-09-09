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

  const passwordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;
    const labels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte', 'Muy fuerte'];
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981', '#059669'];
    return { score, label: labels[score] || 'Muy débil', color: colors[score] || '#EF4444' };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage('');

    const newErrors = {};
    if (!formData.contrasena || formData.contrasena.length < 8)
      newErrors.contrasena = 'La contraseña debe tener al menos 8 caracteres.';
    else if (!/[A-Z]/.test(formData.contrasena))
      newErrors.contrasena = 'Debe incluir al menos una letra mayúscula.';
    else if (!/\d/.test(formData.contrasena))
      newErrors.contrasena = 'Debe incluir al menos un número.';
    else if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.contrasena))
      newErrors.contrasena = 'Debe incluir al menos un carácter especial.';

    if (formData.contrasena !== formData.confirmar_contrasena)
      newErrors.confirmar_contrasena = 'Las contraseñas no coinciden.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

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
              placeholder="Mín 8 caracteres, mayúscula, número y especial"
              required
              minLength={8}
            />
            {formData.contrasena.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
                  {[1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i <= passwordStrength(formData.contrasena).score
                        ? passwordStrength(formData.contrasena).color
                        : '#e5e7eb',
                      transition: 'background 0.2s'
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: passwordStrength(formData.contrasena).color }}>
                  {passwordStrength(formData.contrasena).label}
                </span>
              </div>
            )}
            {errors.contrasena && <span className="error">{errors.contrasena}</span>}
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
