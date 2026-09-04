import { useState, useEffect } from 'react'

const CONNECTION = {
  SLOW: 'slow',
  FAST: 'fast',
  UNKNOWN: 'unknown',
}

function getConnectionQuality() {
  if (typeof navigator === 'undefined') return CONNECTION.FAST
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (!conn) return CONNECTION.FAST
  if (conn.saveData) return CONNECTION.SLOW
  const type = conn.effectiveType || ''
  if (['slow-2g', '2g', '3g'].includes(type)) return CONNECTION.SLOW
  if (conn.downlink < 1) return CONNECTION.SLOW
  return CONNECTION.FAST
}

export default function useConnection() {
  const [quality, setQuality] = useState(getConnectionQuality)

  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (!conn) return
    function handleChange() {
      setQuality(getConnectionQuality())
    }
    conn.addEventListener('change', handleChange)
    return () => conn.removeEventListener('change', handleChange)
  }, [])

  return { quality, isSlow: quality === CONNECTION.SLOW }
}

export { CONNECTION }
