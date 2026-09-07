import { useEffect, useRef, useState } from 'react';
import { formatCOP } from '../../utils/catalog';

/**
 * Slider doble de precio con bounds estáticos.
 * Drag 100% JS (Pointer Events + setPointerCapture) sobre grips dedicados:
 * no depende del drag nativo del <input type=range>, que es frágil
 * (pointer-events sobre ::-webkit-slider-thumb se ignora en varios navegadores).
 * Patrón "commit on release": estado local mientras se arrastra,
 * se confirma al padre al soltar (o con teclado).
 */
export default function PriceRange({ min, max, step = 1000, value, onCommit }) {
  const [local, setLocal] = useState(value);
  const draggingRef = useRef(false);
  const dragRef = useRef({ which: null, id: null });
  const localRef = useRef(value);
  const sliderRef = useRef(null);

  // Copia de trabajo del estado para leer el valor más reciente en los handlers
  useEffect(() => {
    localRef.current = local;
  }, [local]);

  // Sincroniza solo si el cambio viene de FUERA del arrastre ("Limpiar todo")
  useEffect(() => {
    if (!draggingRef.current) setLocal(value);
  }, [value]);

  const [lo, hi] = local;
  const span = max - min || 1;
  const pct = (v) => `${((v - min) / span) * 100}%`;

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const snap = (v) => Math.round((v - min) / step) * step + min;

  const valueFromPointerX = (clientX) => {
    const rect = sliderRef.current.getBoundingClientRect();
    const ratio = rect.width ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0;
    return snap(min + ratio * span);
  };

  const startDrag = (e, which) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    draggingRef.current = true;
    dragRef.current = { which, id: e.pointerId };
  };

  const onPointerMove = (e) => {
    if (!dragRef.current.which || e.pointerId !== dragRef.current.id) return;
    const [cLo, cHi] = localRef.current;
    const raw = valueFromPointerX(e.clientX);
    const next =
      dragRef.current.which === 'lo'
        ? clamp(raw, min, cHi - step)
        : clamp(raw, cLo + step, max);
    setLocal(dragRef.current.which === 'lo' ? [next, cHi] : [cLo, next]);
  };

  const endDrag = (e) => {
    if (!dragRef.current.which || e.pointerId !== dragRef.current.id) return;
    dragRef.current.which = null;
    dragRef.current.id = null;
    draggingRef.current = false;
    onCommit(localRef.current);
  };

  // Click en la pista: salta al pulgar más cercano
  const jumpTo = (e) => {
    if (e.target.classList && e.target.classList.contains('price-range__grip')) return;
    const [cLo, cHi] = localRef.current;
    const raw = valueFromPointerX(e.clientX);
    const which = Math.abs(raw - cLo) <= Math.abs(raw - cHi) ? 'lo' : 'hi';
    const next = which === 'lo' ? clamp(raw, min, cHi - step) : clamp(raw, cLo + step, max);
    const nv = which === 'lo' ? [next, cHi] : [cLo, next];
    setLocal(nv);
    onCommit(nv);
  };

  const onKeyDown = (e, which) => {
    const [cLo, cHi] = localRef.current;
    const base = which === 'lo' ? cLo : cHi;
    const raw =
      e.key === 'Home'
        ? min
        : e.key === 'End'
          ? max
          : ['ArrowRight', 'ArrowUp'].includes(e.key)
            ? base + step
            : ['ArrowLeft', 'ArrowDown'].includes(e.key)
              ? base - step
              : null;
    if (raw == null) return;
    e.preventDefault();
    const next = which === 'lo' ? clamp(raw, min, cHi - step) : clamp(raw, cLo + step, max);
    const nv = which === 'lo' ? [next, cHi] : [cLo, next];
    setLocal(nv);
    onCommit(nv);
  };

  // Los handlers leen dragRef/localRef solo al momento del evento (pointer/key),
  // nunca durante el render. La regla react-hooks/refs no distingue este caso.
  /* eslint-disable react-hooks/refs */
  const gripProps = (which, label, now, maxNow) => ({
    className: `price-range__grip price-range__grip--${which}`,
    role: 'slider',
    tabIndex: 0,
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': maxNow,
    'aria-valuenow': now,
    'aria-valuetext': formatCOP(now),
    onPointerDown: (e) => startDrag(e, which),
    onPointerMove: onPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onKeyDown: (e) => onKeyDown(e, which),
  });
  /* eslint-enable react-hooks/refs */

  return (
    <div className="price-range">
      <p className="price-range__label">
        {formatCOP(lo)} – {formatCOP(hi)}
      </p>
      <div
        className="price-range__slider"
        ref={sliderRef}
        style={{ '--lo': pct(lo), '--hi': pct(hi) }}
        onPointerDown={jumpTo}
      >
        <div className="price-range__track" />
        <div className="price-range__fill" />
        <div {...gripProps('lo', 'Precio mínimo', lo, hi)} />
        <div {...gripProps('hi', 'Precio máximo', hi, max)} />
      </div>
    </div>
  );
}