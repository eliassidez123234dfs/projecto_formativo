import { useEffect, useState } from 'react'
import './shop.css'

function ProductCard({ product }) {
  return (
    <article className="shop-card">
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
        </div>
      </a>
    </article>
  )
}

export default function CatalogPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
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
      const params = new URLSearchParams({ ordering: sort, page_size: pageSize, page })
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
  }, [search, sort, category, size, color, hasStock, minPrice, maxPrice, page])

  function resetFilters() {
    setCategory('')
    setSize('')
    setColor('')
    setHasStock(true)
    setMinPrice('')
    setMaxPrice('')
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

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
          <nav className="pager" aria-label="Paginación catálogo">
            <button type="button" className="shop-button secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
            <span>Página {page} de {totalPages}</span>
            <button type="button" className="shop-button secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</button>
          </nav>
        </>
      )}
    </main>
  )
}
