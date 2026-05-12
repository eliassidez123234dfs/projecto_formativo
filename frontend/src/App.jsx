import AdminProducts from './pages/AdminProducts'
import CatalogPage from './pages/CatalogPage'
import PublicProductDetail from './pages/PublicProductDetail'
import AdminProductDetail from './pages/AdminProductDetail'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import './App.css'

function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  const adminDetailMatch = path.match(/^\/admin-products\/detail\/(\d+)\/?$/)
  const productDetailMatch = path.match(/^\/(?:productos|products)\/(\d+)\/?$/)

  if (adminDetailMatch) {
    return <AdminProductDetail productId={adminDetailMatch[1]} />
  }

  if (path.startsWith('/admin-products')) {
    return <AdminProducts />
  }

  if (path.startsWith('/cart') || path.startsWith('/carrito')) {
    return <CartPage />
  }

  if (path.startsWith('/checkout')) {
    return <CheckoutPage />
  }

  if (productDetailMatch) {
    return <PublicProductDetail productId={productDetailMatch[1]} />
  }

  if (path.startsWith('/catalogo') || path === '/' || path.startsWith('/catalog')) {
    return <CatalogPage />
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Proyecto Formativo — Frontend</h1>
      <p>Rutas disponibles: <a href="/catalogo">Catálogo</a>, <a href="/admin-products">Admin</a>.</p>
    </main>
  )
}

export default App
