/**
 * Punto de exportación unificado de componentes reutilizables.
 *
 * Facilita las importaciones desde otros módulos permitiendo:
 *   import { CustomButton, ColorPicker, FilePicker, Tab } from "../components";
 *
 * Estos componentes forman parte del microservicio frontend Tshirt3D
 * y se comunican con el store de Valtio para reflejar cambios de
 * personalización en tiempo real sobre el canvas 3D de Three.js.
 *
 * RF-025: Componentes compartidos del editor 3D interactivo.
 */
import CustomButton from "./CustomButton";
import ColorPicker from "./ColorPicker";
import FilePicker from "./FilePicker";
import Tab from "./Tab";

export { CustomButton, ColorPicker, FilePicker, Tab };
