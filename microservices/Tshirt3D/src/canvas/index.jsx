import React from "react";
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";

import Shirt from "./Shirt";
import Backdrop from "./Backdrop";
import CameraRig from "./CameraRig";

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
      shadows
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
        <ambientLight intensity={0.5} />
        <Environment preset="city" background={!snap.captureTransparent} />

        <CameraRig>
          <Backdrop />
          <Center>
            <Shirt />
          </Center>
        </CameraRig>
      </Canvas>
    </WebGLErrorBoundary>
  );
};

export default CanvasModel;