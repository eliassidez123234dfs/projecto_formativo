import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { DEFAULT_IMAGE } from '../constants';

const Toast = ({ toast, onDismiss }) => {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)',
      animation: 'toastFadeIn 0.25s ease',
    }} onClick={onDismiss}>
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '40px 48px', textAlign: 'center',
        boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
        animation: 'toastScaleIn 0.3s ease',
        maxWidth: 400,
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#DC2626', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p style={{
          fontSize: 18, fontWeight: 700, color: '#111827',
          margin: '0 0 8px',
        }}>{toast.message}</p>
        <button onClick={onDismiss} style={{
          marginTop: 20, padding: '10px 32px', border: 'none',
          borderRadius: 8, background: '#DC2626', color: '#fff',
          fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>Cerrar</button>
      </div>
      <style>{`
        @keyframes toastFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes toastScaleIn { from { opacity:0; transform:scale(0.9) } to { opacity:1; transform:scale(1) } }
      `}</style>
    </div>
  );
};

export const Cart = () => {
  const { cart, loading, toast, updateQuantity, removeItem, clearCartItems, dismissToast } = useCart();

  if (loading) {
    return (
      <>
        <Header cartCount={0} />
        <div className="container" style={{ paddingTop: '2rem' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Carrito de Compras</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                display: 'flex', gap: 24, padding: 24, borderRadius: 12,
                border: '1px solid var(--color-border-light)',
                animation: 'cartPulse 1.5s ease-in-out infinite',
              }}>
                <div style={{ width: 100, height: 100, borderRadius: 8, background: 'var(--color-bg-tertiary)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 16, background: 'var(--color-bg-tertiary)', borderRadius: 4, marginBottom: 8, width: '60%' }} />
                  <div style={{ height: 14, background: 'var(--color-bg-tertiary)', borderRadius: 4, width: '30%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes cartPulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
      </>
    );
  }

  const items = cart?.items || [];
  const totalItems = cart?.total_items || 0;

  if (items.length === 0) {
    return (
      <>
        <Toast toast={toast} onDismiss={dismissToast} />
        <Header cartCount={0} />
        <div className="container" style={{ paddingTop: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Carrito de Compras</h1>
          <div style={{ padding: '60px 20px' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Tu carrito está vacío</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>
              Explora nuestro catálogo y encuentra lo que buscas.
            </p>
            <Link to="/catalog" className="btn btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Ir al catálogo
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast toast={toast} onDismiss={dismissToast} />
      <Header cartCount={totalItems} />
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '4rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Carrito de Compras</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, fontSize: 14 }}>
          {totalItems} producto{totalItems !== 1 ? 's' : ''} en tu carrito
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div key={item.id} style={{
              display: 'flex', gap: 20, alignItems: 'center', padding: 20,
              border: '1px solid var(--color-border)', borderRadius: 12,
              background: 'var(--color-bg)',
            }}>
              <div style={{
                width: 90, height: 90, flexShrink: 0,
                background: '#f9fafb', borderRadius: 8, overflow: 'hidden',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img
                  src={item.product_image || DEFAULT_IMAGE}
                  alt={item.product_name}
                  onError={(e) => { e.target.src = DEFAULT_IMAGE }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.product_name}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                  {item.variant_label || ''}
                </p>
                <p style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: 15 }}>
                  ${Number(item.unit_price).toFixed(2)}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button className="btn btn-sm btn-outline" disabled={item.quantity <= 1}
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  style={{ width: 32, height: 32, padding: 0, borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  −
                </button>
                <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center', fontSize: 14 }}>{item.quantity}</span>
                <button className="btn btn-sm btn-outline"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  style={{ width: 32, height: 32, padding: 0, borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  +
                </button>
              </div>

              <div style={{ minWidth: 80, textAlign: 'right' }}>
                <p style={{ fontWeight: 700, fontSize: 16 }}>${Number(item.subtotal).toFixed(2)}</p>
              </div>

              <button className="btn btn-sm btn-ghost" onClick={() => removeItem(item.id)}
                style={{ color: 'var(--color-error)', padding: '4px 8px' }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>

        <div style={{
          marginTop: 24, padding: 24,
          border: '1px solid var(--color-border)', borderRadius: 12,
          background: 'var(--color-bg-tertiary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 14 }}>
              Total de artículos: <strong>{totalItems}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              ${Number(cart?.total_amount || 0).toFixed(2)}
            </p>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button className="btn btn-outline" style={{ textDecoration: 'none', color: 'var(--color-error)' }} onClick={clearCartItems}>
            Vaciar carrito
          </button>
          <Link to="/catalog" className="btn btn-outline" style={{ textDecoration: 'none' }}>
            Seguir comprando
          </Link>
          <Link to="/checkout" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Proceder al Pago
          </Link>
        </div>
      </div>
    </>
  );
};
