import { Form } from 'react-bootstrap'

export function Input({ label, error, helpText, id, ...props }) {
  return (
    <Form.Group className="mb-3">
      {label && <Form.Label htmlFor={id}>{label}</Form.Label>}
      <Form.Control id={id} isInvalid={!!error} {...props} />
      {error && <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>}
      {helpText && !error && <Form.Text className="text-muted">{helpText}</Form.Text>}
    </Form.Group>
  )
}
