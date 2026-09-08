import React, { Component } from "react";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

/**
 * ErrorBoundary — Evita que un error en el render de la escena 3D (Canvas)
 * deje la página en blanco. Muestra un mensaje recuperable en su lugar.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) this.props.onError(error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    if (this.props.resetKey !== undefined) this.props.onReset && this.props.onReset();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-900 px-6 text-center">
          <div className="glassmorphism rounded-2xl p-8 max-w-md border border-red-400/40">
            <h2 className="text-white text-lg font-bold mb-2">El editor 3D tuvo un problema</h2>
            <p className="text-slate-300 text-sm mb-6">
              Ocurrió un error al renderizar la escena. Puedes intentarlo de nuevo
              o volver al catálogo.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-bold hover:bg-white/80 transition-all"
              >
                Reintentar
              </button>
              <a
                href={`${FRONTEND_URL}/catalog`}
                className="px-4 py-2 rounded-lg border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-all"
              >
                Volver al catálogo
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;