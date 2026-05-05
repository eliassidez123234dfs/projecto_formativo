import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';

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
    // Obtener datos del usuario
    const usuarioData = localStorage.getItem('usuario');
    if (usuarioData) {
      const user = JSON.parse(usuarioData);
      setUsuario(user);
      setFormData(user);
    }
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
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
        // Actualizar datos locales
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
        setPasswordForm({
          contrasena_actual: '',
          contrasena_nueva: '',
          confirmar_contrasena: ''
        });
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

  if (loading) {
    return <div className="dashboard"><p>Cargando...</p></div>;
  }

  if (!usuario) {
    return <div className="dashboard"><p>No hay sesión activa</p></div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-sidebar">
          <div className="user-card">
            <h2>{usuario.usuario}</h2>
            <p>{usuario.correo}</p>
            <span className={`badge badge-${usuario.estado.toLowerCase()}`}>
              {usuario.estado}
            </span>
          </div>

          <nav className="dashboard-nav">
            <button
              className={`nav-item ${activeTab === 'perfil' ? 'active' : ''}`}
              onClick={() => setActiveTab('perfil')}
            >
              Mi Perfil
            </button>
            <button
              className={`nav-item ${activeTab === 'password' ? 'active' : ''}`}
              onClick={() => setActiveTab('password')}
            >
              Cambiar Contraseña
            </button>
            <button className="nav-item logout" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </nav>
        </div>

        <div className="dashboard-content">
          {message && <div className="success-message">{message}</div>}

          {activeTab === 'perfil' && (
            <div className="tab-content">
              <h2>Mi Perfil</h2>
              <form onSubmit={handleUpdatePerfil}>
                <div className="form-group">
                  <label htmlFor="usuario">Nombre de Usuario</label>
                  <input
                    type="text"
                    id="usuario"
                    name="usuario"
                    value={formData.usuario || ''}
                    onChange={handleChange}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="correo">Correo Electrónico</label>
                  <input
                    type="email"
                    id="correo"
                    name="correo"
                    value={formData.correo || ''}
                    onChange={handleChange}
                  />
                  {errors.correo && <span className="error">{errors.correo[0]}</span>}
                </div>

                <div className="form-group">
                  <label>Rol: {usuario.rol}</label>
                </div>

                <div className="form-group">
                  <label>Email Verificado: {usuario.email_verificado ? '✓ Sí' : '✗ No'}</label>
                </div>

                {errors.general && <div className="error-message">{errors.general}</div>}

                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="tab-content">
              <h2>Cambiar Contraseña</h2>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label htmlFor="contrasena_actual">Contraseña Actual</label>
                  <input
                    type="password"
                    id="contrasena_actual"
                    name="contrasena_actual"
                    value={passwordForm.contrasena_actual}
                    onChange={handlePasswordChange}
                    required
                  />
                  {errors.contrasena_actual && <span className="error">{errors.contrasena_actual[0]}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="contrasena_nueva">Nueva Contraseña</label>
                  <input
                    type="password"
                    id="contrasena_nueva"
                    name="contrasena_nueva"
                    value={passwordForm.contrasena_nueva}
                    onChange={handlePasswordChange}
                    placeholder="Mín 8 caracteres, mayúscula, número y símbolo"
                    required
                  />
                  {errors.contrasena_nueva && <span className="error">{errors.contrasena_nueva[0]}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="confirmar_contrasena">Confirmar Contraseña</label>
                  <input
                    type="password"
                    id="confirmar_contrasena"
                    name="confirmar_contrasena"
                    value={passwordForm.confirmar_contrasena}
                    onChange={handlePasswordChange}
                    required
                  />
                  {errors.confirmar_contrasena && <span className="error">{errors.confirmar_contrasena[0]}</span>}
                </div>

                {errors.general && <div className="error-message">{errors.general}</div>}

                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? 'Guardando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
