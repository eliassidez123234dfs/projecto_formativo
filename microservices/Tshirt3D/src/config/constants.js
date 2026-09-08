/**
 * Constantes de configuración para el editor 3D de camisetas.
 *
 * Define las pestañas del editor, filtros de visualización y
 * el mapeo de tipos de calcomanía (decal) a propiedades del store.
 * Estas constantes se usan en Customizer.jsx para renderizar
 * los controles de la interfaz de personalización.
 */
import { swatch, fileIcon, logoShirt, stylishShirt, textIcon } from "../assets";

// ── Pestañas del panel de edición izquierdo ──
// Cada pestaña activa un componente diferente (ColorPicker, FilePicker, TextPicker)
export const EditorTabs = [
  {
    name: "colorpicker",
    icon: swatch,
    label: "Color de prenda",
  },
  {
    name: "filepicker",
    icon: fileIcon,
    label: "Subir imagen/logo",
  },
  {
    name: "textpicker",
    icon: textIcon,
    label: "Añadir texto",
  },
];

// ── Pestañas de filtro inferiores ──
// Activan/desactivan las capas de logo, texto y textura completa
export const FilterTabs = [
  {
    name: "logoShirt",
    icon: logoShirt,
    label: "Logo",
  },
  {
    name: "textShirt",
    icon: textIcon,
    label: "Texto",
  },
  {
    name: "stylishShirt",
    icon: stylishShirt,
    label: "Textura completa",
  },
];

// ── Mapeo de tipos de calcomanía (decal) ┅
// Conecta el tipo de imagen subida con la propiedad del store y el filtro
export const DecalTypes = {
  logo: {
    stateProperty: "logoDecal",
    filterTab: "logoShirt",
  },
  full: {
    stateProperty: "fullDecal",
    filterTab: "stylishShirt",
  },
};
