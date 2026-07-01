/**
 * CartContext.jsx  —  Estado global del carrito de compras
 * ────────────────────────────────────────────────────────────────────────
 * Expone el carrito y todas las operaciones CRUD a través de React Context.
 *
 * ─── PATRÓN CONTEXT ───
 * CartContext se crea con createContext() y se provee mediante
 * CartProvider. Los componentes hijos acceden al carrito y sus acciones
 * con el hook useCart().
 *
 * ─── useCallback para evitar re-renders ───
 * Las funciones como loadCart, addItem, updateQuantity, etc. se envuelven
 * con useCallback para mantener la misma referencia entre renders a menos
 * que sus dependencias cambien. Esto evita que componentes hijos que
 * reciban estas funciones como props se re-rendericen innecesariamente.
 *
 * ─── ESTADO ───
 * - cart      →  { items: [], total_items: 0, total_amount: '0.00' }
 * - loading   →  booleano, true mientras se carga desde la API
 * - toast     →  { message, type } | null, notificación temporal
 *
 * ─── OPERACIONES ───
 * - addItem          →  POST al backend, actualiza el estado local
 * - updateQuantity   →  PATCH cantidad, recalcula totales
 * - removeItem       →  DELETE, muestra toast si era el último ítem
 * - clearCartItems   →  Vacía y muestra toast
 * - reloadCart       →  Recarga desde la API
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { fetchCart, addToCart, updateCartItemQuantity, removeCartItem, clearCart as clearCartApi } from '../services/api';

export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total_items: 0, total_amount: '0.00' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const showToast = useCallback((message, type = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 3000);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  // Carga el carrito desde la API al montar el proveedor
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

  /** Agrega un producto/variante al carrito y actualiza el estado local sin recargar */
  const addItem = async (productId, variantId, quantity = 1) => {
    try {
      const response = await addToCart(productId, variantId, quantity);
      setCart(prev => {
        const existingItemIndex = prev.items.findIndex(
          item => item.product === productId && item.variant === variantId
        );
        let newItems;
        if (existingItemIndex >= 0) {
          newItems = [...prev.items];
          newItems[existingItemIndex] = response;
        } else {
          newItems = [...prev.items, response];
        }
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

  /** Actualiza la cantidad de un ítem en el carrito */
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

  /** Elimina un ítem del carrito y muestra toast si era el último */
  const removeItem = async (itemId) => {
    try {
      const wasLastItem = cart.items.length === 1;
      await removeCartItem(itemId);
      setCart(prev => {
        const newItems = prev.items.filter(item => item.id !== itemId);
        const totalItems = newItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = newItems.reduce((sum, item) => sum + parseFloat(item.subtotal), 0).toFixed(2);
        return { ...prev, items: newItems, total_items: totalItems, total_amount: totalAmount };
      });
      if (wasLastItem) showToast('Carrito vaciado exitosamente');
    } catch (error) {
      throw error;
    }
  };

  /** Vacía el carrito completamente */
  const clearCartItems = async () => {
    try {
      await clearCartApi();
      setCart({ items: [], total_items: 0, total_amount: '0.00' });
      showToast('Carrito vaciado exitosamente');
    } catch (error) {
      console.error('Error al vaciar el carrito:', error);
    }
  };

  /** Recarga el carrito desde la API (útil después de acciones externas) */
  const reloadCart = useCallback(async () => {
    await loadCart();
  }, [loadCart]);

  return (
    <CartContext.Provider value={{ cart, loading, toast, addItem, updateQuantity, removeItem, clearCartItems, reloadCart, showToast, dismissToast }}>
      {children}
    </CartContext.Provider>
  );
};