/**
 * Button — Componente reutilizable de botón con variantes de estilo.
 * Soporta las variantes 'primary', 'secondary', etc., tamaños 'sm', 'md', 'lg',
 * y la propiedad fullWidth para ocupar todo el ancho del contenedor.
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  ...props
}) => {
  const classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth && 'btn-block'
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  );
};