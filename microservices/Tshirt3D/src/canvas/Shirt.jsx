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