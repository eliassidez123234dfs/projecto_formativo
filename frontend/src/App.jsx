import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import './styles/theme.css';
import './styles/globals.css';
import { Landing } from './pages/Landing';
import AuthPage from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { Catalog } from './pages/Catalog';
import { Category } from './pages/Category';
import { ProductDetail } from './pages/ProductDetail';
import { Product3D } from './pages/Product3D';
import { Cart } from './pages/Cart';
import AdminCart from './pages/AdminCart';
import AdminCartDetail from './pages/AdminCartDetail';
import { VerificarEmail, VerificacionPendiente } from './pages/Email';
import { RecuperarPassword, NuevaPassword } from './pages/Password';

// Nuevos imports desde la rama jose
import AdminProducts from './pages/AdminProducts';
import AdminProductDetail from './pages/AdminProductDetail';
import AdminUsers from './pages/AdminUsers';
import AdminContact from './pages/AdminContact';
import AdminAudit from './pages/AdminAudit';
import UserProfile from './pages/UserProfile';
import CheckoutPage from './pages/CheckoutPage';
// Si CatalogPage es diferente a Catalog, renómbralo o unifica
// import CatalogPage from './pages/CatalogPage';

function App() {
  return (
    <ThemeProvider>
      <CartProvider>
        <BrowserRouter>
          <ErrorBoundary>
          <Routes>
            {/* Rutas existentes de integracion-total */}
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

            {/* Nuevas rutas desde jose */}
            <Route path="/admin-products" element={<AdminProducts />} />
            <Route path="/admin-products/detail/:id" element={<AdminProductDetail />} />
            <Route path="/admin-users" element={<AdminUsers />} />
            <Route path="/admin-cart" element={<AdminCart />} />
            <Route path="/admin-cart/:id" element={<AdminCartDetail />} />
            <Route path="/admin-contact" element={<AdminContact />} />
            <Route path="/admin-audit" element={<AdminAudit />} />
            <Route path="/checkout" element={<CheckoutPage />} />

            {/* Opcional: si quieres mantener también /catalogo como alias de /catalog */}
            <Route path="/catalogo" element={<Catalog />} />
          </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;