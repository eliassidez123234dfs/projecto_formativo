/**
 * ProductCard — Tarjeta visual de producto en el catálogo.
 * Muestra imagen, nombre, precio, indicador de stock y botones de acción
 * (ver detalle, vista 3D, agregar al carrito). Al hacer clic en "Agregar"
 * abre un modal con selección de talla, color y cantidad.
 */
import { useState, useEffect, useRef } from 'react';
import { DEFAULT_IMAGE } from '../constants';
import { getCurrentUser } from '../services/authService';
import toast from 'react-hot-toast';

const COLOR_HEX_MAP = {
  rojo: '#DC2626', azul: '#2563EB', negro: '#111827', blanco: '#F9FAFB',
  gris: '#6B7280', verde: '#16A34A', amarillo: '#EAB308', naranja: '#EA580C',
  rosa: '#EC4899', morado: '#7C3AED', marrón: '#92400E', beige: '#D6BCA8',
  plateado: '#9CA3AF', dorado: '#D4A843',
}
import { fetchProductDetail } from '../services/api';
import { useCart } from '../context/CartContext';

/**
 * @param {{ product: Object, onView: (id: number) => void }}
 */
export const ProductCard = ({ product, onView }) => {
  const { addItem } = useCart();
  const [showModal, setShowModal] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [variants, setVariants] = useState([]);
  const [loadingVariant, setLoadingVariant] = useState(false);
  const modalRef = useRef(null);

  const usuario = getCurrentUser();
  const isAdmin = usuario?.rol === 'Administrador' || usuario?.is_superuser;

  const imgSrc = product.image || DEFAULT_IMAGE;
  const stock = product.stock_total ?? null;

  function stockBadge() {
    if (stock === null) return null;
    if (stock >= 5) return { label: `Stock: ${stock} unidades`, cls: 'pc-stock-ok' };
    if (stock > 0) return { label: 'Últimas unidades', cls: 'pc-stock-warn' };
    return { label: 'Agotado', cls: 'pc-stock-no' };
  }

  const badge = stockBadge();

  const sizes = product.variants_summary?.sizes || product.available_sizes || [];
  const colors = product.variants_summary?.colors || product.available_colors || [];

  function availableSizes() {
    if (!selectedColor || !variants.length) return sizes;
    const sizesWithColor = variants.filter(v => v.color === selectedColor && v.stock > 0).map(v => v.size);
    return [...new Set(sizesWithColor)];
  }

  function availableColors() {
    if (!selectedSize || !variants.length) return colors;
    const colorsWithSize = variants.filter(v => v.size === selectedSize && v.stock > 0).map(v => v.color);
    return [...new Set(colorsWithSize)];
  }

  const matchedVariant = variants.find(v => v.size === selectedSize && v.color === selectedColor) || null;
  const displayPrice = matchedVariant?.precio_variante
    ? Number(matchedVariant.precio_variante)
    : Number(product.base_price || product.price);
  const maxStock = matchedVariant?.stock || 1;

  async function openModal() {
    setShowModal(true);
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
    setVariants([]);
    if (!variants.length) {
      setLoadingVariant(true);
      try {
        const detail = await fetchProductDetail(product.id);
        setVariants(detail.variants || []);
      } catch {
        setVariants([]);
      } finally {
        setLoadingVariant(false);
      }
    }
  }

  function closeModal() {
    setShowModal(false);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    }
    if (showModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showModal]);

  async function handleSubmit() {
    if (!selectedSize || !selectedColor || !matchedVariant) return;
    try {
      await addItem(product.id, matchedVariant.id, quantity);
      toast.success('Producto agregado al carrito');
      closeModal();
    } catch (error) {
      const msg = error.response?.data?.detail || error.response?.data?.quantity || 'Error al agregar al carrito';
      toast.error(msg);
    }
  }

  return (
    <div className="pc-wrap">
      <div className="pc-img-box">
        {product.badge && <span className="pc-badge">{product.badge}</span>}
        {badge && isAdmin && <span className={`pc-stock-badge ${badge.cls}`}>{badge.label}</span>}
        <img src={imgSrc} alt={product.name} onError={(e) => { e.target.src = DEFAULT_IMAGE }} className="pc-img" />
        <div className="pc-img-shine" />
      </div>
      <div className="pc-body">
        <p className="pc-name">{product.name}</p>
        <p className="pc-price">${product.price.toFixed(2)}</p>
        {product.average_rating != null && (
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="12" height="12" viewBox="0 0 24 24"
                fill={s <= Math.round(product.average_rating) ? '#F59E0B' : 'none'}
                stroke="#F59E0B" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
            {product.total_reviews > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#9CA3AF', marginLeft: 2 }}>({product.total_reviews})</span>
            )}
          </div>
        )}
        {product.available_colors && product.available_colors.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
            {product.available_colors.slice(0, 6).map(c => (
              <span key={c} style={{
                width: 16, height: 16, borderRadius: '50%',
                display: 'inline-block',
                background: COLOR_HEX_MAP[c.toLowerCase()] || '#ccc',
                border: '2px solid #E5E7EB',
              }} title={c} />
            ))}
          </div>
        )}
        <div className="pc-actions">
          <button className="pc-act pc-act--view" onClick={() => onView(product.id)}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Ver
          </button>
          <button className="pc-act pc-act--3d" onClick={() => window.location.href = `/product/${product.id}/3d?mode=new`}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            3D
          </button>
          <button className="pc-act pc-act--add" onClick={openModal} disabled={!stock || stock === 0}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar
          </button>
        </div>
      </div>

      {showModal && (
        <div className="pc-modal-overlay">
          <div className="pc-modal" ref={modalRef}>
            <button className="pc-modal-close" onClick={closeModal}>&times;</button>
            <div className="pc-modal-content">
              <div className="pc-modal-left">
                <img src={imgSrc} alt={product.name} className="pc-modal-img" />
              </div>
              <div className="pc-modal-right">
                <h3 className="pc-modal-title">{product.name}</h3>
                <p className="pc-modal-price">${displayPrice.toFixed(2)}</p>

                {loadingVariant ? (
                  <p className="pc-modal-loading">Cargando variantes...</p>
                ) : (
                  <>
                    <div className="pc-modal-field">
                      <label className="pc-modal-label">Talla</label>
                      <div className="pc-modal-chips">
                        {availableSizes().map(s => (
                          <button
                            key={s}
                            className={`pc-chip ${selectedSize === s ? 'pc-chip--active' : ''}`}
                            onClick={() => { setSelectedSize(s); setQuantity(1); }}
                          >{s}</button>
                        ))}
                      </div>
                    </div>

                    <div className="pc-modal-field">
                      <label className="pc-modal-label">Color</label>
                      <div className="pc-modal-chips">
                        {availableColors().map(c => (
                          <button
                            key={c}
                            className={`pc-chip ${selectedColor === c ? 'pc-chip--active' : ''}`}
                            onClick={() => { setSelectedColor(c); setQuantity(1); }}
                          >{c}</button>
                        ))}
                      </div>
                    </div>

                    <div className="pc-modal-field">
                      <label className="pc-modal-label">Cantidad</label>
                      <div className="pc-modal-qty">
                        <button
                          className="pc-qty-btn"
                          onClick={() => setQuantity(q => Math.max(1, q - 1))}
                          disabled={quantity <= 1}
                        >−</button>
                        <span className="pc-qty-value">{quantity}</span>
                        <button
                          className="pc-qty-btn"
                          onClick={() => setQuantity(q => Math.min(maxStock, q + 1))}
                          disabled={quantity >= maxStock}
                        >+</button>
                      </div>
                    </div>

                    {matchedVariant && (
                      isAdmin && <p className="pc-modal-stock">Stock disponible: {matchedVariant.stock}</p>
                    )}

                    <button
                      className="pc-modal-submit"
                      disabled={!selectedSize || !selectedColor || !matchedVariant}
                      onClick={handleSubmit}
                    >Agregar al carrito</button>
                  </>
                )}

                <button className="pc-modal-cancel" onClick={closeModal}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .pc-wrap {
          border-radius: 16px;
          overflow: hidden;
          border: 2px solid #F3F4F6;
          background: white;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: all 0.25s;
          position: relative;
        }

        .pc-wrap:hover {
          box-shadow: 0 16px 48px rgba(0,0,0,0.1);
          transform: scale(1.03);
        }

        .pc-img-box {
          position: relative;
          aspect-ratio: 1;
          background: linear-gradient(135deg, #FAFAFA, #F3F4F6);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .pc-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s;
        }

        .pc-wrap:hover .pc-img {
          transform: scale(1.06);
        }

        .pc-img-shine {
          position: absolute;
          inset: 0;
          background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%);
          opacity: 0;
          transition: opacity 0.4s;
          pointer-events: none;
        }

        .pc-wrap:hover .pc-img-shine {
          opacity: 1;
        }

        .pc-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          z-index: 2;
          padding: 4px 12px;
          background: linear-gradient(135deg, #DC2626, #EF4444);
          color: white;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(220,38,38,0.3);
        }

        .pc-body {
          padding: 18px 16px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .pc-name {
          margin: 0 0 6px;
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pc-price {
          margin: 0 0 16px;
          font-size: 1.35rem;
          font-weight: 800;
          color: #DC2626;
          letter-spacing: -0.3px;
        }

        .pc-actions {
          display: flex;
          gap: 6px;
          margin-top: auto;
        }

        .pc-act {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 9px 6px;
          border-radius: 10px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          border: none;
        }

        .pc-act:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pc-act--view {
          background: #F3F4F6;
          color: #374151;
        }

        .pc-act--view:hover {
          background: #E5E7EB;
        }

        .pc-act--3d {
          background: #EFF6FF;
          color: #2563EB;
        }

        .pc-act--3d:hover {
          background: #DBEAFE;
        }

        .pc-act--add {
          background: linear-gradient(135deg, #DC2626, #EF4444);
          color: white;
          box-shadow: 0 3px 10px rgba(220,38,38,0.25);
        }

        .pc-act--add:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(220,38,38,0.3);
        }

        .pc-act--add:active:not(:disabled) {
          transform: translateY(0);
        }

        .pc-stock-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(0,0,0,0.15);
        }

        .pc-stock-ok {
          background: #16A34A;
          color: white;
        }

        .pc-stock-warn {
          background: #EA580C;
          color: white;
        }

        .pc-stock-no {
          background: #DC2626;
          color: white;
        }

        .pc-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .pc-modal {
          background: white;
          border-radius: 20px;
          max-width: 520px;
          width: 100%;
          position: relative;
          box-shadow: 0 25px 60px rgba(0,0,0,0.25);
          animation: pcModalIn 0.2s ease-out;
        }

        @keyframes pcModalIn {
          from { opacity: 0; transform: scale(0.92) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .pc-modal-close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.06);
          color: #6B7280;
          font-size: 1.3rem;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }

        .pc-modal-close:hover {
          background: rgba(0,0,0,0.12);
          color: #111827;
        }

        .pc-modal-content {
          display: flex;
          gap: 20px;
          padding: 24px;
        }

        .pc-modal-left {
          flex-shrink: 0;
          width: 120px;
        }

        .pc-modal-img {
          width: 120px;
          height: 120px;
          object-fit: cover;
          border-radius: 12px;
          background: #F3F4F6;
        }

        .pc-modal-right {
          flex: 1;
          min-width: 0;
        }

        .pc-modal-title {
          margin: 0 0 4px;
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
        }

        .pc-modal-price {
          margin: 0 0 16px;
          font-size: 1.25rem;
          font-weight: 800;
          color: #DC2626;
        }

        .pc-modal-loading {
          font-size: 0.85rem;
          color: #9CA3AF;
          text-align: center;
          padding: 2rem 0;
        }

        .pc-modal-field {
          margin-bottom: 14px;
        }

        .pc-modal-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }

        .pc-modal-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pc-chip {
          padding: 6px 14px;
          border-radius: 8px;
          border: 1.5px solid #E5E7EB;
          background: white;
          font-size: 0.78rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
          transition: all 0.12s;
        }

        .pc-chip:hover {
          border-color: #DC2626;
          color: #DC2626;
        }

        .pc-chip--active {
          background: #DC2626;
          border-color: #DC2626;
          color: white;
        }

        .pc-modal-qty {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pc-qty-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1.5px solid #E5E7EB;
          background: white;
          font-size: 1.1rem;
          font-weight: 700;
          color: #374151;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s;
        }

        .pc-qty-btn:hover:not(:disabled) {
          border-color: #DC2626;
          color: #DC2626;
        }

        .pc-qty-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .pc-qty-value {
          font-size: 1.05rem;
          font-weight: 700;
          color: #111827;
          min-width: 24px;
          text-align: center;
        }

        .pc-modal-stock {
          font-size: 0.78rem;
          color: #6B7280;
          margin: 10px 0 14px;
        }

        .pc-modal-submit {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 12px;
          background: linear-gradient(135deg, #DC2626, #EF4444);
          color: white;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 4px 14px rgba(220,38,38,0.3);
        }

        .pc-modal-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(220,38,38,0.35);
        }

        .pc-modal-submit:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .pc-modal-cancel {
          width: 100%;
          padding: 10px;
          border: none;
          border-radius: 12px;
          background: transparent;
          color: #9CA3AF;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 6px;
          transition: color 0.15s;
        }

        .pc-modal-cancel:hover {
          color: #374151;
        }

        @media (max-width: 500px) {
          .pc-modal-content {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .pc-modal-left {
            width: 100px;
          }
          .pc-modal-img {
            width: 100px;
            height: 100px;
          }
          .pc-modal-chips {
            justify-content: center;
          }
          .pc-modal-qty {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
