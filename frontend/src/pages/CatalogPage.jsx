import { useEffect, useState } from 'react'
import './shop.css'

function StarRating({ rating, size = 14 }) {
  if (!rating) return null
  return (
    <div className="sc-stars" style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} viewBox="0 0 24 24" width={size} height={size}
          fill={star <= Math.round(rating) ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function ProductCard({ product }) {
  const stock = product.stock_total ?? null

  function stockBadge() {
    if (stock === null) return null
    if (stock >= 5) return { label: `Stock: ${stock} unidades`, cls: 'sc-stock-ok' }
    if (stock > 0) return { label: 'Últimas unidades', cls: 'sc-stock-warn' }
    return { label: 'Agotado', cls: 'sc-stock-no' }
  }

  const badge = stockBadge()

  return (
    <article className="shop-card" style={{ position: 'relative' }}>
      {badge && <span className={`sc-stock-badge ${badge.cls}`}>{badge.label}</span>}
      <a href={`/products/${product.id}`} className="shop-card-link">
        <div className="shop-card-image-wrap">
          {product.main_image ? <img src={product.main_image} alt={product.name} className="shop-card-image" /> : <div className="shop-card-placeholder">Sin imagen</div>}
        </div>
        <div className="shop-card-body">
          <h3>{product.name}</h3>
          <p>{product.description}</p>
          <div className="shop-card-meta">
            <strong>${Number(product.base_price).toFixed(2)}</strong>
            <span>{product.available_sizes?.length || 0} tallas</span>
          </div>
          {product.average_rating != null && (
            <div className="shop-card-rating" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <StarRating rating={product.average_rating} />
              {product.total_reviews > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>({product.total_reviews})</span>}
            </div>
          )}
        </div>
      </a>
    </article>
  )
}

export default function CatalogPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [filterOptions, setFilterOptions] = useState({ categories: [], sizes: [], colors: [], price_range: { min: 0, max: 0 } })
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('-created_at')
  const [category, setCategory] = useState('')
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [hasStock, setHasStock] = useState(true)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  const filterKey = `${search}|${sort}|${category}|${size}|${color}|${hasStock}|${minPrice}|${maxPrice}`

  useEffect(() => {
    let cancelled = false
    async function loadFilters() {
      const response = await fetch('/api/catalog/filters/')
      const data = await response.json()
      if (!cancelled) {
        setFilterOptions(data)
      }
    }
    loadFilters()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setPage(1)
      const params = new URLSearchParams({ ordering: sort, page_size: pageSize, page: 1 })
      if (search.trim()) params.set('q', search.trim())
      if (category) params.set('category', category)
      if (size) params.set('size', size)
      if (color) params.set('color', color)
      if (hasStock) params.set('has_stock', 'true')
      if (minPrice) params.set('min_price', minPrice)
      if (maxPrice) params.set('max_price', maxPrice)
      const response = await fetch(`/api/catalog/?${params.toString()}`)
      const data = await response.json()
      if (!cancelled) {
        setItems(data.results || data)
        setTotalCount(data.count || (Array.isArray(data) ? data.length : 0))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [filterKey])

  async function loadMore() {
    setLoadingMore(true)
    const nextPage = page + 1
    const params = new URLSearchParams({ ordering: sort, page_size: pageSize, page: nextPage })
    if (search.trim()) params.set('q', search.trim())
    if (category) params.set('category', category)
    if (size) params.set('size', size)
    if (color) params.set('color', color)
    if (hasStock) params.set('has_stock', 'true')
    if (minPrice) params.set('min_price', minPrice)
    if (maxPrice) params.set('max_price', maxPrice)
    const response = await fetch(`/api/catalog/?${params.toString()}`)
    const data = await response.json()
    setItems(prev => [...prev, ...(data.results || data)])
    setTotalCount(data.count || 0)
    setPage(nextPage)
    setLoadingMore(false)
  }

  function resetFilters() {
    setCategory('')
    setSize('')
    setColor('')
    setHasStock(true)
    setMinPrice('')
    setMaxPrice('')
  }

  const allLoaded = items.length >= totalCount

  return (
    <main className="shop-shell">
      <section className="shop-hero">
        <div>
          <p className="eyebrow">Catálogo público</p>
          <h1>Ropa virtual con estampados 3D</h1>
          <p>Explora productos activos, aprobados y listos para personalizar.</p>
        </div>
        <div className="shop-hero-actions">
          <a className="shop-button secondary" href="/admin-products">Ir al panel admin</a>
          <a className="shop-button" href="/cart">Ver carrito</a>
        </div>
      </section>

      <section className="shop-toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o descripción"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setPage(1)
          }}
        />
        <select value={sort} onChange={e => {
          setSort(e.target.value)
          setPage(1)
        }}>
          <option value="-created_at">Más recientes</option>
          <option value="name">Nombre A-Z</option>
          <option value="-base_price">Precio mayor</option>
          <option value="base_price">Precio menor</option>
        </select>
      </section>

      <section className="shop-filters-grid">
        <select value={category} onChange={e => {
          setCategory(e.target.value)
          setPage(1)
        }}>
          <option value="">Todas las categorías</option>
          {(filterOptions.categories || []).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>

        <select value={size} onChange={e => {
          setSize(e.target.value)
          setPage(1)
        }}>
          <option value="">Todas las tallas</option>
          {(filterOptions.sizes || []).map(item => <option key={item} value={item}>{item}</option>)}
        </select>

        <select value={color} onChange={e => {
          setColor(e.target.value)
          setPage(1)
        }}>
          <option value="">Todos los colores</option>
          {(filterOptions.colors || []).map(item => <option key={item} value={item}>{item}</option>)}
        </select>

        <input
          type="number"
          placeholder={`Precio mínimo (${filterOptions.price_range?.min || 0})`}
          value={minPrice}
          onChange={e => {
            setMinPrice(e.target.value)
            setPage(1)
          }}
        />

        <input
          type="number"
          placeholder={`Precio máximo (${filterOptions.price_range?.max || 0})`}
          value={maxPrice}
          onChange={e => {
            setMaxPrice(e.target.value)
            setPage(1)
          }}
        />

        <label className="inline-check">
          <input type="checkbox" checked={hasStock} onChange={e => {
            setHasStock(e.target.checked)
            setPage(1)
          }} />
          Solo con stock
        </label>

        <button type="button" className="shop-button secondary" onClick={resetFilters}>Limpiar filtros</button>
      </section>

      {loading ? (
        <div className="shop-empty">Cargando catálogo...</div>
      ) : (
        <>
          <section className="shop-grid">
            {items.map(product => <ProductCard key={product.id} product={product} />)}
          </section>
          {!allLoaded && (
            <div className="load-more-wrap">
              <button type="button" className="shop-button load-more-btn" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Cargando...' : 'Cargar más'}
              </button>
              {loadingMore && <span className="load-more-spinner" />}
            </div>
          )}
        </>
      )}
    </main>
  )
}
