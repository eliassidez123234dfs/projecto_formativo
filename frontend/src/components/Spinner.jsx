export default function Spinner({ text = 'Cargando...' }) {
  return (
    <div className="spinner-container">
      <div className="spinner" />
      <p>{text}</p>
    </div>
  )
}
