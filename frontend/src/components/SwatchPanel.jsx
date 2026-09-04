// ---------------------------------------------------------------
// SwatchPanel.jsx  —  Selector de color reutilizable
// Muestra un grupo de botones circulares; el activo muestra un ring.
// Props:
//  - colors : [{ value, label }]  (label para aria-label)
//  - value  : color seleccionado
//  - onChange : (value) => void
// ---------------------------------------------------------------
export const SwatchPanel = ({ colors, value, onChange, label = 'Color' }) => {
  return (
    <div className="swatch-panel" role="group" aria-label={label}>
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          className={`swatch ${value === c.value ? 'swatch--active' : ''}`}
          style={{ background: c.value }}
          onClick={() => onChange(c.value)}
          aria-label={c.label}
          aria-pressed={value === c.value}
        />
      ))}
    </div>
  )
}