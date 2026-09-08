/**
 * Componente 3D de la camiseta personalizable.
 *
 * Renderiza el modelo GLTF de la camiseta y gestiona tres capas de
 * calcomanía (Decal) que se superponen en la superficie 3D:
 * 1. Textura completa (fullTexture): cubre toda la camiseta
 * 2. Logo personalizado (logoDecal): calcomanía parcial posicionable
 * 3. Texto 3D (customText): generado dinámicamente como CanvasTexture
 *
 * Patrones de Three.js / R3F:
 * - useGLTF: carga modelos .glb/.gltf de forma declarativa
 * - useTexture: carga imágenes como texturas de Three.js
 * - Decal: proyecta una textura sobre la superficie de un mesh
 * - useFrame: ejecuta lógica en cada frame (interpolación de color)
 * - CanvasTexture: genera texturas proceduralmente usando Canvas 2D API
 * - easing.dampC: interpolación suave del color para evitar cambios bruscos
 */
import { useState, useMemo } from "react";
import { easing } from "maath";
import { useSnapshot } from "valtio";
import { useFrame } from "@react-three/fiber";
import { Decal, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

import state from "../store";

// ── Generación procedural de textura de texto ──
// Crea un CanvasTexture de Three.js a partir del texto personalizado
function createTextTexture(text, font, color) {
  if (!text || !text.trim()) return null;

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Tipografía y alineación
  ctx.font = `bold 64px ${font || "Arial"}, sans-serif`;
  ctx.fillStyle = color || "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Efecto de sombra suave para dar nitidez en la tela
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // Renderizar texto centrado
  ctx.fillText(text.trim(), canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.anisotropy = 16;
  return texture;
}

const Shirt = () => {
  const snap = useSnapshot(state);
  // Carga el modelo GLTF bakeado (materiales ya optimizados)
  const { nodes, materials } = useGLTF("/shirt_baked.glb");

  // ── Estado de interacción: arrastre del logo/texto ──
  const [isDragging, setIsDragging] = useState(false);

  // ── Carga de texturas desde el store ──
  // useTexture convierte las rutas/URLs en texturas de Three.js
  const logoTexture = useTexture(snap.logoDecal);
  const fullTexture = useTexture(snap.fullDecal);

  // ── Generación reactiva de la textura de texto ──
  // Se regenera solo cuando cambian customText, textFont o textColor
  const textTexture = useMemo(() => {
    if (!snap.customText || !snap.customText.trim()) return null;
    return createTextTexture(snap.customText, snap.textFont, snap.textColor);
  }, [snap.customText, snap.textFont, snap.textColor]);

  // ── Interacción de arrastre: posiciona logo/texto en 3D ──
  const handlePointerMove = (e) => {
    e.stopPropagation();
    if (isDragging) {
      const { x, y, z } = e.point;
      // Si el texto está activo y el logo no, movemos el texto.
      // Si ambos están activos o solo el logo, movemos el logo.
      if (snap.isTextTexture && !snap.isLogoTexture) {
        state.textPosition = [x, y, z];
      } else {
        state.logoPosition = [x, y, z];
      }
    }
  };

  // ── Animación del color: interpolación suave en cada frame ──
  // easing.dampC evita cambios bruscos de color, creando una transición suave
  useFrame((state, delta) =>
    easing.dampC(materials.lambert1.color, snap.color, 0.25, delta)
  );

  return (
    <group>
      <mesh
        geometry={nodes.T_Shirt_male.geometry}
        material={materials.lambert1}
        material-roughness={1}
        dispose={null}
        // ── Eventos de interacción para arrastre ──
        onPointerDown={(e) => {
          e.stopPropagation();
          setIsDragging(true); // Activa el movimiento al presionar
        }}
        onPointerUp={(e) => {
          e.stopPropagation();
          setIsDragging(false); // Fija la posición al soltar
        }}
        onPointerOut={() => {
          setIsDragging(false); // Fija la posición si el cursor sale
        }}
        onPointerMove={handlePointerMove}
      >
        {/* ── Capa 1: Textura completa (fondo de la camiseta) ── */}
        {snap.isFullTexture && (
          <Decal
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1}
            map={fullTexture}
          />
        )}

        {/* ── Capa 2: Logo personalizado (calcomanía posicionable) ── */}
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

        {/* ── Capa 3: Texto personalizado (generado proceduralmente) ── */}
        {snap.isTextTexture && textTexture && (
          <Decal
            position={snap.textPosition}
            rotation={[0, 0, 0]}
            scale={snap.textScale}
            map={textTexture}
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