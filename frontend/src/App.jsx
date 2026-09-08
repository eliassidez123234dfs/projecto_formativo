/**
 * App.jsx — Componente raíz de la aplicación React.
 *
 * Define la estructura completa de rutas y los proveedores globales.
 * Árbol de componentes: ThemeProvider → CartProvider → BrowserRouter → ErrorBoundary → Routes
 *
 * Decisiones de diseño:
 * - ThemeProvider y CartProvider envuelven toda la app para acceso global.
 * - ErrorBoundary captura errores no controlados en cualquier ruta.
 * - ProtectedRoute protege las rutas de administración.
 * - EditorRedirect redirige /editor/* al microservicio Tshirt3D externo.
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollTopButton from './components/ScrollTopButton';
import './styles/theme.css';
import './styles/globals.css';
import './styles/scroll-top.css';
import { Landing } from './pages/Landing';
import AuthPage from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { Catalog } from './pages/Catalog';
import { Category } from './pages/Category';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import AdminCart from './pages/AdminCart';
import AdminCartDetail from './pages/AdminCartDetail';
import { VerificarEmail, VerificacionPendiente } from './pages/Email';
import { RecuperarPassword, NuevaPassword } from './pages/Password';

// Nuevos imports desde la rama jose
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminProductDetail from './pages/AdminProductDetail';
import AdminUsers from './pages/AdminUsers';
import AdminContact from './pages/AdminContact';
import AdminAudit from './pages/AdminAudit';
import AdminOrders from './pages/AdminOrders';
import AdminOrderDetail from './pages/AdminOrderDetail';
import AdminProductApproval from './pages/AdminProductApproval';
import AdminCloudinary from './pages/AdminCloudinary';
import UserProfile from './pages/UserProfile';
import UserOrders from './pages/UserOrders';
import CheckoutPage from './pages/CheckoutPage';

// ─── REDIRECCIÓN AL EDITOR 3D ───
// Redirige /editor/* al microservicio externo Tshirt3D (puerto 5174 en dev).
function EditorRedirect() {
  useEffect(() => {
    const editorUrl = import.meta.env.VITE_TSHIRT3D_URL || (
      import.meta.env.DEV ? 'http://127.0.0.1:5174/' : '/editor/'
    );
    window.location.replace(`${editorUrl}${window.location.search}`);
  }, []);

  return null;
}

// ─── COMPONENTE PRINCIPAL ───
function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
          <ErrorBoundary>
          {/* Notificaciones Toaster configuradas en la esquina inferior derecha para no obstruir los menús del Header */}
          <Toaster
            position="bottom-right"
            containerStyle={{ bottom: 24, right: 24 }}
            toastOptions={{
              duration: 3500,
              style: {
                fontSize: 14,
                borderRadius: 10,
                padding: '12px 18px',
                background: 'var(--color-surface, #ffffff)',
                color: 'var(--color-text, #0f172a)',
                border: '1px solid var(--color-border, #e2e8f0)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              },
            }}
          />
          <ScrollTopButton />
          <Routes>
            {/* ─── RUTAS PÚBLICAS ─── */}
            <Route path="/" element={<Landing />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/category/:id" element={<Category />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<AuthPage defaultMode="login" />} />
            <Route path="/register" element={<AuthPage defaultMode="register" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<UserProfile />} />
            <Route path="/perfilpedidos" element={<UserOrders />} />
            <Route path="/email" element={<VerificarEmail />} />
            <Route path="/verificar-email" element={<VerificarEmail />} />
            <Route path="/verificar-email-pendiente" element={<VerificacionPendiente />} />
            <Route path="/password" element={<RecuperarPassword />} />
            <Route path="/nueva-password" element={<NuevaPassword />} />

            {/* ─── RUTAS ADMIN PROTEGIDAS ─── */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin-products" element={<AdminProducts />} />
              <Route path="/admin-products/detail/:id" element={<AdminProductDetail />} />
              <Route path="/admin-users" element={<AdminUsers />} />
              <Route path="/admin-cart" element={<AdminCart />} />
              <Route path="/admin-cart/:id" element={<AdminCartDetail />} />
              <Route path="/admin-contact" element={<AdminContact />} />
              <Route path="/admin-orders" element={<AdminOrders />} />
              <Route path="/admin-orders/:id" element={<AdminOrderDetail />} />
              <Route path="/admin-products/approval" element={<AdminProductApproval />} />
              <Route path="/admin-audit" element={<AdminAudit />} />
              <Route path="/admin-cloudinary" element={<AdminCloudinary />} />
            </Route>
            <Route path="/checkout" element={<CheckoutPage />} />

            <Route path="/editor/*" element={<EditorRedirect />} />

            {/* Opcional: si quieres mantener también /catalogo como alias de /catalog */}
            <Route path="/catalogo" element={<Catalog />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;