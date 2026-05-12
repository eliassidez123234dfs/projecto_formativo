// frontend/src/components/FormInput.jsx
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