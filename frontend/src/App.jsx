import AdminProducts from './pages/AdminProducts'
import CatalogPage from './pages/CatalogPage'
import PublicProductDetail from './pages/PublicProductDetail'
import AdminProductDetail from './pages/AdminProductDetail'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import Navigation from './components/Navigation'
import './App.css'

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
    <main style={{ padding: 24 }}>
      <h1>Proyecto Formativo — Frontend</h1>
      <p>Rutas disponibles: <a href="/catalogo">Catálogo</a>, <a href="/admin-products">Admin</a>.</p>
    </main>
  )
}

export default App
