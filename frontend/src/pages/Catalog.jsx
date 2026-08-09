import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchCatalog, fetchProductDetail } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import ErrorState from '../components/ErrorState';
import { useCart } from '../context/CartContext';

// ---------------------------------------------------------------
// Catalog.jsx  —  Catálogo de productos con búsqueda y filtros (RF-052)
// APIs consumidas: fetchCatalog (GET /api/catalogo/productos/)
// Hooks: useState, useEffect, useNavigate, useCart
// Estado global: CartContext (cart)
// Flujo: carga productos al montar y al cambiar filtros;
//        navega a /product/:id al hacer clic en un producto;
//        los filtros (búsqueda, categoría, precio, orden) se pasan
//        como query params a la API y resetean la paginación a página 1
// ---------------------------------------------------------------
export const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    q: '', category: '', min_price: '', max_price: '', size: '', color: '', ordering: '',
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filtersData, setFiltersData] = useState({ categories: [], sizes: [], colors: [], price_range: { min: 0, max: 0 } });
  const [pageInfo, setPageInfo] = useState(null);
  const [loadMorePage, setLoadMorePage] = useState(2);
  const navigate = useNavigate();
  const { cart, addItem } = useCart();
  const [pick, setPick] = useState(null);
  const [pickSize, setPickSize] = useState('');
  const [pickColor, setPickColor] = useState('');
  const [pickQty, setPickQty] = useState(1);
  const [addingPick, setAddingPick] = useState(false);

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
      setLoadMorePage(2);
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

  const handleAddToCart = async (product) => {
    try {
      let prod = product;
      if (!prod.variants) prod = await fetchProductDetail(product.id);
      const available = prod.variants?.filter(v => v.stock > 0) || [];
      if (available.length === 0) {
        toast.error('Este producto no tiene variantes disponibles');
        return;
      }
      if (available.length === 1) {
        await addItem(prod.id, available[0].id, 1);
        toast.success('Producto agregado al carrito');
        return;
      }
      setPick(prod);
      setPickSize(available[0].size);
      setPickColor(available[0].color);
      setPickQty(1);
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.quantity || 'Error al agregar al carrito';
      toast.error(msg);
    }
  };

  const pickSizes = [...new Set((pick?.variants || []).filter(v => v.stock > 0).map(v => v.size))];
  const pickColors = [...new Set((pick?.variants || []).filter(v => v.size === pickSize && v.stock > 0).map(v => v.color))];

  const confirmPick = async () => {
    const variant = pick?.variants?.find(v => v.size === pickSize && v.color === pickColor);
    if (!variant) { toast.error('Selecciona talla y color'); return; }
    setAddingPick(true);
    try {
      await addItem(pick.id, variant.id, pickQty);
      toast.success('Producto agregado al carrito');
      setPick(null);
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.quantity || 'Error al agregar al carrito';
      toast.error(msg);
    } finally {
      setAddingPick(false);
    }
  };

  return (
    <>
      <div className="catalog-page">
        <div className="catalog-bg-shapes">
          <div className="shape shape-1" />
          <div className="shape shape-2" />
          <div className="shape shape-3" />
          <div className="shape shape-4" />
          <div className="shape shape-5" />
          <div className="shape shape-6" />
          <span className="sparkle sparkle-1">✦</span>
          <span className="sparkle sparkle-2">✦</span>
          <span className="sparkle sparkle-3">✦</span>
          <span className="sparkle sparkle-4">✦</span>
          <span className="dot dot-1" />
          <span className="dot dot-2" />
          <span className="dot dot-3" />
        </div>

        <div className="catalog-hero">
          <h1 className="catalog-title">Catálogo</h1>
          {pageInfo && (
            <p className="catalog-subtitle">{pageInfo.count} producto{(pageInfo.count || products.length) !== 1 ? 's' : ''} encontrado{(pageInfo.count || products.length) !== 1 ? 's' : ''}</p>
          )}
        </div>

        <Link to="/" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>← Volver al Inicio</Link>

        {/* Chips de categorías — selección rápida; toggle on/off con reset a página 1 */}
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

        {/* Barra de filtros: búsqueda textual, orden, categoría, rango de precio */}
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
                    base_price: product.base_price,
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

      <style>{`
        .catalog-page {
          position: relative;
          max-width: 1600px;
          margin: 0 auto;
          padding: 1.5rem 1.5rem 4rem;
          overflow: hidden;
        }

        .catalog-bg-shapes {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          z-index: 0;
        }

        .shape {
          position: absolute;
          border-radius: 50%;
          opacity: 0.5;
        }

        .shape-1 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(236,72,153,0.12), transparent);
          top: -80px; right: -60px;
        }

        .shape-2 {
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(59,130,246,0.1), transparent);
          bottom: 120px; left: -40px;
        }

        .shape-3 {
          width: 180px; height: 180px;
          background: radial-gradient(circle, rgba(251,191,36,0.1), transparent);
          top: 40%; right: 10%;
        }

        .shape-4 {
          width: 120px; height: 120px;
          background: radial-gradient(circle, rgba(220,38,38,0.08), transparent);
          bottom: 20%; left: 15%;
        }

        .shape-5 {
          width: 80px; height: 80px;
          border: 2px dashed rgba(236,72,153,0.2);
          top: 25%; left: 5%;
          animation: floatSlow 8s ease-in-out infinite;
        }

        .shape-6 {
          width: 50px; height: 50px;
          background: rgba(251,191,36,0.12);
          bottom: 30%; right: 8%;
          animation: floatSlow 6s ease-in-out infinite reverse;
        }

        .sparkle {
          position: absolute;
          font-size: 1rem;
          color: #F59E0B;
          animation: sparkleAnim 2s ease-in-out infinite;
        }

        .sparkle-1 { top: 15%; left: 8%; animation-delay: 0s; }
        .sparkle-2 { top: 10%; right: 15%; animation-delay: 0.5s; }
        .sparkle-3 { bottom: 25%; left: 20%; animation-delay: 1s; }
        .sparkle-4 { bottom: 15%; right: 10%; animation-delay: 1.5s; }

        .dot {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 50%;
          animation: floatSlow 5s ease-in-out infinite;
        }

        .dot-1 { background: #60A5FA; top: 30%; left: 3%; }
        .dot-2 { background: #F472B6; top: 20%; right: 5%; animation-delay: 1s; }
        .dot-3 { background: #34D399; bottom: 40%; right: 12%; animation-delay: 2s; }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        @keyframes sparkleAnim {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }

        .catalog-hero {
          position: relative;
          z-index: 1;
          margin-bottom: 1.5rem;
        }

        .catalog-title {
          font-size: 2.5rem;
          font-weight: 800;
          letter-spacing: -1px;
          color: #111827;
          margin: 0 0 6px;
          background: linear-gradient(135deg, #DC2626, #F59E0B);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .catalog-subtitle {
          font-size: 0.95rem;
          color: #6B7280;
          margin: 0;
          font-weight: 500;
        }

        .catalog-chips {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 1.25rem;
        }

        .chip {
          padding: 8px 18px;
          font-size: 0.8rem;
          font-weight: 600;
          border: 2px solid #E5E7EB;
          border-radius: 999px;
          background: white;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }

        .chip:hover {
          border-color: #DC2626;
          color: #DC2626;
          transform: translateY(-1px);
        }

        .chip--active {
          background: #DC2626;
          border-color: #DC2626;
          color: white;
          box-shadow: 0 4px 12px rgba(220,38,38,0.25);
        }

        .chip--active:hover {
          background: #B91C1C;
          color: white;
        }

        .catalog-filters {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 8px;
          margin-bottom: 1.75rem;
          flex-wrap: wrap;
          align-items: center;
          border-bottom: 1px solid #F3F4F6;
          padding-bottom: 1rem;
        }

        .filter-item {
          position: relative;
        }

        .search-wrap {
          flex: 1;
          min-width: 180px;
        }

        .search-ico {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9CA3AF;
          pointer-events: none;
        }

        .filter-input {
          height: 38px;
          padding: 0 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: white;
          color: #111827;
          font-size: 0.8rem;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
        }

        .filter-input:focus {
          border-color: #DC2626;
        }

        .search-wrap .filter-input {
          padding-left: 38px;
        }

        .filter-select {
          height: 38px;
          padding: 0 30px 0 12px;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          background: white;
          color: #111827;
          font-size: 0.8rem;
          outline: none;
          cursor: pointer;
          transition: border-color 0.15s;
          -webkit-appearance: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          min-width: 140px;
        }

        .filter-select:focus {
          border-color: #DC2626;
        }

        .price-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .price-input {
          width: 80px;
          text-align: center;
          min-width: 0;
        }

        .price-sep {
          color: #D1D5DB;
          font-weight: 600;
        }

        .filter-btn {
          height: 38px;
          padding: 0 18px;
          border: none;
          border-radius: 8px;
          background: #DC2626;
          color: white;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .filter-btn:hover {
          background: #B91C1C;
        }

        .product-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        /* Grid responsivo manejado por responsive.css */

        .sk-card {
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid #F3F4F6;
          background: white;
          animation: skShine 1.8s ease-in-out infinite;
        }

        .sk-img {
          aspect-ratio: 1;
          background: linear-gradient(135deg, #F3F4F6, #E5E7EB);
        }

        .sk-body { padding: 16px; }

        .sk-line {
          height: 14px;
          background: linear-gradient(90deg, #F3F4F6, #E5E7EB);
          border-radius: 4px;
          margin-bottom: 10px;
        }

        .sk-actions {
          display: flex;
          gap: 6px;
          margin-top: 14px;
        }

        .sk-btn {
          flex: 1;
          height: 36px;
          background: linear-gradient(90deg, #F3F4F6, #E5E7EB);
          border-radius: 10px;
        }

        @keyframes skShine {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .catalog-state {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 5rem 1rem;
        }

        .state-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 8px;
        }

        .state-text {
          font-size: 0.9rem;
          color: #6B7280;
          margin-bottom: 1.25rem;
        }

        .catalog-pagination {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 3rem;
        }

        .page-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 22px;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          background: white;
          color: #374151;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .page-btn:hover:not(:disabled) {
          border-color: #DC2626;
          color: #DC2626;
          transform: translateY(-1px);
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-info {
          font-size: 0.85rem;
          color: #9CA3AF;
          font-weight: 600;
        }

        .load-more-wrap {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; padding: 32px 0; position: relative; z-index: 1;
        }

        @keyframes lms-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .catalog-page { padding: 1.25rem 1rem 3rem; }
          .catalog-title { font-size: 1.75rem; }
          .catalog-filters { flex-direction: column; border-bottom: none; padding-bottom: 0; gap: 6px; }
          .filter-item { width: 100%; }
          .filter-select { width: 100%; }
          .price-group { justify-content: center; }
          .filter-btn { width: 100%; justify-content: center; }
        }
      `}</style>

      {pick && (
        <div className="vm-backdrop" onClick={() => setPick(null)}>
          <div className="vm-card" onClick={e => e.stopPropagation()}>
            <div className="vm-head">
              <h3>{pick.name}</h3>
              <button className="vm-close" onClick={() => setPick(null)}>✕</button>
            </div>
            <div className="vm-body">
              <div className="vm-group">
                <label>Talla:</label>
                <div className="vm-chips">
                  {pickSizes.map(size => (
                    <button key={size} type="button"
                      className={`vm-chip ${pickSize === size ? 'vm-chip--active' : ''}`}
                      onClick={() => {
                        setPickSize(size);
                        const firstColor = pick.variants.find(v => v.size === size && v.stock > 0)?.color;
                        setPickColor(firstColor || '');
                      }}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="vm-group">
                <label>Color:</label>
                <div className="vm-chips">
                  {pickColors.map(color => {
                    const variant = pick.variants.find(v => v.size === pickSize && v.color === color);
                    return (
                      <button key={color} type="button"
                        className={`vm-chip ${pickColor === color ? 'vm-chip--active' : ''}`}
                        onClick={() => setPickColor(color)}>
                        <span className="vm-swatch" style={{ background: variant?.color_hex || '#6B7280' }} />
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="vm-group">
                <label>Cantidad:</label>
                <div className="vm-qty">
                  <button type="button" className="btn btn-sm btn-outline" disabled={pickQty <= 1} onClick={() => setPickQty(q => q - 1)}>−</button>
                  <span>{pickQty}</span>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => setPickQty(q => q + 1)}>+</button>
                </div>
              </div>
            </div>
            <div className="vm-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setPick(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={!pickColor || addingPick} onClick={confirmPick}>
                {addingPick ? 'Agregando...' : 'Agregar al carrito'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .vm-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(17,24,39,0.5);
          display: flex; align-items: center; justify-content: center;
          padding: 1rem;
        }
        .vm-card {
          width: min(440px, 95vw);
          background: white; border-radius: 16px; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.25);
        }
        .vm-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 16px 20px; border-bottom: 1px solid #F3F4F6;
        }
        .vm-head h3 { margin: 0; font-size: 1rem; font-weight: 700; color: #111827; }
        .vm-close { border: none; background: none; font-size: 1rem; color: #9CA3AF; cursor: pointer; }
        .vm-body { padding: 16px 20px; }
        .vm-group { margin-bottom: 14px; }
        .vm-group label { display: block; font-size: 0.8rem; font-weight: 600; color: #6B7280; margin-bottom: 6px; }
        .vm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .vm-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border: 2px solid #E5E7EB; border-radius: 8px;
          background: white; color: #374151; font-size: 0.8rem; font-weight: 600; cursor: pointer;
        }
        .vm-chip--active { border-color: #DC2626; background: #DC2626; color: white; }
        .vm-swatch { width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.1); }
        .vm-qty { display: flex; align-items: center; gap: 10px; }
        .vm-qty span { font-weight: 700; min-width: 20px; text-align: center; }
        .vm-foot {
          display: flex; justify-content: flex-end; gap: 8px;
          padding: 14px 20px; border-top: 1px solid #F3F4F6;
        }
      `}</style>
    </>
  );
};
