import { useState } from 'react'
import ProductList from '../components/ProductList'
import ProductForm from '../components/ProductForm'
import './admin.css'

export default function AdminProducts() {
  const [showForm, setShowForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [editingProduct, setEditingProduct] = useState(null)

  async function openEdit(productId) {
    const response = await fetch(`/api/products/${productId}/`)
    const data = await response.json()
    setEditingProduct(data)
    setShowForm(true)
  }

  async function toggleActive(productId) {
    await fetch(`/api/products/${productId}/toggle-active/`, { method: 'PATCH' })
    setRefreshKey(k => k + 1)
  }

  return (
    <main className="admin-container">
      <header className="admin-header">
        <h1>Admin — Gestión de Productos</h1>
        <div>
          <button
            className="btn"
            onClick={() => {
              setEditingProduct(null)
              setShowForm(true)
            }}
          >
            ➕ Crear Producto
          </button>
        </div>
      </header>

      <section>
        <ProductList refreshKey={refreshKey} onEdit={openEdit} onToggle={toggleActive} />
      </section>

      {showForm && (
        <ProductForm
          key={editingProduct?.id || 'new'}
          product={editingProduct}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            setEditingProduct(null)
            setRefreshKey(k => k + 1)
          }}
        />
      )}
    </main>
  )
}
