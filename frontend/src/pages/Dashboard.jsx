// frontend/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import '../styles/dashboard-new.css';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [formData, setFormData] = useState({});
  const [passwordForm, setPasswordForm] = useState({
    contrasena_actual: '',
    contrasena_nueva: '',
    confirmar_contrasena: ''
  });
  const [activeTab, setActiveTab] = useState('perfil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const usuarioData = localStorage.getItem('usuario');
    if (usuarioData) {
      const user = JSON.parse(usuarioData);
      setUsuario(user);
      setFormData(user);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!loading && !usuario) {
      navigate('/login');
    }
  }, [loading, usuario, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage('');
    const accessToken = localStorage.getItem('access_token');
    try {
      const response = await fetch('http://localhost:8000/api/usuarios/actualizar_perfil/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(data);
      } else {
        setMessage('✓ Perfil actualizado exitosamente');
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
        setUsuario(data.usuario);
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage('');
    const accessToken = localStorage.getItem('access_token');
    try {
      const response = await fetch('http://localhost:8000/api/usuarios/cambiar_password/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(passwordForm)
      });
      const data = await response.json();
      if (!response.ok) {
        setErrors(data);
      } else {
        setMessage('✓ Contraseña actualizada exitosamente');
        setPasswordForm({ contrasena_actual: '', contrasena_nueva: '', confirmar_contrasena: '' });
      }
    } catch (error) {
      setErrors({ general: 'Error al conectar con el servidor' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('usuario');
    navigate('/login');
  };

  if (loading) return (
    <>
      <Header cartCount={0} />
      <div className="dashboard"><p>Cargando...</p></div>
    </>
  );
  if (!usuario) return (
    <>
      <Header cartCount={0} />
      <div className="dashboard"><p>No hay sesión activa</p></div>
    </>
  );

  return (
    <>
      <Header cartCount={0} />
      <div className="dashboard">
      {/* ===== SIDEBAR ===== */}
      <aside className="dashboard-sidebar">
        <div className="dashboard-user-card">
          <div className="dashboard-avatar">👤</div>
          <div className="dashboard-user-name">{usuario.usuario}</div>
          <div className="dashboard-user-email">{usuario.correo}</div>
          <span className="dashboard-user-status">{usuario.estado}</span>
        </div>

        <nav className="dashboard-nav">
          <button
            className={`dashboard-nav-item ${activeTab === 'perfil' ? 'active' : ''}`}
            onClick={() => setActiveTab('perfil')}
          >
            <span className="dashboard-nav-item-icon">👤</span>
            Mi Perfil
          </button>
          <button
            className={`dashboard-nav-item ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <span className="dashboard-nav-item-icon">🔒</span>
            Cambiar Contraseña
          </button>
          <button
            className={`dashboard-nav-item dashboard-logout`}
            onClick={handleLogout}
          >
            <span className="dashboard-nav-item-icon">🚪</span>
            Cerrar Sesión
          </button>
        </nav>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="dashboard-main">
        <section className="dashboard-panel active">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, color: 'var(--color-red)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', fontSize: '0.75rem' }}>
                Mi Cuenta
              </p>
              <h2 style={{ margin: '0.5rem 0 0', fontSize: '2rem' }}>Hola, {usuario.usuario}</h2>
              <p style={{ margin: '0.75rem 0 0', color: 'var(--color-gray-600)', maxWidth: '640px' }}>
                Controla tu perfil, cambia tu contraseña y accede de forma rápida al catálogo, al carrito y al editor 3D.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/catalog')}>
                Ver Catálogo
              </button>
              <button type="button" className="btn btn-outline" onClick={() => window.open('http://localhost:4173', '_blank')}>
                Abrir Editor 3D
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/cart')}>
                Mi Carrito
              </button>
            </div>
          </div>
        </section>

        <section className="dashboard-panel active">
        {message && <div className="message-box success"><span className="message-icon">✅</span> {message}</div>}
        {errors.general && <div className="message-box error"><span className="message-icon">❌</span> {errors.general}</div>}

        {activeTab === 'perfil' && (
          <div className="dashboard-panel active">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/catalog')}>
                Ver Catálogo
              </button>
              <button type="button" className="btn btn-outline" onClick={() => window.open('http://localhost:4173', '_blank')}>
                Abrir Editor 3D
              </button>
              <button type="button" className="btn btn-outline" onClick={() => navigate('/cart')}>
                Ir a mi Carrito
              </button>
            </div>
            <h3>Mi Perfil</h3>
            <form onSubmit={handleUpdatePerfil} className="profile-form">
              <div className="profile-form-full">
                <div className="form-group">
                  <label htmlFor="usuario">Nombre de Usuario</label>
                  <input
                    type="text" id="usuario" name="usuario"
                    value={formData.usuario || ''} onChange={handleChange}
                    disabled className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="correo">Correo Electrónico</label>
                  <input
                    type="email" id="correo" name="correo"
                    value={formData.correo || ''} onChange={handleChange}
                    className="form-input"
                  />
                  {errors.correo && <span className="form-error">{errors.correo[0]}</span>}
                </div>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Rol</span>
                <span className="profile-info-value">{usuario.rol}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Email Verificado</span>
                <span className="profile-info-value">{usuario.email_verificado ? '✓ Sí' : '✗ No'}</span>
              </div>
              {errors.general && <div className="message-box error">{errors.general}</div>}
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="dashboard-panel active">
            <h3>Cambiar Contraseña</h3>
            <form onSubmit={handleChangePassword} className="profile-form">
              <div className="profile-form-full">
                <div className="form-group">
                  <label htmlFor="contrasena_actual">Contraseña Actual</label>
                  <input
                    type="password" id="contrasena_actual" name="contrasena_actual"
                    value={passwordForm.contrasena_actual} onChange={handlePasswordChange}
                    required className="form-input"
                  />
                  {errors.contrasena_actual && <span className="form-error">{errors.contrasena_actual[0]}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="contrasena_nueva">Nueva Contraseña</label>
                  <input
                    type="password" id="contrasena_nueva" name="contrasena_nueva"
                    value={passwordForm.contrasena_nueva} onChange={handlePasswordChange}
                    placeholder="Mín 8 caracteres, mayúscula, número y símbolo" required
                    className="form-input"
                  />
                  {errors.contrasena_nueva && <span className="form-error">{errors.contrasena_nueva[0]}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="confirmar_contrasena">Confirmar Contraseña</label>
                  <input
                    type="password" id="confirmar_contrasena" name="confirmar_contrasena"
                    value={passwordForm.confirmar_contrasena} onChange={handlePasswordChange}
                    required className="form-input"
                  />
                  {errors.confirmar_contrasena && <span className="form-error">{errors.confirmar_contrasena[0]}</span>}
                </div>
              </div>
              {errors.general && <div className="message-box error">{errors.general}</div>}
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </form>
          </div>
        )}
        </section>
      </main>
      </div>
    </>
  );
};