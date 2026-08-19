import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ErrorBoundary from './components/ErrorBoundary';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import './styles/theme.css';
import './styles/globals.css';
import './styles/responsive.css';

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
import AdminModel3D from './pages/AdminModel3D';
import AdminCloudinary from './pages/AdminCloudinary';
import UserProfile from './pages/UserProfile';
import CheckoutPage from './pages/CheckoutPage';

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
              <Route path="/admin-model3d" element={<AdminModel3D />} />
              <Route path="/admin-cloudinary" element={<AdminCloudinary />} />
            </Route>
            <Route path="/checkout" element={<CheckoutPage />} />

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
