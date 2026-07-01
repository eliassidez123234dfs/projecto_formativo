import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/theme.css';
import './styles/globals.css';
import './styles/responsive.css';

import { lazy, Suspense } from 'react';
import ProtectedRoute, { ROLES } from './components/ProtectedRoute';
import { PublicLayout } from './components/PublicLayout';
import MainLayout from './components/MainLayout';

const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const Category = lazy(() => import('./pages/Category').then(m => ({ default: m.Category })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Product3D = lazy(() => import('./pages/Product3D').then(m => ({ default: m.Product3D })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));
const AdminCart = lazy(() => import('./pages/AdminCart'));
const AdminCartDetail = lazy(() => import('./pages/AdminCartDetail'));
const VerificarEmail = lazy(() => import('./pages/Email').then(m => ({ default: m.VerificarEmail })));
const VerificacionPendiente = lazy(() => import('./pages/Email').then(m => ({ default: m.VerificacionPendiente })));
const RecuperarPassword = lazy(() => import('./pages/Password').then(m => ({ default: m.RecuperarPassword })));
const NuevaPassword = lazy(() => import('./pages/Password').then(m => ({ default: m.NuevaPassword })));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminProductDetail = lazy(() => import('./pages/AdminProductDetail'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/AdminOrderDetail'));
const AdminContact = lazy(() => import('./pages/AdminContact'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));
const AdminCategories = lazy(() => import('./pages/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminImages = lazy(() => import('./pages/AdminImages').then(m => ({ default: m.AdminImages })));
const AdminDesigns = lazy(() => import('./pages/AdminDesigns').then(m => ({ default: m.AdminDesigns })));
const UserDesigns = lazy(() => import('./pages/UserDesigns').then(m => ({ default: m.UserDesigns })));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const UIShowcase = lazy(() => import('./pages/UIShowcase'));

function LoadingFallback() {
  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '60vh', fontSize: '1.2rem', color: '#666'
    }}>
      Cargando...
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: 14, borderRadius: 8, padding: '10px 16px' } }} />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>

                {/* ─── PÚBLICAS (Horizontal Header + Breadcrumbs) ─── */}
                <Route path="/" element={<PublicLayout floating><Landing /></PublicLayout>} />
                <Route path="/catalog" element={<PublicLayout><Catalog /></PublicLayout>} />
                <Route path="/category/:id" element={<PublicLayout><Category /></PublicLayout>} />
                <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
                <Route path="/product/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
                <Route path="/product/:id/3d" element={<PublicLayout><Product3D /></PublicLayout>} />
                <Route path="/catalogo" element={<PublicLayout><Catalog /></PublicLayout>} />
                <Route path="/ui" element={<PublicLayout><UIShowcase /></PublicLayout>} />

                {/* ─── AUTENTICACIÓN (Horizontal Header) ─── */}
                <Route path="/login" element={<PublicLayout><AuthPage key="login" defaultMode="login" /></PublicLayout>} />
                <Route path="/register" element={<PublicLayout><AuthPage key="register" defaultMode="register" /></PublicLayout>} />

                {/* ─── VERIFICACIÓN / PASSWORD (Horizontal Header) ─── */}
                <Route path="/email" element={<PublicLayout><VerificarEmail /></PublicLayout>} />
                <Route path="/verificar-email" element={<PublicLayout><VerificarEmail /></PublicLayout>} />
                <Route path="/verificar-email-pendiente" element={<PublicLayout><VerificacionPendiente /></PublicLayout>} />
                <Route path="/password" element={<PublicLayout><RecuperarPassword /></PublicLayout>} />
                <Route path="/nueva-password" element={<PublicLayout><NuevaPassword /></PublicLayout>} />

                {/* ─── USUARIO AUTENTICADO (Sidebar layout) ─── */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute><MainLayout title="Mi Perfil"><UserProfile /></MainLayout></ProtectedRoute>} />
                <Route path="/mis-disenos" element={<ProtectedRoute><MainLayout title="Mis Diseños 3D"><UserDesigns /></MainLayout></ProtectedRoute>} />

                {/* ─── ADMIN (Sidebar layout, admin-only) ─── */}
                <Route path="/admin" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-products" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminProducts /></ProtectedRoute>} />
                <Route path="/admin-products/detail/:id" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminProductDetail /></ProtectedRoute>} />
                <Route path="/admin-users" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin-categories" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminCategories /></ProtectedRoute>} />
                <Route path="/admin-images" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminImages /></ProtectedRoute>} />
                <Route path="/admin-designs" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminDesigns /></ProtectedRoute>} />
                <Route path="/admin-orders" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin-orders/:id" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminOrderDetail /></ProtectedRoute>} />
                <Route path="/admin-cart" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminCart /></ProtectedRoute>} />
                <Route path="/admin-cart/:id" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminCartDetail /></ProtectedRoute>} />
                <Route path="/admin-contact" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminContact /></ProtectedRoute>} />
                <Route path="/admin-audit" element={<ProtectedRoute requiredRoles={[ROLES.ADMIN]}><AdminAudit /></ProtectedRoute>} />

                {/* ─── CHECKOUT (requiere autenticación) ─── */}
                <Route path="/checkout" element={<ProtectedRoute><PublicLayout><CheckoutPage /></PublicLayout></ProtectedRoute>} />
                <Route path="/checkout/resultado" element={<ProtectedRoute><PublicLayout><OrderConfirmation /></PublicLayout></ProtectedRoute>} />

              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;
