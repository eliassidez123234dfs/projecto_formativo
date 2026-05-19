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

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <Routes>
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
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;