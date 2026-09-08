/**
 * FormInput — Componente reutilizable de campo de formulario.
 * Renderiza un label, un input con tipo configurable y un mensaje de error
 * opcional. Soporta todos los atributos estándar de un input HTML.
 */
export const FormInput = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
  ...props
}) => {
  return (
    <div className="form-group">
      {label && (
        <label htmlFor={name} className={`form-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="form-input"
        {...props}
      />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};