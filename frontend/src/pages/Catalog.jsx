import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCatalog, fetchProductDetail } from '../services/api';
import { ProductCard } from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { Button } from '../components/Button';
import { Header } from '../components/Header';

export const Catalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    min_price: '',
    max_price: '',
    ordering: '',
    page: 1,
  });
  const [filtersData, setFiltersData] = useState({
    categories: [],
    sizes: [],
    colors: [],
    price_range: { min: 0, max: 0 },
  });
  const [pageInfo, setPageInfo] = useState(null);
  const navigate = useNavigate();
  const { cart, addItem } = useCart();

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchCatalog(filters);
      setProducts(data.results || data);
      setPageInfo(data.next ? { next: data.next, previous: data.previous, count: data.count } : null);
      if (data.filters) {
        setFiltersData(data.filters);
      }
    } catch (error) {
      console.error('Error al cargar catálogo:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      q: '',
      category: '',
      min_price: '',
      max_price: '',
      ordering: '',
      page: 1,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: name === 'category' ? (value ? Number(value) : '') : value,
      page: 1,
    }));
  };

  const handleAddToCart = async (product) => {
    try {
      // Si el listado no incluye variantes, pedir el detalle antes de agregar
      let prod = product;
      if (!prod.variants) {
        prod = await fetchProductDetail(product.id);
      }
      const variantId = prod.variants?.find(v => v.stock > 0)?.id;
      if (!variantId) {
        alert('Este producto no tiene variantes disponibles');
        return;
      }
      await addItem(prod.id, variantId, 1);
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
        <h1>Catálogo</h1>

        {filtersData.categories.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {filtersData.categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => navigate(`/category/${category.id}`)}
              >
                {category.name}
              </button>
            ))}
            {filters.category && (
              <button type="button" className="btn btn-sm btn-secondary" onClick={handleResetFilters}>
                Limpiar categoría
              </button>
            )}
          </div>
        )}

        {/* Filtros */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            name="q"
            placeholder="Buscar..."
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
          <select name="category" value={filters.category} onChange={handleFilterChange} className="form-input">
            <option value="">Todas las categorías</option>
            {filtersData.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
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
          <Button type="submit">Buscar</Button>
        </form>

        {loading ? (
          <p>Cargando productos...</p>
        ) : products.length === 0 ? (
          <p>No se encontraron productos con esos filtros.</p>
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
                  onView={(id) => navigate(`/product/${id}`)}
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