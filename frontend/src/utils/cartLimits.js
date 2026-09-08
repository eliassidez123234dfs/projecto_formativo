import { useRef, useState, useCallback } from 'react';

export const LIMIT_MAX_ALERTS = 5;

/**
 * useAddAttemptGuard  —  Limita la cantidad de alertas de error que se
 * generan al intentar agregar algo al carrito.
 *
 * A diferencia del enfoque anterior (bloquear el botón con cooldown),
 * este hook solo cuenta cuántas alertas de error se han mostrado dentro
 * de una ventana de tiempo. El botón NUNCA se deshabilita por este guard.
 *
 * @returns {{
 *   alertCount,       // number  → alertas de error mostradas en la ventana actual
 *   maxReached,       // boolean  → true si ya se alcanzó el límite de alertas
 *   registerFailure,  // () => void  → registra una alerta de error mostrada
 *   clearAlerts,      // () => void  → resetea el contador manualmente
 * }}
 */
export function useAddAttemptGuard() {
  const attemptsRef = useRef([]);
  const [alertCount, setAlertCount] = useState(0);
  const [maxReached, setMaxReached] = useState(false);

  const registerFailure = useCallback(() => {
    const now = Date.now();
    attemptsRef.current.push(now);
    const count = attemptsRef.current.length;
    setAlertCount(count);
    if (count >= LIMIT_MAX_ALERTS) {
      setMaxReached(true);
    }
  }, []);

  const clearAlerts = useCallback(() => {
    attemptsRef.current = [];
    setAlertCount(0);
    setMaxReached(false);
  }, []);

  return { alertCount, maxReached, registerFailure, clearAlerts };
}

/** Extrae un mensaje de error legible a partir de una excepción de Axios. */
export function extractCartError(error, fallback = 'Error al agregar al carrito') {
  const data = error?.response?.data;
  if (data && typeof data !== 'string') {
    if (data.userMessage) return data.userMessage;
    const value = data.error || data.quantity || data.detail || data.product_id || data.variant_id;
    if (Array.isArray(value)) return value[0];
    if (value) return value;
  }
  if (typeof data === 'string' && data) return data;
  return fallback;
}
