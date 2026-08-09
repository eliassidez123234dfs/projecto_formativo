/**
 * Componente de la malla 3D de la camiseta.
 *
 * Carga el modelo GLTF de la camiseta (`/shirt_baked.glb`) mediante
 * `useGLTF` de @react-three/drei y renderiza la malla con Three.js.
 *
 * Three.js maneja la geometría (T_Shirt_male), el material (lambert1)
 * y las texturas como objetos del mundo 3D. @react-three/fiber sincroniza
 * el ciclo de vida de React con el bucle de renderizado de Three.js
 * mediante hooks como useFrame.
 *
 * Aplicación de colores y texturas:
 * - El color de la camiseta se interpola suavemente en cada frame
 *   usando `easing.dampC` de la biblioteca maath, transicionando
 *   desde el color actual al color seleccionado en el store de Valtio.
 *   maath es una biblioteca de matemáticas para animaciones 3D que
 *   proporciona funciones de interpolación (damping exponencial).
 * - Las texturas (logo y textura completa) se aplican como decals
 *   (calcomanías) sobre la superficie de la malla usando el componente
 *   `<Decal>` de drei, que proyecta una textura 2D sobre la geometría 3D.
 * - `logoTexture` se renderiza si `isLogoTexture` es true, en la
 *   posición y escala definidas en el store (arrastrable por el usuario).
 * - `fullTexture` se renderiza si `isFullTexture` es true, cubriendo
 *   toda la superficie de la camiseta.
 *
 * Interacción drag & drop del logo:
 * - onPointerDown: activa el modo de arrastre.
 * - onPointerMove: actualiza logoPosition [x, y, z] según el punto
 *   de intersección del rayo (raycaster) con la malla.
 * - onPointerUp / onPointerOut: desactiva el modo de arrastre.
 *
 * RF-025: Renderizado 3D interactivo de la camiseta.
 * RF-026: Personalización con colores, logos y texturas.
 */
import React, { useState } from "react";
import { easing } from "maath";
import { useSnapshot } from "valtio";
import { useFrame } from "@react-three/fiber";
import { Decal, useGLTF, useTexture } from "@react-three/drei";

import state from "../store";

const Shirt = () => {
  const snap = useSnapshot(state);
  const { nodes, materials } = useGLTF("/shirt_baked.glb");

  // Estado local para controlar cuándo se está arrastrando el logo
  const [isDragging, setIsDragging] = useState(false);

  const logoTexture = useTexture(snap.logoDecal);
  const fullTexture = useTexture(snap.fullDecal);

  // Función para mover el logo siguiendo el cursor
  const handlePointerMove = (e) => {
    e.stopPropagation();
    
    // Solo actualizamos la posición si el usuario tiene el clic presionado sobre la prenda
    if (isDragging) {
      const { x, y, z } = e.point;
      state.logoPosition = [x, y, z];
    }
  };

  useFrame((state, delta) =>
    easing.dampC(materials.lambert1.color, snap.color, 0.25, delta)
  );

  const stateString = JSON.stringify(snap);

  return (
    <group key={stateString}>
      <mesh
        castShadow
        geometry={nodes.T_Shirt_male.geometry}
        material={materials.lambert1}
        material-roughness={1}
        dispose={null}
        // --- EVENTOS DE INTERACCIÓN ---
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true); // Activa el movimiento al presionar
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setIsDragging(false); // Fija el logo al soltar
        }}
        onPointerOut={() => {
          setIsDragging(false); // Fija el logo si el cursor sale de la camiseta
        }}
        onPointerMove={handlePointerMove}
      >
        {/* Textura completa (Fondo) */}
        {snap.isFullTexture && (
          <Decal
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1}
            map={fullTexture}
          />
        )}

        {/* Logo Personalizado (RED) */}
        {snap.isLogoTexture && (
          <Decal
            position={snap.logoPosition}
            rotation={[0, 0, 0]}
            scale={snap.logoScale}
            map={logoTexture}
            mapAnisotropy={16}
            depthTest={false}
            depthWrite={true}
          />
        )}
      </mesh>
    </group>
  );
};

export default Shirt;