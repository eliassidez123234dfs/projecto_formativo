import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Catalog } from './pages/Catalog';
import { Category } from './pages/Category';
import { ProductDetail } from './pages/ProductDetail';
import { Product3D } from './pages/Product3D';
import { Cart } from './pages/Cart';
import { VerificarEmail, VerificacionPendiente } from './pages/Email';
import { RecuperarPassword } from './pages/Password';

import AdminProducts from './pages/AdminProducts'
import CatalogPage from './pages/CatalogPage'
import PublicProductDetail from './pages/PublicProductDetail'
import AdminProductDetail from './pages/AdminProductDetail'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import Navigation from './components/Navigation'
import './App.css'
import AdminProducts from './pages/AdminProducts';
import AdminProductDetail from './pages/AdminProductDetail';
import CheckoutPage from './pages/CheckoutPage';
// Si CatalogPage es diferente a Catalog, renómbralo o unifica ambos componentes para evitar confusiones.

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const adminDetailMatch = path.match(/^\/admin-products\/detail\/(\d+)\/?$/)
  const productDetailMatch = path.match(/^\/(?:productos|products)\/(\d+)\/?$/)

  if (adminDetailMatch) {
    return (
      <>
        <Navigation />
        <AdminProductDetail productId={adminDetailMatch[1]} />
      </>
    )
  }

  if (path.startsWith('/admin-products')) {
    return (
      <>
        <Navigation />
        <AdminProducts />
      </>
    )
  }

  if (path.startsWith('/cart') || path.startsWith('/carrito')) {
    return (
      <>
        <Navigation />
        <CartPage />
      </>
    )
  }

  if (path.startsWith('/checkout')) {
    return (
      <>
        <Navigation />
        <CheckoutPage />
      </>
    )
  }

  if (productDetailMatch) {
    return (
      <>
        <Navigation />
        <PublicProductDetail productId={productDetailMatch[1]} />
      </>
    )
  }

  if (path.startsWith('/catalogo') || path === '/' || path.startsWith('/catalog')) {
    return (
      <>
        <Navigation />
        <CatalogPage />
      </>
    )
  }

  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
          {/* Rutas existentes de integracion-total */}
          <Route path="/" element={<Landing />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/category/:id" element={<Category />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/product/:id/3d" element={<Product3D />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/register" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/email" element={<VerificarEmail />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />
          <Route path="/verificar-email-pendiente" element={<VerificacionPendiente />} />
          <Route path="/password" element={<RecuperarPassword />} />

          {/* Nuevas rutas desde jose */}
          <Route path="/admin-products" element={<AdminProducts />} />
          <Route path="/admin-products/detail/:id" element={<AdminProductDetail />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* Opcional: si quieres mantener también /catalogo como alias de /catalog */}
          <Route path="/catalogo" element={<Catalog />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;