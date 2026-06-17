import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCart, addToCart, updateCartItemQuantity, removeCartItem, clearCart as clearCartApi } from '../services/api';

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total_items: 0, total_amount: '0.00' });
  const [loading, setLoading] = useState(false);

  // Cargar el carrito al iniciar (si hay sesión)
  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCart();
      setCart(data);
    } catch (error) {
      console.error('Error al cargar el carrito:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // Agregar producto al carrito usando solo la respuesta del POST
  const addItem = async (productId, variantId, quantity = 1) => {
    try {
      const response = await addToCart(productId, variantId, quantity);
      // Actualizamos el carrito local sin recargar
      setCart(prev => {
        // Buscar si el item ya existe en el carrito
        const existingItemIndex = prev.items.findIndex(
          item => item.product === productId && item.variant === variantId
        );
        let newItems;
        if (existingItemIndex >= 0) {
          // Actualizar cantidad del item existente
          newItems = [...prev.items];
          newItems[existingItemIndex] = response;
        } else {
          // Agregar nuevo item
          newItems = [...prev.items, response];
        }
        // Recalcular totales manualmente (opcional, o se puede recargar el carrito)
        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
        return {
          ...prev,
          items: newItems,
          total_items: totalItems,
          total_amount: totalAmount,
        };
      });
    } catch (error) {
      throw error;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const updatedItem = await updateCartItemQuantity(itemId, quantity);
      setCart(prev => {
        const newItems = prev.items.map(item =>
          item.id === itemId ? updatedItem : item
        );
        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
        return { ...prev, items: newItems, total_items: totalItems, total_amount: totalAmount };
      });
    } catch (error) {
      throw error;
    }
  };

  const removeItem = async (itemId) => {
    try {
      await removeCartItem(itemId);
      setCart(prev => {
        const newItems = prev.items.filter(item => item.id !== itemId);
        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
        return { ...prev, items: newItems, total_items: totalItems, total_amount: totalAmount };
      });
    } catch (error) {
      throw error;
    }
  };

  const clearCartItems = async () => {
    try {
      await clearCartApi();
      setCart({ items: [], total_items: 0, total_amount: '0.00' });
    } catch (error) {
      console.error('Error al vaciar el carrito:', error);
    }
  };

  const reloadCart = useCallback(async () => {
    await loadCart();
  }, [loadCart]);

  return (
    <CartContext.Provider value={{ cart, loading, addItem, updateQuantity, removeItem, clearCartItems, reloadCart }}>
      {children}
    </CartContext.Provider>
  );
};