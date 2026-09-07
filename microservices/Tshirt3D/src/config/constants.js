/**
 * Constantes de configuración del editor 3D.
 *
 * Define las pestañas de la interfaz (EditorTabs), los filtros de
 * visualización (FilterTabs) y los tipos de calcomanías (DecalTypes)
 * que se pueden aplicar sobre la camiseta 3D.
 *
 * EditorTabs: ['colorpicker', 'filepicker'] — paneles de herramientas
 *   que se abren desde la barra lateral izquierda.
 * FilterTabs: ['logoShirt', 'stylishShirt'] — alternan entre la
 *   visualización del logo (calcomanía parcial) y la textura completa
 *   (cuerpo entero de la camiseta).
 * DecalTypes: Mapea cada tipo de calcomanía a su propiedad en el store
 *   de Valtio y al filtro correspondiente.
 *
 * RF-025: Las pestañas permiten alternar entre herramientas del editor.
 * RF-026: Los tipos de decal (logo/full) controlan qué textura se
 *         proyecta sobre la malla 3D.
 *
 * @react-three/fiber y Three.js: Estos valores constantes se usan
 *   desde los componentes de la UI (Customizer, Tab, FilePicker) para
 *   mutar el store de Valtio, lo que a su vez actualiza las texturas
 *   que @react-three/drei aplica a la malla 3D mediante el componente
 *   <Decal>.
 */
import { swatch, fileIcon, logoShirt, stylishShirt } from "../assets";

/** Pestañas del panel de edición (colores y subida de archivos) */
export const EditorTabs = [
  {
    name: "colorpicker",
    icon: swatch,
  },
  {
    name: "filepicker",
    icon: fileIcon,
  },
];

/** Pestañas de filtro que activan/desactivan logo y textura completa */
export const FilterTabs = [
  {
    name: "logoShirt",
    icon: logoShirt,
  },
  {
    name: "stylishShirt",
    icon: stylishShirt,
  },
];

/** Mapeo de tipos de calcomanía a propiedades del store y filtros */
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
