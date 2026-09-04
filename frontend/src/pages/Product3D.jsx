import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { fetchProductDetail } from '../services/api';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { useCart } from '../context/CartContext';
import ErrorState from '../components/ErrorState';

export const Product3D = () => {
  const { id } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const mode = params.get('mode') || 'view';
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const { cart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const data = await fetchProductDetail(id);
        setProduct(data);
        const firstAvailable = data.variants?.find((v) => v.stock > 0);
        if (firstAvailable) {
          setSelectedSize(firstAvailable.size);
          setSelectedColor(firstAvailable.color);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const sizes = [...new Set(product?.variants?.map(v => v.size) || [])];
  const colors = [...new Set(product?.variants?.filter(v => v.size === selectedSize).map(v => v.color) || [])];

  function selectSize(size) {
    setSelectedSize(size);
    const firstColor = product?.variants?.find(v => v.size === size)?.color;
    setSelectedColor(firstColor || '');
  }

  const selectedVariant = product?.variants?.find(v => v.size === selectedSize && v.color === selectedColor);

  const openEditor = () => {
    const base = 'http://127.0.0.1:5174/';
    const qs = new URLSearchParams({ mode });
    if (id) qs.set('productId', id);
    if (selectedVariant) {
      qs.set('variantId', String(selectedVariant.id));
      if (selectedVariant.color_hex) qs.set('color', selectedVariant.color_hex);
      qs.set('colorName', selectedVariant.color);
    }
    window.open(`${base}?${qs.toString()}`, '_blank');
  };

  return (
    <>
      <Header cartCount={cart?.total_items || 0} />
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <Link to={`/product/${id}`} style={{ color: 'var(--color-red)', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}>
          ← Volver al producto
        </Link>
        <div style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-gray-200)', backgroundColor: 'var(--color-white)' }}>
          <h1 style={{ marginBottom: '0.75rem' }}>Vista 3D del producto</h1>
          <p style={{ color: 'var(--color-gray-600)', marginBottom: '1.5rem' }}>
            {product ? (
              mode === 'edit' ? `Editando modelo 3D de ${product.name}.` : mode === 'new' ? `Crear nuevo modelo 3D pre-cargado con ${product.name}.` : `Trabajando con ${product.name}.`
            ) : 'Cargando el producto...'}
          </p>
          {error && <ErrorState error={error} module="modelo 3D" />}
          {product?.variants?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Variante para el modelo:</p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <select value={selectedSize} onChange={e => selectSize(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-gray-300)' }}>
                  {sizes.map(s => (
                    <option key={s} value={s}>Talla {s}</option>
                  ))}
                </select>
                <select value={selectedColor} onChange={e => setSelectedColor(e.target.value)} style={{ padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid var(--color-gray-300)' }}>
                  {colors.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {selectedVariant?.color_hex && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--color-gray-200)',
                  }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: selectedVariant.color_hex, border: '1px solid rgba(0,0,0,0.1)', display: 'inline-block' }} />
                    {selectedVariant.color_hex}
                  </span>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '420px' }}>
            <Button size="lg" onClick={openEditor}>
              Abrir Editor 3D
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = '/catalog'}>
              Volver al catálogo
            </Button>
          </div>
          <div style={{ marginTop: '1.75rem', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>
            <p>Este enlace abre el editor 3D existente y le indica la variante (talla/color) seleccionada, sin modificar las texturas del producto en este paso.</p>
            <p>Si aún no ejecutas el microservicio 3D, levanta <code>npm run dev</code> dentro de <code>microservices/Tshirt3D</code> para tener acceso.</p>
          </div>
        </div>
      </div>
    </>
  );
};
