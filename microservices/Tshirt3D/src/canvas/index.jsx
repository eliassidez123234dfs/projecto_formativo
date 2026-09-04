/**
 * Componente de canvas 3D principal.
 *
 * Configura la escena de Three.js usando @react-three/fiber y
 * @react-three/drei.
 *
 * @react-three/fiber (R3F) es un renderer declarativo para React que
 * convierte componentes JSX en código Three.js. Cada elemento JSX dentro
 * de <Canvas> (como <ambientLight>, <mesh>, <group>) se traduce a su
 * equivalente en Three.js (THREE.AmbientLight, THREE.Mesh, THREE.Group).
 *
 * @react-three/drei proporciona utilidades de alto nivel como Center
 * (centra automáticamente el modelo), Decal (proyecta texturas sobre
 * superficies 3D), AccumulativeShadows (sombras suaves), etc.
 *
 * - Cámara: posición inicial [0, 0, 0] con FOV 25°.
 * - Luces: ambiental + direccional con sombras (shadow-mapSize 1024x1024).
 * - Fondo: blanco sólido, excepto durante captura (alpha=true para PNG
 *   transparente si `captureTransparent` está activo).
 * - `preserveDrawingBuffer: true` permite capturar el canvas como imagen
 *   mediante `canvas.toDataURL("image/png")`.
 *
 * El componente se suscribe al store de Valtio mediante `useSnapshot`
 * para reaccionar a cambios de intensidad de luz y modo de captura.
 *
 * RF-025: Renderiza la escena 3D interactiva del editor de camisetas.
 */
import { Canvas } from "@react-three/fiber";
import { Center } from "@react-three/drei";
import { useSnapshot } from "valtio";

import Shirt from "./Shirt";
import Backdrop from "./Backdrop";
import CameraRig from "./CameraRig";
import state from "../store";

const CanvasModel = () => {
  const snap = useSnapshot(state);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 0], fov: 25 }} // fov = field of view
      gl={{ preserveDrawingBuffer: true, alpha: true }}
      className="w-full max-w-full h-full transition-all ease-in"
    >
      <ambientLight intensity={snap.lightIntensity / 100} />
      {!snap.captureTransparent && <color attach="background" args={["#ffffff"]} />}

      <directionalLight
        castShadow
        intensity={(snap.lightIntensity / 100) * 1.6}
        position={[5, 10, 5]}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />

      <CameraRig>
        <Backdrop />
        <Center position={[0, 0.05, 0]}>
          <Shirt />
        </Center>
      </CameraRig>
    </Canvas>
  );
};

export default CanvasModel;
