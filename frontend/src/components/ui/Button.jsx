import { Button as BootstrapButton, Spinner } from 'react-bootstrap'

export function Button({ children, loading, variant = 'primary', size, className = '', ...props }) {
  return (
    <BootstrapButton variant={variant} size={size} className={className} disabled={loading || props.disabled} {...props}>
      {loading && <Spinner size="sm" className="me-2" />}
      {children}
    </BootstrapButton>
  )
}
