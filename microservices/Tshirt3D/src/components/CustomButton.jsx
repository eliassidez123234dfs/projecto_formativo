/**
 * Componente de botón personalizado con estilo dinámico.
 *
 * Renderiza un botón cuyo estilo se adapta al color actual del diseño:
 * - Tipo "filled": fondo con el color de la camiseta y texto contrastante.
 * - Tipo "outline": borde y texto del color de la camiseta.
 *
 * Utiliza `getContrastingColor` para asegurar legibilidad del texto
 * sobre cualquier color de fondo (negro sobre claros, blanco sobre oscuros).
 * La función calcula la luminancia relativa (fórmula W3C) del color
 * hexadecimal y determina si el texto debe ser negro o blanco.
 *
 * Se suscribe al store de Valtio (useSnapshot) para reaccionar a cambios
 * de color en tiempo real. Al mutar state.color desde ColorPicker, este
 * botón se re-renderiza automáticamente con los nuevos estilos.
 *
 * RF-026: Botones dinámicos que reflejan el color de personalización.
 */
import React from "react";
import { useSnapshot } from "valtio";

import state from "../store";
import { getContrastingColor } from "../config/helpers"; 

const CustomButton = ({ type, title, customStyles, handleClick }) => {
  const snap = useSnapshot(state);

  const generateStyle = (type) => {
    if (type === "filled") {
      return {
        backgroundColor: snap.color,
        color: getContrastingColor(snap.color),
      };
    } else if (type === "outline") {
      return {
        borderWidth: "1px",
        borderColor: snap.color,
        color: snap.color,
      };
    }
  };

  return (
    <button
      className={`px-2 py-1.5 flex-1 rounded-md ${customStyles}`}
      style={generateStyle(type)}
      onClick={handleClick}
    >
      {title}
    </button>
  );
};

export default CustomButton;
