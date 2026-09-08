import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Máquina de Estados Inmutable para Promesas / Peticiones Asíncronas
 * Enfoque pedagógico y robusto para control de estado de UI.
 */
export const PROMISE_STATE = Object.freeze({
  IDLE: 'IDLE',
  PENDING: 'PENDING',
  FULFILLED: 'FULFILLED',
  REJECTED: 'REJECTED',
})

/**
 * Hook personalizado para manejar el ciclo de vida de una Promesa
 * con máquina de estados estricta y protección contra memory leaks.
 * 
 * @template T
 * @param {Function} promiseFn - Función asíncrona que retorna una Promesa
 * @param {Object} options - Configuración inicial
 * @returns {{
 *   state: string,
 *   data: T|null,
 *   error: any,
 *   isIdle: boolean,
 *   isPending: boolean,
 *   isFulfilled: boolean,
 *   isRejected: boolean,
 *   execute: (...args: any[]) => Promise<T>,
 *   reset: () => void
 * }}
 */
export function usePromiseState(promiseFn, options = {}) {
  const { immediate = false, initialData = null, initialArgs = [] } = options
  const [state, setState] = useState(PROMISE_STATE.IDLE)
  const [data, setData] = useState(initialData)
  const [error, setError] = useState(null)
  
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const execute = useCallback(async (...args) => {
    setState(PROMISE_STATE.PENDING)
    setError(null)

    try {
      const result = await promiseFn(...args)
      if (isMounted.current) {
        setData(result)
        setState(PROMISE_STATE.FULFILLED)
      }
      return result
    } catch (err) {
      if (isMounted.current) {
        setError(err)
        setState(PROMISE_STATE.REJECTED)
      }
      throw err
    }
  }, [promiseFn])

  const reset = useCallback(() => {
    if (isMounted.current) {
      setState(PROMISE_STATE.IDLE)
      setData(initialData)
      setError(null)
    }
  }, [initialData])

  useEffect(() => {
    if (immediate && typeof promiseFn === 'function') {
      execute(...initialArgs).catch(() => {})
    }
  }, [immediate, execute])

  return {
    state,
    data,
    error,
    isIdle: state === PROMISE_STATE.IDLE,
    isPending: state === PROMISE_STATE.PENDING,
    isFulfilled: state === PROMISE_STATE.FULFILLED,
    isRejected: state === PROMISE_STATE.REJECTED,
    execute,
    reset,
  }
}
