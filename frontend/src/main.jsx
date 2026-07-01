/**
 * main.jsx
 * ─────────────────────────────────────────────────────────────
 * Punto de entrada de la aplicación React.
 * Monta el árbol de componentes en el elemento #root del DOM
 * envolviéndolo en <StrictMode> para detectar problemas
 * potenciales durante el desarrollo.
 *
 * StrictMode no renderiza nada visible, solo activa
 * advertencias adicionales y doble renderizado intencional
 * en desarrollo para ayudar a encontrar efectos secundarios
 * no seguros.
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
