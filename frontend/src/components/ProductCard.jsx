import { DEFAULT_IMAGE } from '../constants';

export const ProductCard = ({ product, onView, onAdd }) => {
  const imgSrc = product.image || DEFAULT_IMAGE;

  return (
    <div className="pc-wrap">
      <div className="pc-img-box">
        {product.badge && <span className="pc-badge">{product.badge}</span>}
        <img src={imgSrc} alt={product.name} onError={(e) => { e.target.src = DEFAULT_IMAGE }} className="pc-img" />
        <div className="pc-img-shine" />
      </div>
      <div className="pc-body">
        <p className="pc-name">{product.name}</p>
        <p className="pc-price">${product.price.toFixed(2)}</p>
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

        .pc-act--add:hover {
          transform: translateY(-1px);
          box-shadow: 0 5px 14px rgba(220,38,38,0.3);
        }

        .pc-act--add:active {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
};
