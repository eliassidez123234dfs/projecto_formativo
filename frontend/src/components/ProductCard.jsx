import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DEFAULT_IMAGE } from '../constants';
import { formatCOP } from '../utils/format';
import { useCart } from '../context/CartContext';
import { VariantPickerModal } from './VariantPickerModal';
import '../styles/product-card.css';

const COLOR_SWATCH_FALLBACK = '#6B7280';

export const ProductCard = ({ product, onView }) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const imgSrc = product.image || DEFAULT_IMAGE;
  const price = Number(product.min_price ?? product.price ?? product.base_price ?? 0);
  const hasVariedPrice = product.min_price != null && product.max_price != null && Number(product.min_price) !== Number(product.max_price);
  const colors = (product.color_hexes || {});
  const stock = Number(product.total_stock ?? 0);

  const [showModal, setShowModal] = useState(false);

  const handleAdd = async (variantId, quantity) => {
    await addItem(product.id, variantId, quantity);
    toast.success('Producto agregado al carrito');
  };

  const handle3D = () => navigate(`/product/${product.id}/3d?mode=new`);

  return (
    <div className="pc-wrap">
      <div className="pc-img-box">
        {product.badge && <span className="pc-badge">{product.badge}</span>}
        {stock === 0 && <span className="pc-badge pc-badge--soldout">Agotado</span>}
        <img src={imgSrc} alt={product.name} loading="lazy" decoding="async" onError={(e) => { e.target.src = DEFAULT_IMAGE }} className="pc-img" />
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
          <button className="pc-act pc-act--3d" onClick={handle3D}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            3D
          </button>
          <button className="pc-act pc-act--add" onClick={() => setShowModal(true)}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar
          </button>
        </div>
      </div>

      {showModal && (
        <VariantPickerModal
          product={{ ...product, image: imgSrc }}
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  );
};