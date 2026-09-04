import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fetchCatalog } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import ErrorState from '../components/ErrorState';
import { useCart } from '../context/CartContext';

export const Category = () => {
  const navigate = useNavigate()
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ q: '', min_price: '', max_price: '', ordering: '', page: 1 });
  const [pageInfo, setPageInfo] = useState(null);
  const [categoryName, setCategoryName] = useState('Categoría');
  const { addItem } = useCart();

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalog({ ...filters, category: Number(id) });
      setProducts(data.results || data);
      setPageInfo(data.next ? { next: data.next, previous: data.previous, count: data.count } : null);
      if (data.filters) {
        const selected = data.filters.categories.find((c) => c.id === Number(id));
        setCategoryName(selected?.name || 'Categoría');
      }
    } catch (err) {
      setError(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, id]);

  useEffect(() => {
    const t = setTimeout(() => { loadProducts() }, 0);
    return () => clearTimeout(t);
  }, [loadProducts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const _handleAddToCart = async (product) => {
    const variantId = product.variants?.[0]?.id;
    if (!variantId) { toast.error('Este producto no tiene variantes disponibles'); return }
    try {
      await addItem(product.id, variantId, 1);
      toast.success('Producto agregado al carrito');
    } catch (error) {
      toast.error(error.response?.data?.detail || error.response?.data?.quantity || 'Error al agregar al carrito');
    }
  };

  return (
    <>
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        <Link to="/catalog" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: 14, marginBottom: 16, display: 'inline-block' }}>
          ← Volver al catálogo
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>{categoryName}</h1>

        <form onSubmit={e => e.preventDefault()}
          style={{ display: 'flex', gap: 10, margin: '20 0', flexWrap: 'wrap', padding: 16, background: 'var(--color-bg-tertiary)', borderRadius: 12, border: '1px solid var(--color-border-light)', alignItems: 'center' }}>
          <input name="q" placeholder="Buscar..." value={filters.q} onChange={handleFilterChange}
            style={{ height: 40, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, flex: 1, minWidth: 140 }} />
          <select name="ordering" value={filters.ordering} onChange={handleFilterChange}
            style={{ height: 40, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, maxWidth: 160 }}>
            <option value="">Ordenar por</option>
            <option value="name">Nombre (A-Z)</option>
            <option value="-name">Nombre (Z-A)</option>
            <option value="base_price">Precio ↑</option>
            <option value="-base_price">Precio ↓</option>
          </select>
          <input name="min_price" type="number" placeholder="$ Min" value={filters.min_price} onChange={handleFilterChange}
            style={{ height: 40, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, maxWidth: 90 }} />
          <input name="max_price" type="number" placeholder="$ Max" value={filters.max_price} onChange={handleFilterChange}
            style={{ height: 40, padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 13, maxWidth: 90 }} />
        </form>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ borderRadius: 12, border: '1px solid var(--color-border-light)', animation: 'catPulse 1.5s infinite' }}>
                <div style={{ height: 200, background: 'var(--color-bg-tertiary)' }} />
                <div style={{ padding: 16 }}><div style={{ height: 14, background: 'var(--color-bg-tertiary)', borderRadius: 4, width: '70%' }} /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} module="categoría" onRetry={loadProducts} />
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No hay productos en esta categoría</h3>
            <p style={{ color: 'var(--color-text-muted)' }}>Intenta con otros filtros.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem' }}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: Number(product.base_price) || 0,
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
                  }}
                  onView={(id) => navigate(`/product/${id}`)}
                />
              ))}
            </div>
            {pageInfo && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 32, alignItems: 'center' }}>
                <button className="btn btn-outline" disabled={!pageInfo.previous}
                  onClick={() => setFilters(p => ({ ...p, page: p.page - 1 }))}>← Anterior</button>
                <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Página {filters.page}</span>
                <button className="btn btn-outline" disabled={!pageInfo.next}
                  onClick={() => setFilters(p => ({ ...p, page: p.page + 1 }))}>Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes catPulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
    </>
  );
};
