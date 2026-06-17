import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/MainLayout';
import { fetchAdminStats, fetchAdminUsers } from '../services/api';

function normalizeUsers(data) {
  if (Array.isArray(data)) return data;
  return data?.results || [];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [statsData, usersData] = await Promise.all([
          fetchAdminStats(),
          fetchAdminUsers({ page: 1, page_size: 5 }),
        ]);
        setStats(statsData);
        setRecentUsers(normalizeUsers(usersData));
      } catch {
        setError('No se pudo cargar el panel de administración.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const userStats = stats?.usuarios || {};
  const productStats = stats?.productos || {};
  const orderStats = stats?.ordenes || {};

  const statCards = [
    { value: userStats.total ?? 0, label: 'Usuarios', icon: 'primary' },
    { value: userStats.activos ?? 0, label: 'Usuarios activos', icon: 'success' },
    { value: productStats.total ?? 0, label: 'Productos', icon: 'info' },
    { value: orderStats.total_ordenes ?? 0, label: 'Órdenes', icon: 'warning' },
  ];

  return (
    <MainLayout
      title="Panel de control"
      subtitle="Monitorea usuarios, productos y pedidos desde un solo lugar."
    >
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="admin-stats">
        {statCards.map((card) => (
          <div key={card.label} className="stat-card">
            <div className={`stat-card-icon ${card.icon}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div className="stat-card-body">
              <div className="stat-card-value">{loading ? '...' : card.value}</div>
              <div className="stat-card-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <p className="subtitle mb-0">Accesos rápidos al panel administrativo</p>
        </div>
        <div className="admin-toolbar-right">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/admin-users')}>
            Gestionar usuarios
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin-products')}>
            Gestionar productos
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/admin-cart')}>
            Ver carritos
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Usuarios recientes</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/admin-users')}>
            Ver CRUD completo
          </button>
        </div>
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="4" className="text-center">Cargando usuarios...</td>
                </tr>
              )}
              {!loading && recentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.usuario}</td>
                  <td>{user.correo}</td>
                  <td>{user.rol}</td>
                  <td>
                    <span className={`badge badge-${user.estado === 'Activo' ? 'success' : user.estado === 'Bloqueado' ? 'danger' : 'secondary'}`}>
                      {user.estado}
                    </span>
                  </td>
                </tr>
              ))}
              {!loading && recentUsers.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center">No hay usuarios para mostrar.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}
