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
