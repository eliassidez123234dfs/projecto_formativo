// frontend/src/pages/Landing.jsx
import React, { useState } from 'react';
import { Header } from '../components/Header';

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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitContacto = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage('');
    try {
      const response = await fetch('http://localhost:8000/api/contacto/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          setErrors({ general: 'Has alcanzado el límite de envíos. Inténtalo de nuevo en una hora.' });
        } else {
          setErrors(data);
        }
      } else {
        setMessage('✓ Mensaje enviado exitosamente.');
        setFormData({ nombre: '', correo: '', asunto: '', mensaje: '' });
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing">
      <Header isLoggedIn={false} cartCount={0} />
      <div className="landing">
        {/* Hero, Features, Contacto... */}
      </div>
      {/* ========== HERO ========== */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Plataforma de gestión</div>
          <h1>Bienvenido a <span className="highlight">Nuestro Sistema</span></h1>
          <p>Gestión completa de usuarios y administración con la mejor experiencia.</p>
          <div className="hero-cta">
            <a href="/login" className="btn btn-primary btn-lg">Iniciar Sesión</a>
            <a href="/register" className="btn btn-outline btn-lg">Crear Cuenta</a>
          </div>
        </div>
        <div className="hero-image">
          [Imagen del sistema]
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section className="features">
        <div className="section-header">
          <h2>¿Por qué elegirnos?</h2>
          <p>Todo lo que necesitas para crear tus camisetas personalizadas</p>
        </div>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Editor 3D en Tiempo Real</h3>
            <p>Visualiza tus diseños sobre la camiseta antes de comprar, gira y amplía para ver cada detalle</p>
          </div>
          <div className="feature-card">
            <h3>Materiales de Calidad</h3>
            <p>Camisetas estampadas de alta durabilidad que no se agrietan ni destiñen</p>
          </div>
          <div className="feature-card">
            <h3>Envío Rápido</h3>
            <p>Procesamos tu pedido en 24-48 horas y lo recibes en la puerta de tu casa con seguimiento en tiempo real</p>
          </div>
        </div>
      </section>

      {/* ========== CONTACTO (nuevas clases en Landing.css) ========== */}
      <section className="contact-section">
        <div className="section-header">
          <h2>Contáctanos</h2>
          <p>¿Tienes preguntas? Nos encantaría escuchar de ti.</p>
        </div>
        <div className="contact-content">
          <div className="contact-info">
            <h3>Envíanos un mensaje</h3>
            <p>Estamos aquí para ayudarte. Completa el formulario y te responderemos pronto.</p>
          </div>
          <form className="contact-form" onSubmit={handleSubmitContacto}>
            {message && <div className="success-message">{message}</div>}
            {errors.general && <div className="error-message">{errors.general}</div>}

            <div className="form-group">
              <label htmlFor="nombre">Nombre</label>
              <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Tu nombre" required />
              {errors.nombre && <span className="form-error">{errors.nombre[0]}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="correo">Correo</label>
              <input type="email" id="correo" name="correo" value={formData.correo} onChange={handleChange} placeholder="tu@email.com" required />
              {errors.correo && <span className="form-error">{errors.correo[0]}</span>}
            </div>
            <div className="form-group">
              <label htmlFor="asunto">Asunto</label>
              <input type="text" id="asunto" name="asunto" value={formData.asunto} onChange={handleChange} placeholder="Asunto de tu mensaje" />
            </div>
            <div className="form-group">
              <label htmlFor="mensaje">Mensaje</label>
              <textarea id="mensaje" name="mensaje" value={formData.mensaje} onChange={handleChange} placeholder="Tu mensaje aquí..." rows="5" required />
              {errors.mensaje && <span className="form-error">{errors.mensaje[0]}</span>}
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary btn-block">
              {loading ? 'Enviando...' : 'Enviar Mensaje'}
            </button>
            <p className="form-note">Máximo 3 mensajes por hora para evitar spam.</p>
          </form>
        </div>
      </section>

      {/* ========== CTA (opcional, si quieres conservar la sección de llamado a la acción) ========== */}
      <section className="cta-section">
        <h2>¿Listo para empezar?</h2>
        <p>Únete a nuestra plataforma y descubre todas las funcionalidades.</p>
        <a href="/register" className="btn btn-primary btn-lg">Crear Cuenta Gratis</a>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Sobre Nosotros</h3>
            <a href="#about">Acerca de</a>
            <a href="#blog">Blog</a>
          </div>
          <div className="footer-section">
            <h3>Soporte</h3>
            <a href="#faq">FAQ</a>
            <a href="#contact">Contacto</a>
          </div>
          <div className="footer-section">
            <h3>Legal</h3>
            <a href="#privacy">Privacidad</a>
            <a href="#terms">Términos</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Sistema de Gestión de Usuarios. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};