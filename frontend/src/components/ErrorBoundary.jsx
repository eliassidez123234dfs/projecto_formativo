/**
 * ErrorBoundary.jsx — Componente de captura de errores de React.
 *
 * Implementa el patrón Error Boundary de React para capturar errores
 * no controlados en el árbol de componentes y mostrar una UI de fallback.
 *
 * Decisiones de diseño:
 * - Clase component (no funcional) porque React no soporta hooks en boundaries.
 * - Usa ErrorState como UI de fallback (proporciona retry y navegación).
 * - Registra errores en el logger del cliente para monitoreo.
 * - Se coloca en App.jsx para cubrir todas las rutas.
 */
import React from 'react';
import ErrorState from './ErrorState';
import { logClientError } from '../utils/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    logClientError({ name: 'ErrorBoundary', message: error?.message || 'Error de página', status: null })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorState full status={null} error={this.state.error} />;
    }
    return this.props.children
  }
}
