import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchCatalog } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import ErrorState from '../components/ErrorState';
import '../styles/catalog.css';

// ---------------------------------------------------------------
// Catalog.jsx  —  Catálogo de productos con búsqueda y filtros (RF-052)
// APIs consumidas: fetchCatalog (GET /api/catalogo/productos/)
// Estado global: CartContext (cart)
// Flujo: carga productos al montar y al cambiar filtros;
//        navega a /product/:id al hacer clic en un producto;
//        los filtros (búsqueda, categoría, precio, orden) se pasan
//        como query params a la API y resetean la paginación a página 1;
//        el agregado al carrito (talla/color/cantidad) lo maneja
//        <ProductCard> con <VariantPickerModal>.
// ---------------------------------------------------------------
export const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    q: '', category: '', min_price: '', max_price: '', size: '', color: '', ordering: '',
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filtersData, setFiltersData] = useState({ categories: [], sizes: [], colors: [], price_range: { min: 0, max: 0 } });
  const [pageInfo, setPageInfo] = useState(null);
  const navigate = useNavigate();

  const loadProducts = useCallback(async (reset = true) => {
    setLoading(true);
    setError(null);
    try {
      const targetPage = reset ? 1 : page + 1;
      const data = await fetchCatalog({ ...filters, page: targetPage });
      const results = data.results || data;
      setProducts(prev => reset ? results : [...prev, ...results]);
      setPage(targetPage);
      setHasMore(Boolean(data.next));
      setPageInfo(data.next ? { next: data.next, previous: data.previous, count: data.count } : null);
      if (data.filters) setFiltersData(data.filters);
    } catch (err) {
      setError(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'category' ? (value ? Number(value) : '') : value,
    }));
  };

  const clearFilters = () => {
    setFilters({ q: '', category: '', min_price: '', max_price: '', size: '', color: '', ordering: '' });
  };

  return (
    <>
      <div className="catalog-page">
        <div className="catalog-hero">
          <h1 className="catalog-title">Catálogo</h1>
          {pageInfo && (
            <p className="catalog-subtitle">{pageInfo.count} producto{(pageInfo.count || products.length) !== 1 ? 's' : ''} encontrado{(pageInfo.count || products.length) !== 1 ? 's' : ''}</p>
          )}
        </div>

        <Link to="/" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>← Volver al Inicio</Link>

        {filtersData.categories.length > 0 && (
          <div className="catalog-chips">
            {filtersData.categories.map((cat) => (
              <button key={cat.id} type="button"
                className={`chip ${filters.category === cat.id ? 'chip--active' : ''}`}
                onClick={() => setFilters(p => ({ ...p, category: p.category === cat.id ? '' : Number(cat.id) }))}>
                {cat.name}
              </button>
            ))}
          </div>
        )}

        <div className="catalog-filters">
          <div className="filter-item search-wrap">
            <svg className="search-ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input name="q" placeholder="Buscar productos..." value={filters.q} onChange={handleFilterChange} className="filter-input" />
          </div>
          <div className="filter-item">
            <select name="ordering" value={filters.ordering} onChange={handleFilterChange} className="filter-select">
              <option value="">Ordenar por</option>
              <option value="name">Nombre A-Z</option>
              <option value="-name">Nombre Z-A</option>
              <option value="base_price">Precio: menor a mayor</option>
              <option value="-base_price">Precio: mayor a menor</option>
              <option value="popularity">Más vendidos</option>
            </select>
          </div>
          <div className="filter-item">
            <select name="category" value={filters.category} onChange={handleFilterChange} className="filter-select">
              <option value="">Todas las categorías</option>
              {filtersData.categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <select name="size" value={filters.size} onChange={handleFilterChange} className="filter-select">
              <option value="">Todas las tallas</option>
              {filtersData.sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <select name="color" value={filters.color} onChange={handleFilterChange} className="filter-select">
              <option value="">Todos los colores</option>
              {filtersData.colors.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="filter-item price-group">
            <input name="min_price" type="number" placeholder="$ Mín" value={filters.min_price} onChange={handleFilterChange} className="filter-input price-input" />
            <span className="price-sep">—</span>
            <input name="max_price" type="number" placeholder="$ Máx" value={filters.max_price} onChange={handleFilterChange} className="filter-input price-input" />
          </div>
          <button type="button" className="filter-btn" onClick={loadProducts}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
        </div>

        {loading ? (
          <div className="product-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="sk-card" style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="sk-img" />
                <div className="sk-body">
                  <div className="sk-line" style={{ width: '70%' }} />
                  <div className="sk-line" style={{ width: '35%', height: 22 }} />
                  <div className="sk-actions">
                    <div className="sk-btn" /><div className="sk-btn" /><div className="sk-btn" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} module="catálogo de productos" onRetry={() => loadProducts()} />
        ) : products.length === 0 ? (
          <div className="catalog-state">
            <h3 className="state-title">No hay productos disponibles</h3>
            <p className="state-text">Intenta con otros filtros o categorías.</p>
            <button className="btn btn-primary" onClick={clearFilters}>
              Limpiar filtros
            </button>
          </div>
        ) : (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    base_price: Number(product.base_price ?? 0),
                    price: Number(product.min_price ?? product.base_price ?? 0),
                    min_price: product.min_price,
                    max_price: product.max_price,
                    total_stock: product.total_stock,
                    color_hexes: product.color_hexes || {},
                    badge: product.is_new ? 'Nuevo' : null,
                    image: product.main_image || null,
                    available_sizes: product.available_sizes || [],
                    available_colors: product.available_colors || [],
                    stock_total: product.stock_total || 0,
                    variants_summary: product.variants_summary || {},
                    average_rating: product.average_rating,
                    total_reviews: product.total_reviews,
                    description: product.description,
                  }}
                  onView={(id) => navigate(`/product/${id}`)}
                />
              ))}
            </div>

            {pageInfo && hasMore && (
              <div className="catalog-pagination">
                <button className="page-btn" disabled={loading} onClick={() => loadProducts(false)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  {loading ? 'Cargando...' : 'Cargar más'}
                </button>
                <span className="page-info">Mostrando {products.length} de {pageInfo.count} producto{pageInfo.count !== 1 ? 's' : ''}</span>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};