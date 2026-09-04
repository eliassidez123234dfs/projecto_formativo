// ---------------------------------------------------------------
// usePrefersReducedMotion.js  —  Accesibilidad (prefers-reduced-motion)
// Retorna true si el usuario pidió reducir animaciones en el sistema.
// Útil para desactivar autoRotate del visor 3D y animaciones pesadas.
// ---------------------------------------------------------------
import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduced
}