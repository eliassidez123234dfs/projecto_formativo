/**
 * Controlador de cámara y rotación orbital de la escena 3D.
 *
 * Gestiona la posición de la cámara y la rotación del grupo contenedor
 * de la camiseta para crear un efecto de órbita suave que sigue el
 * movimiento del puntero del ratón.
 *
 * - `useFrame`: Hook de @react-three/fiber que se ejecuta en cada frame
 *   del bucle de renderizado de Three.js. Recibe el estado de la escena
 *   (cámara, clock, pointer, etc.) y el delta de tiempo entre frames.
 * - `easing.damp3` (maath): Interpola suavemente la posición de la cámara
 *   hacia la posición objetivo usando damping exponencial. El factor 0.25
 *   controla la velocidad de la interpolación (más bajo = más lento).
 * - `easing.dampE` (maath): Interpola la rotación (Euler angles) del grupo
 *   en función de la posición del puntero (`state.pointer.x / y`), creando
 *   una rotación natural que sigue al ratón. La división por 7 y 2 suaviza
 *   la sensibilidad del movimiento.
 *
 * Comportamiento responsive:
 * - Pantallas ≤ 1260px: ajusta la posición inicial para pantallas anchas.
 * - Pantallas ≤ 600px (móvil): acerca la cámara y centra el modelo.
 * - Estado `intro`: posiciona la cámara para la vista de introducción.
 *
 * El store de Valtio (snap.intro) controla el modo de visualización
 * inicial. Cuando intro es true, la cámara se aleja para mostrar la
 * camiseta completa; cuando es false (modo editor), se acerca para
 * personalización detallada.
 *
 * RF-025: Proporciona la interacción orbital para el editor 3D.
 */
import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import { useSnapshot } from "valtio";

import state from "../store";

const CameraRig = ({ children }) => {
  const group = useRef();
  const snap = useSnapshot(state);

  useFrame((state, delta) => {
    const isBreakpoint = window.innerWidth <= 1260;
    const isMobile = window.innerWidth <= 600;

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

    easing.damp3(state.camera.position, targetPosition, 0.25, delta);

    easing.dampE(
      group.current.rotation,
      [state.pointer.y / 7, -state.pointer.x / 2, 0],
      0.2,
      delta
    );
  });

  return <group ref={group}>{children}</group>;
};

export default CameraRig;
