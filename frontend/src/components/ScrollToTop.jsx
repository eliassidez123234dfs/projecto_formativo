import { useState, useEffect, useCallback } from 'react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <button
      onClick={scrollToTop}
      aria-label="Volver al inicio"
      title="Volver arriba"
      className="scroll-to-top"
      style={{
        position: 'fixed',
        bottom: 28,
        right: 28,
        zIndex: 9999,
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: 'none',
        background: 'var(--color-primary, #DC2626)',
        color: '#fff',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
        transition: 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(12px)',
        pointerEvents: visible ? 'auto' : 'none',
        willChange: 'transform, opacity',
      }}
      onMouseEnter={e => {
        if (!visible) return
        e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 20px rgba(220,38,38,0.5)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = visible ? 'scale(1) translateY(0)' : 'scale(0.6) translateY(12px)'
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(220,38,38,0.35)'
      }}
      onMouseDown={e => {
        if (!visible) return
        e.currentTarget.style.transform = 'scale(0.92)'
      }}
      onMouseUp={e => {
        if (!visible) return
        e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="22"
        height="22"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </button>
  )
}
