/**
 * Componente de pestaña (tab) reutilizable para el editor.
 *
 * Renderiza un botón con un icono que puede actuar como:
 * - Pestaña del editor (colorpicker / filepicker): al hacer clic,
 *   abre los paneles laterales (ColorPicker o FilePicker) en el
 *   Customizer.
 * - Pestaña de filtro (logoShirt / stylishShirt): activa/desactiva
 *   la visualización del logo o la textura completa sobre la camiseta
 *   3D mutando state.isLogoTexture / state.isFullTexture.
 *
 * Cuando es una pestaña de filtro activa (isFilterTab + isActiveTab),
 * el fondo toma el color actual del store (snap.color) con opacidad
 * reducida (0.5), integrándose visualmente con el diseño seleccionado.
 *
 * Se suscribe a Valtio (useSnapshot) para obtener el color actual
 * y aplicarlo dinámicamente al estilo de la pestaña activa.
 *
 * RF-025: Componente de UI del editor 3D interactivo.
 * RF-026: Control de visualización de logo/textura en la camiseta.
 */
import React from "react";
import { useSnapshot } from "valtio";

import state from "../store";

const Tab = ({ tab, isFilterTab, isActiveTab, handleClick }) => {
  const snap = useSnapshot(state);

  const activeStyles =
    isFilterTab && isActiveTab
      ? { backgroundColor: snap.color, opacity: 0.5 }
      : { backgroundColor: "transparent", opacity: 1 };

  return (
    <div
      key={tab.name}
      className={`tab-btn ${
        isFilterTab ? "rounded-full glassmorphism" : "rounded-4"
      }`}
      onClick={handleClick}
      style={activeStyles}
    >
      <img
        src={tab.icon}
        alt={tab.name}
        className={`${
          isFilterTab ? "w-2/3 h-2/3" : "w-11/12 h-11/12 object-contain"
        }`}
      />
    </div>
  );
};

export default Tab;
