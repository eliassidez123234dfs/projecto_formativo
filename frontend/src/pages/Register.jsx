import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

export const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    usuario: '',
    correo: '',
    contrasena: '',
    confirmar_contrasena: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      const response = await fetch('http://localhost:8000/api/auth/registro/', {
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
        setSuccess(true);
        setFormData({
          usuario: '',
          correo: '',
          contrasena: '',
          confirmar_contrasena: ''
        });
        // Redirigir a página de verificación
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
    <div className="auth-container">
      <div className="auth-card">
        <h1>Crear Cuenta</h1>
        
        {success && (
          <div className="success-message">
            ✓ Registro exitoso. Verifica tu correo para activar la cuenta.
          </div>
        )}

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="usuario">Nombre de usuario</label>
            <input
              type="text"
              id="usuario"
              name="usuario"
              value={formData.usuario}
              onChange={handleChange}
              placeholder="Ej: miusuario"
              required
            />
            {errors.usuario && <span className="error">{errors.usuario[0]}</span>}
          </div>

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
              placeholder="Mín 8 caracteres, mayúscula, número y símbolo"
              required
            />
            {errors.contrasena && <span className="error">{errors.contrasena[0]}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmar_contrasena">Confirmar contraseña</label>
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

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="auth-link">
          ¿Ya tienes cuenta? <a href="/login">Inicia sesión</a>
        </p>
      </div>
    </div>
  );
};
