import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/theme.css';
import './styles/globals.css';

// Lazy-loaded pages
import { lazy, Suspense } from 'react';

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
const UserProfile = lazy(() => import('./pages/UserProfile'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));

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
                <Route path="/" element={<Landing />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/category/:id" element={<Category />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/product/:id/3d" element={<Product3D />} />
                <Route path="/login" element={<AuthPage defaultMode="login" />} />
                <Route path="/register" element={<AuthPage defaultMode="register" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/perfil" element={<UserProfile />} />
                <Route path="/email" element={<VerificarEmail />} />
                <Route path="/verificar-email" element={<VerificarEmail />} />
                <Route path="/verificar-email-pendiente" element={<VerificacionPendiente />} />
                <Route path="/password" element={<RecuperarPassword />} />
                <Route path="/nueva-password" element={<NuevaPassword />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin-products" element={<AdminProducts />} />
                <Route path="/admin-products/detail/:id" element={<AdminProductDetail />} />
                <Route path="/admin-users" element={<AdminUsers />} />
                <Route path="/admin-orders" element={<AdminOrders />} />
                <Route path="/admin-orders/:id" element={<AdminOrderDetail />} />
                <Route path="/admin-cart" element={<AdminCart />} />
                <Route path="/admin-cart/:id" element={<AdminCartDetail />} />
                <Route path="/admin-contact" element={<AdminContact />} />
                <Route path="/admin-audit" element={<AdminAudit />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/resultado" element={<OrderConfirmation />} />
                <Route path="/catalogo" element={<Catalog />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;
