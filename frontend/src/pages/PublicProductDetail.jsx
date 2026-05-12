import { useEffect, useState } from 'react'
import './shop.css'

export default function PublicProductDetail({ productId }) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImageId, setSelectedImageId] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const response = await fetch(`/api/products/${productId}/`)
      const data = await response.json()
      if (!cancelled) {
        setProduct(data)
        setSelectedImageId(data.images?.[0]?.id || null)
        setSelectedVariant(data.variants?.[0] || null)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [productId])

  async function addToCart() {
    if (!selectedVariant) return setMessage('Selecciona una variante')
    const response = await fetch('/api/cart/add/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: product.id, variant_id: selectedVariant.id, quantity }),
    })
    const data = await response.json()
    if (!response.ok) {
      setMessage(data.quantity || data.product_id || data.variant_id || data.error || 'No se pudo agregar al carrito')
      return
    }
    setMessage('Producto agregado al carrito')
  }

  if (loading) {
    return <main className="shop-shell"><div className="shop-empty">Cargando producto...</div></main>
  }

  if (!product) {
    return <main className="shop-shell"><div className="shop-empty">Producto no encontrado</div></main>
  }

  const selectedImage = product.images?.find(image => image.id === selectedImageId) || product.images?.[0]
  const mainImage = selectedImage?.image_url || product.main_image || product.images?.find(image => image.is_main)?.image_url

  return (
    <main className="shop-shell">
      <section className="detail-layout">
        <div className="detail-gallery">
          <img src={mainImage} alt={product.name} className="detail-main-image" />
          <div className="detail-thumbs">
            {(product.images || []).map(image => (
              <button
                key={image.id}
                type="button"
                className={image.id === selectedImageId ? 'thumb active' : 'thumb'}
                onClick={() => setSelectedImageId(image.id)}
              >
                <img src={image.image_url} alt="miniatura" />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-panel">
          <p className="eyebrow">Vista producto</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="price-row">${Number(product.base_price).toFixed(2)}</div>

          <div className="variant-selectors">
            <label>Variante</label>
            <select
              value={selectedVariant?.id || ''}
              onChange={e => setSelectedVariant(product.variants.find(variant => String(variant.id) === e.target.value))}
            >
              {product.variants.map(variant => (
                <option key={variant.id} value={variant.id}>
                  {variant.size} / {variant.color} - Stock {variant.stock}
                </option>
              ))}
            </select>

            <label>Cantidad</label>
            <input type="number" min="1" max={selectedVariant?.stock || 1} value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          </div>

          <div className="detail-actions">
            <button type="button" className="shop-button" onClick={addToCart}>Agregar al carrito</button>
            <a className="shop-button secondary" href="/catalogo">Volver al catálogo</a>
            <a className="shop-button secondary" href="/cart">Ver carrito</a>
          </div>

          {message && <p className="detail-message">{message}</p>}
        </div>
      </section>
    </main>
  )
}
