import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import { PublicLayout } from './components/PublicLayout';
import MainLayout from './components/MainLayout';
import ScrollToTop from './components/ScrollToTop';
import Spinner from './components/Spinner';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/theme.css';
import './styles/globals.css';
import './styles/responsive.css';

// ─── Lazy Loading por ruta (Code Splitting) ───
// Cada página se carga solo cuando el usuario navega a ella.
// Esto reduce el bundle inicial de ~800KB a ~150KB (solo React + routing).
// OWASP A06:2021 — Limita la exposición de código fuente al módulo necesario.

// Páginas públicas (frecuentes)
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Catalog = lazy(() => import('./pages/Catalog').then(m => ({ default: m.Catalog })));
const Category = lazy(() => import('./pages/Category').then(m => ({ default: m.Category })));
const ProductDetail = lazy(() => import('./pages/ProductDetail').then(m => ({ default: m.ProductDetail })));
const Cart = lazy(() => import('./pages/Cart').then(m => ({ default: m.Cart })));

// Páginas públicas (menos frecuentes)
const Product3D = lazy(() => import('./pages/Product3D').then(m => ({ default: m.Product3D })));
const UIShowcase = lazy(() => import('./pages/UIShowcase'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Autenticación
const AuthPage = lazy(() => import('./pages/AuthPage'));
const Email = lazy(() => import('./pages/Email'));
const Password = lazy(() => import('./pages/Password'));

// Usuario autenticado
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const UserDesigns = lazy(() => import('./pages/UserDesigns').then(m => ({ default: m.UserDesigns })));

// Checkout
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));

// Admin — solo se cargan cuando el usuario es Admin (seguridad OWASP A05:2021)
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminProducts = lazy(() => import('./pages/AdminProducts'));
const AdminProductDetail = lazy(() => import('./pages/AdminProductDetail'));
const AdminProductApproval = lazy(() => import('./pages/AdminProductApproval'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminCategories = lazy(() => import('./pages/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminImages = lazy(() => import('./pages/AdminImages').then(m => ({ default: m.AdminImages })));
const AdminDesigns = lazy(() => import('./pages/AdminDesigns').then(m => ({ default: m.AdminDesigns })));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/AdminOrderDetail'));
const AdminCart = lazy(() => import('./pages/AdminCart'));
const AdminCartDetail = lazy(() => import('./pages/AdminCartDetail'));
const AdminContact = lazy(() => import('./pages/AdminContact'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));
const AdminModel3D = lazy(() => import('./pages/AdminModel3D'));
const AdminCloudinary = lazy(() => import('./pages/AdminCloudinary'));

const LoadingFallback = () => (
  <div className="page-loader" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <Spinner />
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Toaster position="top-right" toastOptions={{ duration: 4000, style: { fontSize: 14, borderRadius: 8, padding: '10px 16px' } }} />
            <ScrollToTop />
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* ─── PÚBLICO ─── */}
                <Route path="/" element={<PublicLayout><Landing /></PublicLayout>} />
                <Route path="/catalog" element={<PublicLayout><Catalog /></PublicLayout>} />
                <Route path="/category/:id" element={<PublicLayout><Category /></PublicLayout>} />
                <Route path="/product/:id" element={<PublicLayout><ProductDetail /></PublicLayout>} />
                <Route path="/product/:id/3d" element={<PublicLayout><Product3D /></PublicLayout>} />
                <Route path="/cart" element={<PublicLayout><Cart /></PublicLayout>} />
                <Route path="/ui" element={<PublicLayout><UIShowcase /></PublicLayout>} />

                {/* ─── AUTENTICACIÓN ─── */}
                <Route path="/login" element={<PublicLayout><AuthPage key="login" defaultMode="login" /></PublicLayout>} />
                <Route path="/register" element={<PublicLayout><AuthPage key="register" defaultMode="register" /></PublicLayout>} />

                {/* ─── VERIFICACIÓN / PASSWORD ─── */}
                <Route path="/email" element={<PublicLayout><Email.VerificarEmail /></PublicLayout>} />
                <Route path="/verificar-email" element={<PublicLayout><Email.VerificarEmail /></PublicLayout>} />
                <Route path="/verificar-email-pendiente" element={<PublicLayout><Email.VerificacionPendiente /></PublicLayout>} />
                <Route path="/password" element={<PublicLayout><Password.RecuperarPassword /></PublicLayout>} />
                <Route path="/nueva-password" element={<PublicLayout><Password.NuevaPassword /></PublicLayout>} />

                {/* ─── USUARIO AUTENTICADO ─── */}
                <Route path="/dashboard" element={<ProtectedRoute allowAllRoles><Dashboard /></ProtectedRoute>} />
                <Route path="/perfil" element={<ProtectedRoute allowAllRoles><MainLayout title="Mi Perfil"><UserProfile /></MainLayout></ProtectedRoute>} />
                <Route path="/mis-disenos" element={<ProtectedRoute allowAllRoles><MainLayout title="Mis Diseños 3D"><UserDesigns /></MainLayout></ProtectedRoute>} />

                {/* ─── CHECKOUT (requiere autenticación) ─── */}
                <Route path="/checkout" element={<ProtectedRoute allowAllRoles><PublicLayout><CheckoutPage /></PublicLayout></ProtectedRoute>} />
                <Route path="/checkout/resultado" element={<ProtectedRoute allowAllRoles><PublicLayout><OrderConfirmation /></PublicLayout></ProtectedRoute>} />

                {/* ─── ADMIN (solo Administrador) ─── */}
                <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin-products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
                <Route path="/admin-products/detail/:id" element={<ProtectedRoute><AdminProductDetail /></ProtectedRoute>} />
                <Route path="/admin-products/approval" element={<ProtectedRoute><AdminProductApproval /></ProtectedRoute>} />
                <Route path="/admin-users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
                <Route path="/admin-categories" element={<ProtectedRoute><AdminCategories /></ProtectedRoute>} />
                <Route path="/admin-images" element={<ProtectedRoute><AdminImages /></ProtectedRoute>} />
                <Route path="/admin-designs" element={<ProtectedRoute><AdminDesigns /></ProtectedRoute>} />
                <Route path="/admin-orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
                <Route path="/admin-orders/:id" element={<ProtectedRoute><AdminOrderDetail /></ProtectedRoute>} />
                <Route path="/admin-cart" element={<ProtectedRoute><AdminCart /></ProtectedRoute>} />
                <Route path="/admin-cart/:id" element={<ProtectedRoute><AdminCartDetail /></ProtectedRoute>} />
                <Route path="/admin-contact" element={<ProtectedRoute><AdminContact /></ProtectedRoute>} />
                <Route path="/admin-audit" element={<ProtectedRoute><AdminAudit /></ProtectedRoute>} />
                <Route path="/admin-model3d" element={<ProtectedRoute><AdminModel3D /></ProtectedRoute>} />
                <Route path="/admin-cloudinary" element={<ProtectedRoute><AdminCloudinary /></ProtectedRoute>} />

                {/* ─── 404 CATCH-ALL ─── */}
                <Route path="*" element={<PublicLayout><NotFound /></PublicLayout>} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;
