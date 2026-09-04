import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../services/api';

export const VerificarEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const verificarEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('Token no encontrado');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(buildApiUrl('auth/verificar_email/'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (!response.ok) {
          setError(typeof data === 'string' ? data : data.error || 'Error al verificar email');
        } else {
          setMessage('✓ Email verificado exitosamente. Redirigiendo...');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } catch (err) {
        setError('Error al conectar con el servidor');
      } finally {
        setLoading(false);
      }
    };

    verificarEmail();
  }, [searchParams, navigate]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Verificar Email</h1>

        {loading && <p>Verificando tu correo...</p>}
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
};

export const VerificacionPendiente = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  const handleReenviar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage('');

    try {
      const response = await fetch(buildApiUrl('auth/reenviar_verificacion/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correo: email })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors(data);
      } else {
        setMessage('✓ Email de verificación reenviado. Revisa tu bandeja de entrada.');
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
        <h1>Verifica tu Correo</h1>
        <p>Hemos enviado un link de verificación a tu correo. Haz clic en él para activar tu cuenta.</p>

        {message && <div className="success-message">{message}</div>}

        <form onSubmit={handleReenviar}>
          <div className="form-group">
            <label htmlFor="email">¿No recibiste el correo?</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
            />
            {errors.correo && <span className="error">{errors.correo[0]}</span>}
            {errors.general && <span className="error">{errors.general}</span>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Reenviando...' : 'Reenviar Correo'}
          </button>
        </form>

        <p className="auth-link">
          <a href="/login">Volver al login</a>
        </p>
      </div>
    </div>
  );
};
