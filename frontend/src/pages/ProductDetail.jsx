import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductDetail } from '../services/api';
import { useCart } from '../context/CartContext';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { DEFAULT_IMAGE } from '../constants';

export const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const { cart, addItem } = useCart();
  const [adding, setAdding] = useState(false);
  const [mainImage, setMainImage] = useState(null);

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
          setQuantity(1);
        }
        const img = data.images?.[0]?.image_url || data.main_image || null;
        setMainImage(img);
      } catch (err) {
        setError('No se pudo cargar el producto.');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [id]);

  const sizes = [...new Set(product?.variants?.map(v => v.size) || [])];

  const colorsInSize = product?.variants?.filter(v => v.size === selectedSize) || [];
  const colors = [...new Set(colorsInSize.map(v => v.color))];

  const selectedVariant = product?.variants?.find(v => v.size === selectedSize && v.color === selectedColor);

  function selectSize(size) {
    setSelectedSize(size);
    const firstColor = product?.variants?.find(v => v.size === size)?.color;
    setSelectedColor(firstColor || '');
    setQuantity(1);
  }

  function selectColor(color) {
    setSelectedColor(color);
    setQuantity(1);
  }

  function variantStock(size, color) {
    return product?.variants?.find(v => v.size === size && v.color === color)?.stock || 0;
  }

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

  const handleQuantityChange = (newQty) => {
    const stock = selectedVariant?.stock || 1;
    if (newQty >= 1 && newQty <= stock) setQuantity(newQty);
  };

  function colorToHex(color) {
    const map = {
      rojo: '#DC2626', rojo_oscuro: '#991B1B', rojo_claro: '#FCA5A5',
      azul: '#2563EB', azul_oscuro: '#1E3A5F', azul_claro: '#93C5FD',
      verde: '#16A34A', verde_oscuro: '#166534', verde_claro: '#86EFAC',
      negro: '#111827', gris: '#6B7280', gris_claro: '#D1D5DB',
      blanco: '#FFFFFF', crema: '#FEF3C7', beige: '#F5F5DC',
      amarillo: '#EAB308', naranja: '#EA580C', morado: '#9333EA',
      rosa: '#EC4899', cafe: '#78350F', dorado: '#D97706',
      plateado: '#9CA3AF', marino: '#1E3A5F', vino: '#7F1D1D',
    };
    return map[color.toLowerCase().replace(/\s+/g, '_')] || '#6B7280';
  }

  const r = 'var(--color-primary)';

  if (loading) {
    return (
      <>
        <Header cartCount={0} />
        <div className="container pd-skeleton">
          <div className="pd-sk-gallery" />
          <div className="pd-sk-info">
            <div className="pd-sk-line" style={{ width: '65%', height: 28 }} />
            <div className="pd-sk-line" style={{ width: '35%', height: 32, marginTop: 16 }} />
            <div className="pd-sk-line" style={{ width: '100%', height: 72, marginTop: 20 }} />
            <div className="pd-sk-line" style={{ width: '50%', height: 44, marginTop: 28 }} />
          </div>
        </div>
        <style>{`
          .pd-skeleton { display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; padding-top: 2rem; padding-bottom: 4rem; }
          .pd-sk-gallery { aspect-ratio: 1; background: var(--color-bg-tertiary); border-radius: 12px; animation: skPulse 1.5s ease-in-out infinite; }
          .pd-sk-info { display: flex; flex-direction: column; }
          .pd-sk-line { background: var(--color-bg-tertiary); border-radius: 6px; animation: skPulse 1.5s ease-in-out infinite; }
          @keyframes skPulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }
        `}</style>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Header cartCount={0} />
        <div className="container" style={{ paddingTop: '3rem', textAlign: 'center' }}>
          <p style={{ color: r, marginBottom: 16 }}>{error || 'Producto no encontrado'}</p>
          <Link to="/catalog" className="btn btn-primary" style={{ textDecoration: 'none' }}>Volver al catálogo</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header cartCount={cart?.total_items || 0} />
      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '4rem' }}>
        <Link to="/catalog" style={{ color: r, textDecoration: 'none', fontSize: 13, fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Volver al catálogo
        </Link>

        <div className="pd-layout">
          <div className="pd-gallery">
            <div className="pd-main-image">
              {mainImage ? (
                <img src={mainImage} alt={product.name} onError={(e) => { e.target.src = DEFAULT_IMAGE; e.target.style.objectFit = 'contain'; }} />
              ) : (
                <img src={DEFAULT_IMAGE} alt="" />
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="pd-thumbs">
                {product.images.map((img) => (
                  <button key={img.id} className={`pd-thumb ${img.image_url === mainImage ? 'active' : ''}`}
                    onClick={() => setMainImage(img.image_url)}>
                    <img src={img.image_url} alt="" />
                  </button>
                ))}
                {product.main_image && !product.images?.some(i => i.image_url === product.main_image) && (
                  <button className={`pd-thumb ${mainImage === product.main_image ? 'active' : ''}`}
                    onClick={() => setMainImage(product.main_image)}>
                    <img src={product.main_image} alt="" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pd-info">
            {product.categories?.length > 0 && (
              <div className="pd-cats">
                {product.categories.map((cat) => (
                  <span key={cat}>{cat}</span>
                ))}
              </div>
            )}

            <h1 className="pd-name">{product.name}</h1>
            <p className="pd-price">${Number(product.base_price).toFixed(2)}</p>

            {product.variants?.length > 0 ? (
              <div className="pd-variant-selector">
                <div className="pd-variant-group">
                  <label>Talla:</label>
                  <div className="pd-variant-chips">
                    {sizes.map(size => {
                      const hasStock = product.variants.some(v => v.size === size && v.stock > 0);
                      return (
                        <button key={size}
                          className={`pd-chip ${selectedSize === size ? 'pd-chip--active' : ''} ${!hasStock ? 'pd-chip--disabled' : ''}`}
                          onClick={() => hasStock && selectSize(size)}
                          disabled={!hasStock}>
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="pd-variant-group">
                  <label>Color:</label>
                  <div className="pd-variant-chips">
                    {colors.map(color => {
                      const stock = variantStock(selectedSize, color);
                      return (
                        <button key={color}
                          className={`pd-chip ${selectedColor === color ? 'pd-chip--active' : ''} ${stock === 0 ? 'pd-chip--disabled' : ''}`}
                          onClick={() => stock > 0 && selectColor(color)}
                          disabled={stock === 0}>
                          <span className="pd-chip-color" style={{ background: colorToHex(color) }} />
                          {color}
                          {stock === 0 && <span className="pd-chip-agotado">Agotado</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {selectedVariant && (
                  <div className="pd-selected-info">
                    {selectedVariant.stock > 0
                      ? <span className="pd-stock-ok">Stock disponible: {selectedVariant.stock} unidades</span>
                      : <span className="pd-stock-no">Producto agotado</span>
                    }
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>No hay variantes disponibles para este producto.</p>
            )}

            {selectedVariant && selectedVariant.stock > 0 && (
              <div className="pd-qty">
                <label>Cantidad:</label>
                <div className="pd-qty-controls">
                  <button className="btn btn-sm btn-outline" disabled={quantity <= 1} onClick={() => handleQuantityChange(quantity - 1)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <span>{quantity}</span>
                  <button className="btn btn-sm btn-outline" disabled={quantity >= selectedVariant.stock} onClick={() => handleQuantityChange(quantity + 1)}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                </div>
              </div>
            )}

            <div className="pd-actions">
              <Button size="lg" onClick={handleAddToCart}
                disabled={!selectedVariant || selectedVariant.stock === 0 || adding}
                style={{ flex: 1 }}>
                {adding ? 'Agregando...' : 'Agregar al Carrito'}
              </Button>
              <Button size="lg" variant="outline"
                onClick={() => window.location.href = `/product/${id}/3d?mode=view`}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                3D
              </Button>
            </div>

            {product.description && (
              <div className="pd-description">
                <h3>Descripción</h3>
                <p>{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {product.related_products?.length > 0 && (
          <div className="pd-related">
            <h2>Productos Relacionados</h2>
            <div className="pd-related-grid">
              {product.related_products.map((rp) => (
                <Link key={rp.id} to={`/product/${rp.id}`} className="pd-related-card">
                  <div className="pd-related-img">
                    <img src={rp.main_image || DEFAULT_IMAGE} alt={rp.name} onError={(e) => { e.target.src = DEFAULT_IMAGE }} />
                  </div>
                  <div className="pd-related-info">
                    <p className="pd-related-name">{rp.name}</p>
                    <p className="pd-related-price">${Number(rp.base_price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .pd-layout {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 3rem;
          margin-top: 1.5rem;
        }
        .pd-gallery { position: sticky; top: 88px; align-self: start; }
        .pd-main-image {
          aspect-ratio: 1;
          background: #FAFAFA;
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--color-border);
        }
        .pd-main-image img { width: 100%; height: 100%; object-fit: cover; }
        .pd-thumbs { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .pd-thumb {
          width: 56px; height: 56px; border-radius: 8px; overflow: hidden;
          border: 2px solid transparent; cursor: pointer; padding: 0; background: none;
          transition: border-color 0.15s;
        }
        .pd-thumb.active { border-color: #DC2626; }
        .pd-thumb img { width: 100%; height: 100%; object-fit: cover; }
        .pd-cats { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
        .pd-cats span {
          font-size: 0.75rem; padding: 4px 10px;
          background: var(--color-bg-tertiary); border-radius: 999px;
          color: var(--color-text-secondary);
        }
        .pd-name { font-size: 1.75rem; font-weight: 700; margin-bottom: 8px; line-height: 1.2; }
        .pd-price { font-size: 1.5rem; font-weight: 700; color: #DC2626; margin-bottom: 1.5rem; }
        .pd-variant-selector { margin-bottom: 1.5rem; }
        .pd-variant-group { margin-bottom: 1rem; }
        .pd-variant-group label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; color: var(--color-text-secondary); }
        .pd-variant-chips { display: flex; gap: 8px; flex-wrap: wrap; }
        .pd-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 18px; border: 2px solid var(--color-border);
          border-radius: 8px; background: var(--color-bg); color: var(--color-text);
          font-size: 0.85rem; font-weight: 500; cursor: pointer;
          transition: all 0.15s ease; user-select: none;
        }
        .pd-chip:hover:not(.pd-chip--disabled) { border-color: var(--color-primary); color: var(--color-primary); }
        .pd-chip--active { border-color: var(--color-primary); background: var(--color-primary); color: white; }
        .pd-chip--active:hover { background: var(--color-primary-dark); border-color: var(--color-primary-dark); color: white; }
        .pd-chip--disabled { opacity: 0.4; cursor: not-allowed; text-decoration: line-through; }
        .pd-chip-color {
          display: inline-block; width: 14px; height: 14px; border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1); flex-shrink: 0;
        }
        .pd-chip--active .pd-chip-color { border-color: rgba(255,255,255,0.3); }
        .pd-chip-agotado { font-size: 0.65rem; color: var(--color-error); font-weight: 600; margin-left: 2px; }
        .pd-selected-info {
          margin-top: 10px; padding: 10px 14px;
          background: var(--color-bg-tertiary); border-radius: 8px;
          font-size: 0.85rem;
        }
        .pd-stock-ok { color: var(--color-success); font-weight: 500; }
        .pd-stock-no { color: var(--color-error); font-weight: 500; }
        .pd-qty { margin-bottom: 1.5rem; }
        .pd-qty label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 6px; }
        .pd-qty-controls { display: flex; align-items: center; gap: 12px; }
        .pd-qty-controls span { font-weight: 600; min-width: 24px; text-align: center; }
        .pd-actions { display: flex; gap: 8px; margin-bottom: 1.5rem; }
        .pd-description { border-top: 1px solid var(--color-border); padding-top: 1.25rem; }
        .pd-description h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 8px; }
        .pd-description p { font-size: 0.9rem; color: var(--color-text-secondary); line-height: 1.7; }

        .pd-related { border-top: 1px solid var(--color-border); margin-top: 3rem; padding-top: 2rem; }
        .pd-related h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; }
        .pd-related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }
        .pd-related-card {
          text-decoration: none; border-radius: 10px; overflow: hidden;
          border: 1px solid var(--color-border); transition: box-shadow 0.15s;
        }
        .pd-related-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .pd-related-img { aspect-ratio: 1; background: #FAFAFA; }
        .pd-related-img img { width: 100%; height: 100%; object-fit: cover; }
        .pd-related-info { padding: 10px 12px; }
        .pd-related-name { font-size: 0.85rem; font-weight: 600; color: var(--color-text); margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .pd-related-price { font-size: 0.85rem; font-weight: 700; color: #DC2626; margin: 0; }

        @media (max-width: 768px) {
          .pd-layout { grid-template-columns: 1fr; gap: 2rem; }
          .pd-gallery { position: static; }
          .pd-name { font-size: 1.35rem; }
          .pd-price { font-size: 1.25rem; }
          .pd-actions { flex-direction: column; }
          .pd-skeleton { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
};
