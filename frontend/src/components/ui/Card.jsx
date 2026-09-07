import { Card as BsCard } from 'react-bootstrap'

export function Card({ children, title, subtitle, className = '', bodyClass = '', ...props }) {
  return (
    <BsCard className={`shadow-sm border-0 ${className}`} {...props}>
      {title && (
        <BsCard.Header className="bg-transparent border-bottom-0 pb-0">
          <BsCard.Title className="mb-0">{title}</BsCard.Title>
          {subtitle && <BsCard.Subtitle className="mt-1 text-muted small">{subtitle}</BsCard.Subtitle>}
        </BsCard.Header>
      )}
      <BsCard.Body className={bodyClass}>{children}</BsCard.Body>
    </BsCard>
  )
}
