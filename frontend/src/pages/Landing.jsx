import React, { useState } from 'react';
import '../styles/Landing.css';

export const Landing = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    asunto: '',
    mensaje: ''
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

  const handleSubmitContacto = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/contacto/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setErrors({ general: 'Has alcanzado el límite de envíos. Intenta en una hora.' });
        } else {
          setErrors(data);
        }
      } else {
        setMessage('✓ Mensaje enviado exitosamente. Nos contactaremos pronto.');
        setFormData({
          nombre: '',
          correo: '',
          asunto: '',
          mensaje: ''
        });
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Bienvenido a Nuestro Sistema</h1>
          <p>Gestión completa de usuarios y administración</p>
          <div className="hero-buttons">
            <a href="/login" className="btn-primary">Iniciar Sesión</a>
            <a href="/register" className="btn-secondary">Crear Cuenta</a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Características</h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Autenticación Segura</h3>
              <p>Sistema de autenticación con JWT y verificación de email</p>
            </div>
            <div className="feature-card">
              <h3>Gestión de Usuarios</h3>
              <p>Panel administrativo completo para gestionar usuarios</p>
            </div>
            <div className="feature-card">
              <h3>Recuperación de Cuenta</h3>
              <p>Recupera tu contraseña de forma segura y sencilla</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="contact-section">
        <div className="container">
          <h2>Contáctanos</h2>
          <div className="contact-content">
            <div className="contact-info">
              <h3>¿Tienes preguntas?</h3>
              <p>Nos encantaría escuchar de ti. Envía un mensaje y nos pondremos en contacto pronto.</p>
            </div>

            <form className="contact-form" onSubmit={handleSubmitContacto}>
              {message && <div className="success-message">{message}</div>}
              {errors.general && <div className="error-message">{errors.general}</div>}

              <div className="form-group">
                <label htmlFor="nombre">Nombre</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  required
                />
                {errors.nombre && <span className="error">{errors.nombre[0]}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="correo">Correo</label>
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
                <label htmlFor="asunto">Asunto</label>
                <input
                  type="text"
                  id="asunto"
                  name="asunto"
                  value={formData.asunto}
                  onChange={handleChange}
                  placeholder="Asunto de tu mensaje"
                />
              </div>

              <div className="form-group">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea
                  id="mensaje"
                  name="mensaje"
                  value={formData.mensaje}
                  onChange={handleChange}
                  placeholder="Tu mensaje aquí..."
                  rows="5"
                  required
                />
                {errors.mensaje && <span className="error">{errors.mensaje[0]}</span>}
              </div>

              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Enviando...' : 'Enviar Mensaje'}
              </button>

              <p className="form-note">
                Máximo 3 mensajes por hora para evitar spam.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2026 Sistema de Gestión de Usuarios. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};
