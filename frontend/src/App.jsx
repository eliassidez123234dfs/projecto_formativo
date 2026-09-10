import { lazy, Suspense, useEffect } from 'react';
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

const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const Category = lazy(() => import('./pages/Category').then(m => ({ default: m.Category })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const AdminCart = lazy(() => import('./pages/AdminCart'));
const AdminCartDetail = lazy(() => import('./pages/AdminCartDetail'));
const VerificarEmail = lazy(() => import('./pages/Email').then(m => ({ default: m.VerificarEmail })));
const VerificacionPendiente = lazy(() => import('./pages/Email').then(m => ({ default: m.VerificacionPendiente })));
const RecuperarPassword = lazy(() => import('./pages/Password').then(m => ({ default: m.RecuperarPassword })));
const NuevaPassword = lazy(() => import('./pages/Password').then(m => ({ default: m.NuevaPassword })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminProductDetail = lazy(() => import('./pages/AdminProductDetail'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminContact = lazy(() => import('./pages/AdminContact'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/AdminOrderDetail'));
const AdminProductApproval = lazy(() => import('./pages/AdminProductApproval'));
const AdminCloudinary = lazy(() => import('./pages/AdminCloudinary'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));

function EditorRedirect() {
  useEffect(() => {
    const editorUrl = import.meta.env.VITE_TSHIRT3D_URL || (
      import.meta.env.DEV ? 'http://127.0.0.1:5174/' : '/editor/'
    );
    window.location.replace(`${editorUrl}${window.location.search}`);
  }, []);

  return null;
}

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
          <Suspense fallback={
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'system-ui' }}>
              <p>Cargando...</p>
            </div>
          }>
          <Routes>
            {/* Rutas existentes de integracion-total */}
            <Route path="/" element={<Landing />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/category/:id" element={<Category />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<AuthPage defaultMode="login" />} />
            <Route path="/register" element={<AuthPage defaultMode="register" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/perfil" element={<UserProfile />} />
            <Route path="/email" element={<VerificarEmail />} />
            <Route path="/verificar-email" element={<VerificarEmail />} />
            <Route path="/verificar-email-pendiente" element={<VerificacionPendiente />} />
            <Route path="/password" element={<RecuperarPassword />} />
            <Route path="/nueva-password" element={<NuevaPassword />} />

            {/* Rutas admin protegidas */}
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
          </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;