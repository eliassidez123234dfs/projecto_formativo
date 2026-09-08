/**
 * CartContext.jsx — Contexto global del carrito de compras.
 *
 * Proporciona estado y operaciones del carrito a toda la aplicación:
 * - cart: estado actual (items, total_items, total_amount).
 * - addItem, updateQuantity, removeItem, clearCartItems: operaciones CRUD.
 * - loadCart: recarga el carrito desde el backend.
 *
 * Decisiones de diseño:
 * - Optimistic updates: cada operación actualiza el estado local inmediatamente
 *   usando la respuesta del POST/PATCH/DELETE, sin recargar el carrito completo.
 * - Si la operación falla con 404 (item stale), recarga el carrito completo.
 * - El carrito se carga automáticamente al montar el provider.
 * - Se usa cookie de sesión (no JWT) para las operaciones del carrito.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchCart, addToCart, updateCartItemQuantity, removeCartItem, clearCart as clearCartApi } from '../services/api';

// ─── CREACIÓN DEL CONTEXTO ───
const CartContext = createContext();

export const useCart = () => useContext(CartContext);

// ─── PROVIDER DEL CARRITO ───
export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total_items: 0, total_amount: '0.00' });
  const [loading, setLoading] = useState(false);

  // ─── CARGA DEL CARRITO ───
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

  // ─── OPERACIÓN: AGREGAR ITEM ───
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

  // ─── OPERACIÓN: ACTUALIZAR CANTIDAD ───
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
      if (error?.response?.status === 404) {
        await loadCart();
        return;
      }
      throw error;
    }
  };

  // ─── OPERACIÓN: ELIMINAR ITEM ───
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
      if (error?.response?.status === 404) {
        await loadCart();
        return;
      }
      throw error;
    }
  };

  // ─── OPERACIÓN: VACIAR CARRITO ───
  const clearCartItems = async () => {
    try {
      await clearCartApi();
      setCart({ items: [], total_items: 0, total_amount: '0.00' });
    } catch (error) {
      console.error('Error al vaciar el carrito:', error);
    }
  };

  // ─── PROVIDER: EXPONER ESTADO Y ACCIONES ───
  return (
    <CartContext.Provider value={{ cart, loading, addItem, updateQuantity, removeItem, clearCartItems, loadCart }}>
      {children}
    </CartContext.Provider>
  );

};