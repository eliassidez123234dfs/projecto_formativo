/**
 * Configuración del Canvas 3D (escena de Three.js).
 *
 * Punto de entrada de la escena 3D que configura:
 * - WebGL renderer con preserveDrawingBuffer (para capturas PNG)
 * - Iluminación uniforme 360° con múltiples fuentes direccionales
 * - Cámara con campo de visión reducido (fov: 25) para vista flotante
 * - ErrorBoundary específico para fallos de WebGL
 *
 * Patrones de @react-three/fiber:
 * - Canvas: renderer declarativo que reemplaza el setup manual de Three.js
 * - CameraRig: controla posición/orientación de la cámara por frame
 * - Center: centra automáticamente el contenido en la escena
 * - La jerarquía Canvas > CameraRig > Center > Shirt organiza la escena
 */
import React from "react";
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";

import Shirt from "./Shirt";
import CameraRig from "./CameraRig";

// ── ErrorBoundary para fallos de WebGL ──
// Captura errores que ocurren durante la inicialización/renderizado de Three.js
class WebGLErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6 text-center text-white">
          <div className="max-w-md">
            <h1 className="mb-3 text-xl font-bold">El editor 3D no puede iniciar</h1>
            <p className="text-sm text-slate-300">
              Este navegador no tiene WebGL disponible. Activa la aceleración gráfica o abre el editor en Chrome o Firefox con WebGL habilitado.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const CanvasModel = () => {
  return (
    <WebGLErrorBoundary>
      <Canvas
        camera={{ position: [0, 0, 2], fov: 25 }} // fov = field of view
        gl={{ preserveDrawingBuffer: true, alpha: true }}
        className="w-full max-w-full h-full transition-all ease-in"
        fallback={(
          <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6 text-center text-white">
            <div className="max-w-md">
              <h1 className="mb-3 text-xl font-bold">El editor 3D no puede iniciar</h1>
              <p className="text-sm text-slate-300">
                Este navegador no tiene WebGL disponible. Activa la aceleración gráfica o abre el editor en Chrome o Firefox con WebGL habilitado.
              </p>
            </div>
          </div>
        )}
      >
        {/* ── Iluminación uniforme 360° ── */}
        {/* AmbientLight: luz base que evita áreas completamente negras */}
        <ambientLight intensity={0.9} />
        {/* DirectionalLights: múltiples fuentes para sombras suaves y uniformes */}
        <directionalLight position={[0, 5, 5]} intensity={0.6} />
        <directionalLight position={[0, 5, -5]} intensity={0.6} />
        <directionalLight position={[-5, 2, 0]} intensity={0.3} />
        <directionalLight position={[5, 2, 0]} intensity={0.3} />
        <directionalLight position={[0, 5, 5]} intensity={0.6} />
        <directionalLight position={[0, 5, -5]} intensity={0.6} />
        <directionalLight position={[-5, 2, 0]} intensity={0.3} />
        <directionalLight position={[5, 2, 0]} intensity={0.3} />

        {/* ── Jerarquía de la escena ── */}
        {/* CameraRig: control orbital + responsive de la cámara */}
        {/* Center: centra el modelo en el origen de la escena */}
        {/* Shirt: modelo 3D con sus calcomanías */}
        <CameraRig>
          <Center>
            <Shirt />
          </Center>
        </CameraRig>
      </Canvas>
    </WebGLErrorBoundary>
  );
};

export default CanvasModel;