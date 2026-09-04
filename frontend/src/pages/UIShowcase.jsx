import { Button, Card, Modal, Input } from '../components/ui'
import { useState } from 'react'

export default function UIShowcase() {
  const [modalShow, setModalShow] = useState(false)
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="container py-5">
      <h1 className="mb-4">🧩 UI Components</h1>
      <p className="text-muted mb-5">
        Componentes base del sistema <code>src/components/ui/</code>.
        Copia y adapta estos patrones para nuevos componentes.
      </p>

      <div className="row g-4">
        <div className="col-md-6">
          <Card title="Botones" subtitle="Diferentes variantes y estados">
            <div className="d-flex flex-wrap gap-2">
              <Button variant="danger">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline-danger">Outline</Button>
              <Button variant="danger" loading>Loading</Button>
              <Button variant="danger" size="lg">Large</Button>
              <Button variant="danger" size="sm">Small</Button>
            </div>
          </Card>
        </div>

        <div className="col-md-6">
          <Card title="Inputs" subtitle="Campos de formulario con validación">
            <Input
              label="Nombre"
              placeholder="Ej: Juan Pérez"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input
              label="Correo"
              type="email"
              placeholder="correo@ejemplo.com"
              error="Correo inválido"
            />
            <Input
              label="Con ayuda"
              helpText="Mínimo 8 caracteres"
              placeholder="Escribe algo..."
            />
          </Card>
        </div>

        <div className="col-md-6">
          <Card title="Modal" subtitle="Ventanas de diálogo">
            <Button onClick={() => setModalShow(true)}>Abrir Modal</Button>
            <Modal title="Ejemplo de Modal" show={modalShow} onHide={() => setModalShow(false)} footer={<Button onClick={() => setModalShow(false)} variant="secondary">Cerrar</Button>}>
              <p>Este modal usa el componente <code>Modal</code> de <code>src/components/ui/</code>.</p>
              <p>Para crear un nuevo diálogo:</p>
              <ol className="small">
                <li>Copia este patrón en tu página</li>
                <li>Cambia el título y contenido</li>
                <li>Ajusta el <code>size</code> si es necesario</li>
              </ol>
            </Modal>
          </Card>
        </div>

        <div className="col-md-6">
          <Card title="Cómo agregar un snippet" subtitle="Guía rápida">
            <ol className="small mb-0">
              <li className="mb-2">Busca en <strong>Uiverse.io</strong>, <strong>CodePen</strong> o <strong>Shadcn/ui</strong> el componente que necesitas</li>
              <li className="mb-2">Copia solo el JSX + CSS (no el HTML completo)</li>
              <li className="mb-2">Crea un archivo en <code>src/components/ui/NuevoComponente.jsx</code></li>
              <li className="mb-2">Adapta las props para que coincidan con el patrón React-Bootstrap</li>
              <li className="mb-2">Exporta desde <code>ui/index.js</code></li>
              <li>¡Listo! Úsalo en cualquier página</li>
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}
