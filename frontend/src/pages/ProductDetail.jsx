import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductDetail } from '../services/api';
import { useCart } from '../context/CartContext';
import { Button } from '../components/Button';
import { Header } from '../components/Header';

export const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { cart, addItem } = useCart();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const data = await fetchProductDetail(id);
        setProduct(data);
        // Si hay variantes, seleccionar la primera con stock por defecto
        const firstAvailable = data.variants?.find((v) => v.stock > 0);
        if (firstAvailable) {
          setSelectedVariantId(firstAvailable.id);
          setQuantity(1);
        }
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el producto.');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  const selectedVariant = product?.variants?.find((v) => v.id === Number(selectedVariantId));

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAdding(true);
    try {
      await addItem(product.id, selectedVariant.id, quantity);
      alert('Producto agregado al carrito');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.quantity || 'Error al agregar al carrito';
      alert(msg);
    } finally {
      setAdding(false);
    }
  };

  // Cambia la cantidad, respetando el stock de la variante seleccionada
  const handleQuantityChange = (newQty) => {
    const stock = selectedVariant?.stock || 1;
    if (newQty >= 1 && newQty <= stock) {
      setQuantity(newQty);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
        <p>Cargando producto...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'red' }}>{error || 'Producto no encontrado'}</p>
        <Link to="/catalog" style={{ color: 'var(--color-red)' }}>Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <>
      <Header isLoggedIn={Boolean(localStorage.getItem('access_token'))} cartCount={cart?.total_items || 0} />
      <div className="container" style={{ paddingTop: 'var(--spacing-2xl)', paddingBottom: '4rem' }}>
        <Link to="/catalog" style={{ color: 'var(--color-red)', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
          ← Volver al catálogo
        </Link>

        {product.categories?.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {product.categories.map((category) => (
              <span key={category} style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', background: 'var(--color-gray-100)', borderRadius: '999px' }}>
                {category}
              </span>
            ))}
          </div>
        )}

        <div className="product-detail" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '1rem' }}>
        {/* Galería de imágenes */}
        <div className="product-gallery">
          <div
            className="main-image"
            style={{
              width: '100%',
              aspectRatio: '1',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              overflow: 'hidden',
              marginBottom: '1rem',
            }}
          >
            {product.images?.length > 0 ? (
              <img
                src={product.images[0].image_url}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : product.main_image ? (
              <img
                src={product.main_image}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              '👕'
            )}
          </div>

          {product.images?.length > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {product.images.map((img) => (
                <div
                  key={img.id}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: img.id === product.images[0].id ? '2px solid var(--color-red)' : '2px solid transparent',
                  }}
                  onClick={() => {
                    // Opcional: cambiar imagen principal al hacer clic (puede implementarse con estado)
                  }}
                >
                  <img
                    src={img.image_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="product-info-section">
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', marginBottom: '0.5rem' }}>{product.name}</h1>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-red)', marginBottom: '1.5rem' }}>
            ${Number(product.base_price).toFixed(2)}
          </p>
          <p style={{ color: 'var(--color-gray-600)', lineHeight: 1.8, marginBottom: '2rem' }}>
            {product.description}
          </p>

          {/* Checklist de publicación (opcional, solo visible si no está listo) */}
          {!product.ready_to_publish && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem' }}>
              <p style={{ color: '#991B1B', fontWeight: 600, marginBottom: '0.5rem' }}>⚠️ Producto no publicable</p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#991B1B' }}>
                {(() => {
                  const checklist = product.checklist;
                  if (!checklist) return null;
                  if (Array.isArray(checklist)) {
                    return checklist.map((item, idx) => (
                      <li key={idx} style={{ fontSize: '0.9rem' }}>{item}</li>
                    ));
                  }
                  if (typeof checklist === 'object') {
                    const labels = {
                      name: 'Nombre',
                      description: 'Descripción',
                      main_image: 'Imagen principal',
                      variant_with_stock: 'Variante con stock',
                      ready_to_publish: 'Listo para publicar',
                    };
                    return Object.entries(checklist).map(([key, val]) => (
                      <li key={key} style={{ fontSize: '0.9rem' }}>
                        {labels[key] || key}: {val ? '✓' : '✗'}
                      </li>
                    ));
                  }
                  return null;
                })()}
              </ul>
            </div>
          )}

          {/* Selector de variante */}
          {product.variants?.length > 0 ? (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Selecciona talla y color:</label>
              <select
                className="form-input"
                value={selectedVariantId}
                onChange={(e) => {
                  setSelectedVariantId(e.target.value);
                  setQuantity(1);
                }}
                style={{ width: '100%' }}
              >
                {product.variants.map((variant) => (
                  <option key={variant.id} value={variant.id} disabled={variant.stock === 0}>
                    {variant.display_label} {variant.stock === 0 ? '(agotado)' : `(${variant.stock} disponible/s)`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p style={{ color: 'var(--color-gray-500)' }}>No hay variantes disponibles para este producto.</p>
          )}

          {/* Cantidad */}
          {selectedVariant && selectedVariant.stock > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Cantidad:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={quantity <= 1}
                  onClick={() => handleQuantityChange(quantity - 1)}
                >
                  −
                </Button>
                <span style={{ fontWeight: 600, minWidth: '2rem', textAlign: 'center' }}>{quantity}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={quantity >= selectedVariant.stock}
                  onClick={() => handleQuantityChange(quantity + 1)}
                >
                  +
                </Button>
              </div>
            </div>
          )}

          {/* Botones del modelo 3D: ver, editar o crear desde cero */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = `/product/${id}/3d?mode=view`}
            >
              Ver Modelo 3D
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.location.href = `/product/${id}/3d?mode=edit`}
            >
              Editar Modelo 3D
            </Button>
            <Button
              size="lg"
              onClick={() => window.location.href = `/product/${id}/3d?mode=new`}
            >
              Crear en 3D (usar este producto)
            </Button>
          </div>

          {/* Botón agregar al carrito */}
          <Button
            size="lg"
            onClick={handleAddToCart}
            disabled={!selectedVariant || selectedVariant.stock === 0 || adding}
          >
            {adding ? 'Agregando...' : 'Agregar al Carrito'}
          </Button>

          {/* Mensaje de publicación (si existe) */}
          {product.publication_message && (
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-gray-500)' }}>
              {product.publication_message}
            </p>
          )}
        </div>
      </div>
    </div>
    </>
  );
};