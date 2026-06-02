// frontend/src/components/Layout.jsx
import { Outlet, NavLink } from 'react-router-dom';

export const Layout = () => {
  return (
    <>
      <nav>
        <NavLink to="/auth">Autenticación</NavLink>
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/email">Verificar Email</NavLink>
        <NavLink to="/password">Recuperar Contraseña</NavLink>
      </nav>
      <Outlet />   {/* Aquí se renderizan Auth, Dashboard, etc. */}
    </>
  );
};