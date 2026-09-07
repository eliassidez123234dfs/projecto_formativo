/* eslint-disable react/no-unknown-property -- props de la escena three.js */
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";

import Shirt from "./Shirt";
import Backdrop from "./Backdrop";
import CameraRig from "./CameraRig";

const CanvasModel = () => {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 2], fov: 25 }} // fov = field of view
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      className="w-full max-w-full h-full transition-all ease-in"
    >
      {/* Iluminación local (sin HDR remoto): el editor funciona sin internet */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 6]} intensity={1.4} />
      <directionalLight position={[-6, 5, -8]} intensity={0.45} />

      <CameraRig>
        <Backdrop />
        <Center>
          <Shirt />
        </Center>
      </CameraRig>
    </Canvas>
  );
};

export default CanvasModel;