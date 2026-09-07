/** Placeholder SVG de camiseta hasta tener fotos reales (Cloudinary). */
export default function TShirtSVG({ hex = '#6B7280', title = '' }) {
  return (
    <svg className="catalog-tshirt-svg" viewBox="0 0 100 100" role="img" aria-label={title}>
      <path
        d="M32 8 L14 18 L4 34 L20 44 L24 38 L24 94 L76 94 L76 38 L80 44 L96 34 L86 18 L68 8 Q60 14 50 14 Q40 14 32 8 Z"
        fill={hex}
        stroke="rgba(0,0,0,.12)"
        strokeWidth="1"
      />
    </svg>
  );
}
