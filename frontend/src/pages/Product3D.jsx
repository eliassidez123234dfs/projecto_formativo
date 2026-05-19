import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { fetchProductDetail } from '../services/api';
import { Header } from '../components/Header';
import { Button } from '../components/Button';
import { useCart } from '../context/CartContext';

export const Product3D = () => {
  const { id } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const mode = params.get('mode') || 'view';
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { cart } = useCart();

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const data = await fetchProductDetail(id);
        setProduct(data);
      } catch (err) {
        console.error(err);
        setError('No se pudo cargar el producto para el modelo 3D.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProduct();
    }
  }, [id]);

  const openEditor = () => {
    const base = 'http://localhost:4173/';
    const url = `${base}?mode=${encodeURIComponent(mode)}${id ? `&productId=${encodeURIComponent(id)}` : ''}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <Header isLoggedIn={Boolean(localStorage.getItem('access_token'))} cartCount={cart?.total_items || 0} />
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
          {error && <p style={{ color: 'var(--color-red)', marginBottom: '1rem' }}>{error}</p>}
          <div style={{ display: 'grid', gap: '1rem', maxWidth: '420px' }}>
            <Button size="lg" onClick={openEditor}>
              Abrir Editor 3D
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = '/catalog'}>
              Volver al catálogo
            </Button>
          </div>
          <div style={{ marginTop: '1.75rem', color: 'var(--color-gray-600)', lineHeight: 1.7 }}>
            <p>Este enlace abre el editor 3D existente. No se realizan modificaciones a las texturas del producto en este paso.</p>
            <p>Si aún no ejecutas el microservicio 3D, levanta <code>npm run dev</code> dentro de <code>microservices/Tshirt3D</code> para tener acceso.</p>
          </div>
        </div>
      </div>
    </>
  );
};
