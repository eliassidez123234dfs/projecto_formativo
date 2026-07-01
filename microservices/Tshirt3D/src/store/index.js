/**
 * Store de estado reactivo del editor 3D de camisetas.
 *
 * Utiliza Valtio (Proxy-based state management) para crear un estado
 * reactivo global. Cualquier mutación directa sobre las propiedades
 * del objeto `state` dispara automáticamente la re-renderización de
 * los componentes que lo consumen mediante `useSnapshot`.
 *
 * Valtio se basa en el mecanismo de Proxy de JavaScript: al envolver
 * un objeto con `proxy()`, las operaciones de asignación (set) quedan
 * interceptadas, permitiendo que Valtio notifique a los suscriptores
 * exactamente qué propiedades cambiaron. Esto evita re-renderizados
 * innecesarios comparado con soluciones como Redux o Context.
 *
 * Patrón usado: Microservicio frontend — este store es la única fuente
 * de verdad (single source of truth) para toda la configuración del
 * diseño 3D, manteniendo separada la lógica de presentación.
 *
 * RF-025: Editor de camisetas 3D interactivo.
 * RF-026: Personalización de diseño (colores, logos, textura completa).
 * RF-027: Los diseños pueden compartirse como plantillas comunitarias
 *         a través de la URL de Cloudinary almacenada en Models3D.
 */
import {proxy} from 'valtio';

const state = proxy({
  /** @property {boolean} intro - Controla si se muestra la pantalla de introducción o el editor */
  intro: false,
  /** @property {boolean} captureTransparent - Bandera para capturar el canvas con fondo transparente */
  captureTransparent: false,
  /** @property {string} color - Color hexadecimal de la camiseta (ej. '#353934') */
  color: '#353934',
  /** @property {boolean} isLogoTexture - Indica si el logo personalizado está activo */
  isLogoTexture: true,
  /** @property {boolean} isFullTexture - Indica si la textura de cuerpo completo está activa */
  isFullTexture: false,
  /** @property {string} logoDecal - Ruta o data URL de la imagen del logo */
  logoDecal: './superman_logo1.png',
  /** @property {string} fullDecal - Ruta o data URL de la textura completa */
  fullDecal: './circuit.png',
  /** @property {number[]} logoPosition - Posición [x, y, z] del logo sobre la malla 3D */
  logoPosition: [0, 0.04, 0.15],
  /** @property {number} logoScale - Escala del logo sobre la camiseta (0.05 - 0.5) */
  logoScale: 0.15,
  /** @property {number} lightIntensity - Intensidad de la luz ambiental (0 - 100) */
  lightIntensity: 50,
});

export default state;