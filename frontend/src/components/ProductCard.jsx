// frontend/src/components/ProductCard.jsx
import { Button } from './Button';

export const ProductCard = ({ product, onView, onAdd }) => {
  return (
    <div className="product-card">
      <div className="product-image">
        {product.badge && <span className="product-badge">{product.badge}</span>}
        {product.image || '👕'}
      </div>
      <div className="product-info">
        <p className="product-name">{product.name}</p>
        <p className="product-price">${product.price.toFixed(2)}</p>
        <div className="product-footer">
          <Button size="sm" variant="outline" onClick={() => onView(product.id)}>
            Ver
          </Button>
          <Button size="sm" onClick={() => onAdd(product.id)}>
            Agregar
          </Button>
        </div>
      </div>
    </div>
  );
};