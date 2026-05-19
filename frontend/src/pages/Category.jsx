import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchCatalog } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { Button } from '../components/Button';
import { Header } from '../components/Header';

export const Category = () => {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    min_price: '',
    max_price: '',
    ordering: '',
    page: 1,
  });
  const [pageInfo, setPageInfo] = useState(null);
  const [categoryName, setCategoryName] = useState('Categoría');
  const [filtersData, setFiltersData] = useState({ categories: [] });
  const { cart, addItem } = useCart();

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCatalog({ ...filters, category: Number(id) });
      setProducts(data.results || data);
      setPageInfo(data.next ? { next: data.next, previous: data.previous, count: data.count } : null);
      if (data.filters) {
        setFiltersData(data.filters);
        const selected = data.filters.categories.find((category) => category.id === Number(id));
        setCategoryName(selected?.name || 'Categoría');
      }
    } catch (err) {
      console.error('Error al cargar categoría:', err);
      setError('No se pudo cargar la categoría.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filters, id]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value, page: 1 }));
  };

  const handleAddToCart = async (product) => {
    const variantId = product.variants?.[0]?.id;
    if (!variantId) {
      alert('Este producto no tiene variantes disponibles');
      return;
    }
    try {
      await addItem(product.id, variantId, 1);
      alert('Producto agregado al carrito');
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.quantity || 'Error al agregar al carrito';
      alert(msg);
    }
  };

  return (
    <>
      <Header isLoggedIn={Boolean(localStorage.getItem('access_token'))} cartCount={cart?.total_items || 0} />
      <div className="container" style={{ paddingTop: '2rem' }}>
        <Link to="/catalog" style={{ color: 'var(--color-red)', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
          ← Volver al catálogo
        </Link>
        <h1>{categoryName}</h1>
        <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
          Explora los productos disponibles para esta categoría. Usa filtros para encontrar rápido lo que necesitas.
        </p>

        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            name="q"
            placeholder="Buscar dentro de la categoría..."
            value={filters.q}
            onChange={handleFilterChange}
            className="form-input"
          />
          <select name="ordering" value={filters.ordering} onChange={handleFilterChange} className="form-input">
            <option value="">Ordenar por</option>
            <option value="name">Nombre (A-Z)</option>
            <option value="-name">Nombre (Z-A)</option>
            <option value="base_price">Precio (menor primero)</option>
            <option value="-base_price">Precio (mayor primero)</option>
            <option value="popularity">Popularidad</option>
          </select>
          <input
            type="number"
            name="min_price"
            placeholder="Precio min"
            value={filters.min_price}
            onChange={handleFilterChange}
            className="form-input"
          />
          <input
            type="number"
            name="max_price"
            placeholder="Precio max"
            value={filters.max_price}
            onChange={handleFilterChange}
            className="form-input"
          />
        </form>

        {loading ? (
          <p>Cargando productos...</p>
        ) : error ? (
          <p style={{ color: 'var(--color-red)' }}>{error}</p>
        ) : products.length === 0 ? (
          <p>No hay productos que coincidan con esta categoría.</p>
        ) : (
          <>
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    price: Number(product.base_price) || 0,
                    badge: product.is_new ? 'Nuevo' : null,
                    image: product.main_image || '👕',
                  }}
                  onView={(id) => window.location.href = `/product/${id}`}
                  onAdd={() => handleAddToCart(product)}
                />
              ))}
            </div>

            {pageInfo && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
                <Button
                  variant="outline"
                  disabled={!pageInfo.previous}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  Anterior
                </Button>
                <span>Página {filters.page}</span>
                <Button
                  variant="outline"
                  disabled={!pageInfo.next}
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
