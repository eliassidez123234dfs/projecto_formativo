/**
 * Rig de cámara orbital para la escena 3D.
 *
 * Controla dos comportamientos en cada frame (useFrame):
 * 1. Posición de la cámara: se adapta al tamaño de pantalla (responsive)
 *    y se interpola suavemente con easing.damp3 para evitar saltos.
 * 2. Rotación del modelo: combina la rotación manual/automática del usuario
 *    con el movimiento orbital suave que sigue al cursor del mouse.
 *
 * Patrones de Three.js / R3F:
 * - useFrame: hook de @react-three/fiber que ejecuta lógica en cada frame
 * - easing.damp3 / easing.dampE: interpolación suave tipo muelle (spring)
 *   de la librería maath, evita transiciones bruscas
 * - group ref: envuelve el contenido para rotarlo como unidad
 * - sceneState.pointer: posición normalizada del mouse (-1 a 1)
 */
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useSnapshot } from "valtio";

import state from "../store";

const CameraRig = ({ children }) => {
  const group = useRef();
  const snap = useSnapshot(state);

  // ── Bucle de animación: se ejecuta en cada frame del render ──
  useFrame((sceneState, delta) => {
    const isBreakpoint = window.innerWidth <= 1260;
    const isMobile = window.innerWidth <= 600;

    // ── Posición de la cámara responsive ──
    // Se ajusta según el breakpoint y si estamos en la pantalla de intro
    let targetPosition = [-0.4, 0, 2];
    if (snap.intro) {
      if (isBreakpoint) targetPosition = [0, 0, 2];
      if (isMobile) targetPosition = [0, 0.2, 2.5];
    } else {
      if (isMobile) {
        targetPosition = [0, 0, 2.5];
      } else {
        targetPosition = [0, 0, 2];
      }
    }
    // Interpola suavemente la posición de la cámara (factor 0.25 = velocidad)
    easing.damp3(sceneState.camera.position, targetPosition, 0.25, delta);

    // ── Rotación del modelo: automática vs manual ──
    if (snap.autoRotate && !snap.isCapturing) {
      // Modo auto-rotate: incrementa el ángulo continuamente
      state.targetRotationY += delta * 0.8;
      state.shirtRotationY = state.targetRotationY;
    } else if (!snap.isCapturing) {
      // Modo manual: interpola suavemente hacia el ángulo objetivo
      easing.damp(state, "shirtRotationY", snap.targetRotationY, 0.2, delta);
    }

    // ── Rotación orbital con el mouse ──
    // El cursor del mouse influye sutilmente en la rotación del modelo
    const mouseInfluenceY = snap.isCapturing ? 0 : sceneState.pointer.y / 7;
    const mouseInfluenceX = snap.isCapturing ? 0 : -sceneState.pointer.x / 2;

    // Se desactiva durante la captura de imagen para obtener vista fija
    if (snap.isCapturing) {
      group.current.rotation.set(0, snap.shirtRotationY, 0);
    } else {
      easing.dampE(
        group.current.rotation,
        [mouseInfluenceY, mouseInfluenceX + snap.shirtRotationY, 0],
        0.2,
        delta
      );
    }
  });

  // El group ref permite rotar todo el contenido como una unidad
  return <group ref={group}>{children}</group>;
};

export default CameraRig;
