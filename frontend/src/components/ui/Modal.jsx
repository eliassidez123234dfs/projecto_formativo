import { Modal as BsModal } from 'react-bootstrap'

export function Modal({ children, title, show, onHide, size, footer, ...props }) {
  return (
    <BsModal show={show} onHide={onHide} size={size} centered {...props}>
      <BsModal.Header closeButton>
        <BsModal.Title>{title}</BsModal.Title>
      </BsModal.Header>
      <BsModal.Body>{children}</BsModal.Body>
      {footer && <BsModal.Footer>{footer}</BsModal.Footer>}
    </BsModal>
  )
}
