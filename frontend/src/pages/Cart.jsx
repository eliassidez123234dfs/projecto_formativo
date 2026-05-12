import React from 'react';
import { useCart } from '../context/CartContext';
import { Button } from '../components/Button';

export const Cart = () => {
  const { cart, loading, updateQuantity, removeItem } = useCart();

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: '2rem' }}>
        <h1>Carrito de Compras</h1>
        <p>Cargando carrito...</p>
      </div>
    );
  }

  if (!cart || cart.items?.length === 0) {
    return (
      <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
        <h1>Carrito de Compras</h1>
        <div style={{ marginTop: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: 'var(--color-gray-500)' }}>Tu carrito está vacío</p>
          <a href="/catalog" style={{ color: 'var(--color-red)', fontWeight: 600 }}>Ir al catálogo</a>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
      <h1>Carrito de Compras</h1>

      {/* Lista de items */}
      <div className="cart-items" style={{ marginTop: '2rem' }}>
        {cart.items.map((item) => (
          <div key={item.id} className="cart-item" style={{
            display: 'flex',
            gap: '1.5rem',
            alignItems: 'center',
            padding: '1.5rem',
            border: '1px solid var(--color-gray-200)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: '1rem',
            backgroundColor: 'var(--color-white)',
          }}>
            {/* Imagen */}
            <div style={{
              width: '100px',
              height: '100px',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              flexShrink: 0,
            }}>
              {item.product_image ? (
                <img src={item.product_image} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
              ) : '👕'}
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <h3 style={{ marginBottom: '0.25rem' }}>{item.product_name}</h3>
              <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                {item.variant_label}
              </p>
              <p style={{ fontWeight: 700, color: 'var(--color-red)' }}>
                ${Number(item.unit_price).toFixed(2)}
              </p>
            </div>

            {/* Cantidad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Button
                size="sm"
                variant="outline"
                disabled={item.quantity <= 1}
                onClick={() => updateQuantity(item.id, item.quantity - 1)}
              >
                −
              </Button>
              <span style={{ fontWeight: 600, minWidth: '2rem', textAlign: 'center' }}>{item.quantity}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateQuantity(item.id, item.quantity + 1)}
              >
                +
              </Button>
            </div>

            {/* Subtotal */}
            <div style={{ minWidth: '80px', textAlign: 'right' }}>
              <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>${Number(item.subtotal).toFixed(2)}</p>
            </div>

            {/* Eliminar */}
            <Button
              size="sm"
              variant="secondary"
              onClick={() => removeItem(item.id)}
              style={{ color: 'var(--color-red)', borderColor: 'var(--color-red)' }}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>

      {/* Resumen */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        border: '1px solid var(--color-gray-200)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-gray-50)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <p style={{ color: 'var(--color-gray-500)', margin: 0 }}>Total de artículos: <strong>{cart.total_items}</strong></p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-black)', margin: 0 }}>
            ${Number(cart.total_amount).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Botón de checkout (placeholder) */}
      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
        <Button size="lg" onClick={() => alert('Checkout no implementado aún')}>
          Proceder al Pago
        </Button>
      </div>
    </div>
  );
};