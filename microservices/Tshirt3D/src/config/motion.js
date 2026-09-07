/**
 * Animaciones de Framer Motion para el editor 3D.
 *
 * Define transiciones suaves (spring) para los paneles de la interfaz:
 * - `slideAnimation`: Deslizamiento desde cualquier dirección
 *   (left, right, up, down) con opacidad progresiva.
 * - `fadeAnimation`: Fundido de entrada/salida (opacity 0 ↔ 1).
 * - `headTextAnimation`, `headContentAnimation`, `headContainerAnimation`:
 *   Animaciones específicas para la pantalla de introducción/encabezado
 *   con diferentes tiempos de entrada (stagger).
 *
 * Framer Motion es una librería de animaciones declarativas para React
 * que utiliza springs físicos para lograr transiciones naturales y
 * suaves. Los springs simulan el comportamiento de un muelle: a mayor
 * stiffness, más rápida la animación; a mayor damping, menos rebote.
 *
 * Estas animaciones se aplican a los paneles del Customizer con
 * motion.div, motion.header, etc. para crear una experiencia fluida
 * al abrir/cerrar herramientas del editor.
 */

export const transition = { type: "spring", duration: 0.8 };

/** Animación de deslizamiento según la dirección especificada */
export const slideAnimation = (direction) => {
  return {
    initial: {
      x: direction === "left" ? -100 : direction === "right" ? 100 : 0,
      y: direction === "up" ? 100 : direction === "down" ? -100 : 0,
      opacity: 0,
      transition: { ...transition, delay: 0.5 },
    },
    animate: {
      x: 0,
      y: 0,
      opacity: 1,
      transition: { ...transition, delay: 0 },
    },
    exit: {
      x: direction === "left" ? -100 : direction === "right" ? 100 : 0,
      y: direction === "up" ? 100 : direction === "down" ? -100 : 0,
      transition: { ...transition, delay: 0 },
    },
  };
};

/** Animación de opacidad (fade in/out) */
export const fadeAnimation = {
  initial: {
    opacity: 0,
    transition: { ...transition, delay: 0.5 },
  },
  animate: {
    opacity: 1,
    transition: { ...transition, delay: 0 },
  },
  exit: {
    opacity: 0,
    transition: { ...transition, delay: 0 },
  },
};

/** Animación del título principal (desliza desde la derecha) */
export const headTextAnimation = {
  initial: { x: 100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: {
    type: "spring",
    damping: 5,
    stiffness: 40,
    restDelta: 0.001,
    duration: 0.3,
  },
};

/** Animación del contenido del encabezado (desliza desde abajo) */
export const headContentAnimation = {
  initial: { y: 100, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  transition: {
    type: "spring",
    damping: 7,
    stiffness: 30,
    restDelta: 0.001,
    duration: 0.6,
    delay: 0.2,
    delayChildren: 0.2,
  },
};

/** Animación del contenedor del encabezado (desliza desde la izquierda) */
export const headContainerAnimation = {
  initial: { x: -100, opacity: 0, transition: { ...transition, delay: 0.5 } },
  animate: { x: 0, opacity: 1, transition: { ...transition, delay: 0 } },
  exit: { x: -100, opacity: 0, transition: { ...transition, delay: 0 } },
};
