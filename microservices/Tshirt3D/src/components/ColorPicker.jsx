/**
 * Componente selector de color para la camiseta 3D.
 *
 * Utiliza `SketchPicker` de la librería react-color para mostrar
 * un selector de color con paleta de colores predefinidos (16 colores).
 * Al seleccionar un color, muta directamente el store de Valtio
 * (`state.color = color.hex`), lo que dispara la actualización
 * reactiva del color de la malla 3D en Shirt.jsx mediante el hook
 * useFrame con easing.dampC.
 *
 * Valtio: La mutación directa `state.color = color.hex` es posible
 * gracias a los proxies de JavaScript. Valtio intercepta la asignación,
 * notifica a los suscriptores (useSnapshot), y solo los componentes
 * que dependen de `snap.color` se re-renderizan.
 *
 * - Sin canal alpha (disableAlpha=true).
 * - 16 colores preestablecidos como paleta rápida.
 *
 * RF-026: Personalización del color de la camiseta en tiempo real.
 */
import React from "react";
import { SketchPicker } from "react-color";
import { useSnapshot } from "valtio";

import state from "../store";

const ColorPicker = () => {
  const snap = useSnapshot(state);

  return (
    <div className="absolute left-full ml-3">
      <SketchPicker
        color={snap.color}
        disableAlpha
        presetColors={[
          "#000000",
          "#353934",
          "#ccc",
          "#80C670",
          "#5F3",
          "#EFBD4E",
          "#00008b",
          "#5123DA",
          "#726DE8",
          "#7098DA",
          "#2CCCE4",
          "#ff8a65",
          "#C19277",
          "#8B0000",
          "#512314",
          "#5F123D",
        ]}
        onChange={(color) => (state.color = color.hex)}
      />
    </div>
  );
};

export default ColorPicker;
