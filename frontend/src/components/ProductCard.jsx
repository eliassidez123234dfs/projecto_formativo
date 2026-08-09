import { DEFAULT_IMAGE } from '../constants';
import { formatCOP } from '../utils/format';

const COLOR_SWATCH_FALLBACK = '#6B7280';

export const ProductCard = ({ product, onView, onAdd }) => {
  const imgSrc = product.image || DEFAULT_IMAGE;
  const price = Number(product.min_price ?? product.price ?? product.base_price ?? 0);
  const hasVariedPrice = product.min_price != null && product.max_price != null && Number(product.min_price) !== Number(product.max_price);
  const colors = (product.color_hexes || {});
  const stock = Number(product.total_stock ?? 0);

  return (
    <div className="pc-wrap">
      <div className="pc-img-box">
        {product.badge && <span className="pc-badge">{product.badge}</span>}
        {stock === 0 && <span className="pc-badge pc-badge--soldout">Agotado</span>}
        <img src={imgSrc} alt={product.name} onError={(e) => { e.target.src = DEFAULT_IMAGE }} className="pc-img" />
        <div className="pc-img-shine" />
      </div>
      <div className="pc-body">
        <p className="pc-name">{product.name}</p>
        <p className="pc-price">
          {hasVariedPrice ? `Desde ${formatCOP(price)}` : formatCOP(price)}
        </p>
        {Object.keys(colors).length > 0 && (
          <div className="pc-colors">
            {Object.entries(colors).map(([color, hex]) => (
              <span key={color} title={color} style={{ background: hex || COLOR_SWATCH_FALLBACK }} className="pc-color" />
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
          <button className="pc-act pc-act--add" onClick={() => onAdd(product.id)}>
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

        .pc-badge--soldout {
          background: #6B7280;
          box-shadow: 0 3px 10px rgba(107,114,128,0.3);
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
          margin: 0 0 8px;
          font-size: 1.25rem;
          font-weight: 800;
          color: #DC2626;
          letter-spacing: -0.3px;
        }

        .pc-colors {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .pc-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 1px solid rgba(0,0,0,0.1);
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
