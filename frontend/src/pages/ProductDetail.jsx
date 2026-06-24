import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductDetail, fetchProductReviews, createReview, updateReview } from '../services/api';
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
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const usuario = (() => { try { return JSON.parse(localStorage.getItem('usuario')) } catch { return null } })();

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

  useEffect(() => {
    if (!id) return;
    const loadReviews = async () => {
      try {
        const data = await fetchProductReviews(id);
        setReviews(data);
      } catch {
        // silently fail
      } finally {
        setReviewLoading(false);
      }
    };
    loadReviews();
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

  const userReview = reviews.find(r => usuario && r.user === usuario.id);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewRating) return;
    setSubmittingReview(true);
    try {
      if (userReview) {
        await updateReview(userReview.id, reviewRating, reviewComment);
      } else {
        await createReview(id, reviewRating, reviewComment);
      }
      const data = await fetchProductReviews(id);
      setReviews(data);
      setReviewRating(0);
      setReviewComment('');
    } catch {
      // silently fail
    } finally {
      setSubmittingReview(false);
    }
  };

  function StarIcon({ filled }) {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill={filled ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }

  function StarRating({ rating, size = 16, interactive = false, onRate }) {
    return (
      <div className="rv-stars" style={{ display: 'inline-flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} onClick={() => interactive && onRate(star)}
            style={interactive ? { cursor: 'pointer' } : undefined}>
            <svg viewBox="0 0 24 24" width={size} height={size}
              fill={star <= rating ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </span>
        ))}
      </div>
    );
  }

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

            <div className="pd-reviews">
              <h3>Reseñas {product.total_reviews != null && <span className="rv-count">({product.total_reviews})</span>}</h3>
              {product.average_rating != null && (
                <div className="rv-summary">
                  <span className="rv-avg">{product.average_rating.toFixed(1)}</span>
                  <StarRating rating={Math.round(product.average_rating)} />
                  <span className="rv-total">{product.total_reviews} reseña{product.total_reviews !== 1 ? 's' : ''}</span>
                </div>
              )}
              {product.average_rating == null && !reviewLoading && (
                <p className="rv-empty">Este producto aún no tiene reseñas.</p>
              )}
              {reviewLoading && <p className="rv-loading">Cargando reseñas...</p>}

              {usuario ? (
                <form className="rv-form" onSubmit={handleSubmitReview}>
                  <label>Tu calificación:</label>
                  <StarRating rating={reviewRating} interactive onRate={setReviewRating} />
                  {!reviewRating && <span className="rv-form-hint">Selecciona una calificación</span>}
                  <textarea
                    placeholder="Comparte tu experiencia (opcional)"
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    maxLength={1000}
                    rows={3}
                  />
                  <Button type="submit" disabled={!reviewRating || submittingReview}>
                    {submittingReview ? 'Enviando...' : userReview ? 'Actualizar reseña' : 'Publicar reseña'}
                  </Button>
                  {userReview && <p className="rv-form-note">Ya has reseñado este producto. Puedes actualizar tu reseña.</p>}
                </form>
              ) : (
                <p className="rv-login-msg">
                  <Link to="/login">Inicia sesión</Link> para dejar una reseña.
                </p>
              )}

              {reviews.length > 0 && (
                <div className="rv-list">
                  {reviews.map(r => (
                    <div key={r.id} className="rv-item">
                      <div className="rv-item-header">
                        <strong className="rv-item-user">{r.user_name}</strong>
                        <StarRating rating={r.rating} />
                        <span className="rv-item-date">{new Date(r.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      {r.comment && <p className="rv-item-comment">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pd-share">
              <span className="pd-share-label">Compartir:</span>
              <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="pd-share-btn" title="Facebook">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(product.name)}&url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="pd-share-btn" title="Twitter">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent(product.name)}%20${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="pd-share-btn" title="WhatsApp">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(`${product.name}\n\n${window.location.href}`)}`} target="_blank" rel="noopener noreferrer" className="pd-share-btn" title="Email">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </a>
            </div>
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
        .pd-reviews { border-top: 1px solid var(--color-border); margin-top: 1.5rem; padding-top: 1.25rem; }
        .pd-reviews h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
        .rv-count { font-weight: 400; color: var(--color-text-muted); font-size: 0.85rem; }
        .rv-summary { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .rv-avg { font-size: 1.5rem; font-weight: 700; color: #F59E0B; line-height: 1; }
        .rv-total { font-size: 0.85rem; color: var(--color-text-muted); }
        .rv-empty, .rv-loading { color: var(--color-text-muted); font-size: 0.85rem; margin-bottom: 12px; }
        .rv-form { margin-bottom: 20px; padding: 16px; background: var(--color-bg-tertiary); border-radius: 10px; }
        .rv-form label { display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 6px; }
        .rv-form textarea { width: 100%; margin-top: 10px; margin-bottom: 10px; padding: 10px; border: 1px solid var(--color-border); border-radius: 8px; resize: vertical; font-family: inherit; font-size: 0.85rem; background: var(--color-bg); color: var(--color-text); }
        .rv-form textarea:focus { outline: none; border-color: var(--color-primary); }
        .rv-form-hint { font-size: 0.75rem; color: var(--color-text-muted); margin-left: 6px; }
        .rv-form-note { font-size: 0.75rem; color: var(--color-text-muted); margin-top: 8px; }
        .rv-login-msg { font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 16px; }
        .rv-login-msg a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
        .rv-list { display: flex; flex-direction: column; gap: 12px; }
        .rv-item { padding: 12px 14px; background: var(--color-bg-tertiary); border-radius: 10px; }
        .rv-item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .rv-item-user { font-size: 0.85rem; }
        .rv-item-date { font-size: 0.75rem; color: var(--color-text-muted); margin-left: auto; }
        .rv-item-comment { font-size: 0.85rem; color: var(--color-text-secondary); line-height: 1.5; margin: 4px 0 0; }
        .rv-stars { display: inline-flex; gap: 2px; align-items: center; }

        @media (max-width: 768px) {
          .rv-summary { flex-wrap: wrap; }
        }

        .pd-share { display: flex; align-items: center; gap: 10px; margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--color-border); }
        .pd-share-label { font-size: 0.85rem; font-weight: 600; color: var(--color-text-secondary); margin-right: 4px; }
        .pd-share-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--color-bg-tertiary); color: var(--color-text-secondary);
          transition: all 0.15s; text-decoration: none;
        }
        .pd-share-btn:hover { background: var(--color-primary); color: white; transform: translateY(-2px); }

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
