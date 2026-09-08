/**
 * Componente raíz de la aplicación Tshirt3D.
 *
 * Orquesta el flujo principal del editor 3D de camisetas:
 * 1. Carga la sesión del editor desde el backend Django
 * 2. Muestra estados de carga/error si la sesión falla
 * 3. Alterna entre el editor (Canvas + Customizer) y la vista previa (Preview)
 *
 * Flujo de datos:
 * - loadEditorSession() obtiene productId, variantId, quantity, color del backend
 * - Canvas renderiza la escena 3D con Three.js via @react-three/fiber
 * - Customizer maneja la UI de personalización y crea el pedido
 * - Preview muestra el resultado y permite confirmar/enviar al backend
 */
import { useEffect, useState } from "react";
import Canvas from "./canvas/index.jsx";
import Customizer from "./pages/Customizer.jsx";
import Preview from "./pages/Preview.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import state, { loadEditorSession } from "./store/index.js";

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

function App() {
  // ── Estado local para el flujo de pedidos ──
  const [previewOrder, setPreviewOrder] = useState(null);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [renderError, setRenderError] = useState(null);

  // ── Carga de sesión al montar la aplicación ──
  // loadEditorSession() consulta el backend Django para obtener datos validados
  // del producto/variante. El editor NUNCA confía en parámetros de la URL.
  useEffect(() => {
    let cancelled = false;
    loadEditorSession().finally(() => {
      if (!cancelled) {
        setReady(true);
        setSessionError(!!state.sessionError);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Estado de carga inicial ──
  if (!ready) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-slate-900">
        <p className="text-white text-sm animate-pulse">Cargando editor...</p>
      </div>
    );
  }

  // ── Error de sesión: datos del producto no disponibles ──
  if (sessionError) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-900 px-6 text-center">
        <div className="glassmorphism rounded-2xl p-8 max-w-md border border-amber-400/40">
          <h2 className="text-white text-lg font-bold mb-2">No se pudo iniciar el editor</h2>
          <p className="text-slate-300 text-sm mb-6">
            No encontramos los datos del producto. Vuelve al catálogo, abre
            el editor desde la ficha de un producto y asegúrate de tener la
            sesión iniciada.
          </p>
          <a
            href={`${FRONTEND_URL}/catalog`}
            className="inline-block px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-bold hover:bg-white/80 transition-all"
          >
            Volver al catálogo
          </a>
        </div>
      </div>
    );
  }

  // ── Renderizado principal: ErrorBoundary envuelve toda la escena 3D ──
  return (
    <ErrorBoundary onError={setRenderError}>
      {/* Error de renderizado de Three.js / WebGL */}
      {renderError && (
        <div className="flex items-center justify-center w-full h-screen bg-slate-900 px-6 text-center">
          <div className="glassmorphism rounded-2xl p-8 max-w-md border border-red-400/40">
            <h2 className="text-white text-lg font-bold mb-2">No se pudo renderizar el editor</h2>
            <p className="text-slate-300 text-sm mb-6">Recarga la página o vuelve al catálogo para iniciar una sesión nueva.</p>
            <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg bg-white text-slate-900 text-sm font-bold">
              Recargar editor
            </button>
          </div>
        </div>
      )}
      {/* Editor 3D: Canvas (escena Three.js) + Customizer (UI) o Preview (resultado) */}
      {!renderError && (
      <main className="app transition-all ease-in">
        {!previewOrder ? (
          <>
            <Canvas />
            <Customizer onOrderCreated={setPreviewOrder} />
          </>
        ) : (
          <Preview order={previewOrder} onBack={() => setPreviewOrder(null)} />
        )}
      </main>
      )}
    </ErrorBoundary>
  );
}

export default App;