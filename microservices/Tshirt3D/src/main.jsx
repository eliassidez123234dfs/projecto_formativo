/**
 * Punto de entrada del microservicio Tshirt3D.
 *
 * Monta la aplicación React en el DOM usando ReactDOM.createRoot.
 * Renderiza el componente App dentro de <React.StrictMode> para
 * detectar problemas potenciales en el desarrollo.
 *
 * Este microservicio frontend es responsable del editor 3D de
 * camisetas, completamente desacoplado del resto del ecosistema
 * Django. Se comunica con el backend a través de APIs REST para
 * crear pedidos y modelos 3D.
 *
 * --- Contexto técnico ---
 *
 * Three.js es una biblioteca JavaScript que permite renderizar gráficos
 * 3D en el navegador usando WebGL. @react-three/fiber es un "renderer"
 * declarativo para React que integra Three.js, permitiendo describir
 * escenas 3D con componentes JSX (cámaras, luces, mallas, etc.).
 *
 * Valtio es una librería de estado reactivo basada en proxies de
 * JavaScript. Al mutar directamente las propiedades de un objeto proxy,
 * Valtio notifica automáticamente a los componentes suscritos (mediante
 * useSnapshot) para que se re-rendericen solo cuando cambien los datos
 * que consumen.
 *
 * Comunicación con el backend Django (API REST):
 * - POST a /api/orders/ para crear pedidos de camisetas personalizadas.
 * - POST a /api/models3d/models/ para guardar diseños como plantillas
 *   comunitarias (RF-027).
 * - Subida opcional a Cloudinary para almacenamiento externo de imágenes.
 *
 * RF-025: Editor de camisetas 3D interactivo.
 * RF-026: Personalización de diseño (colores, logos, textura completa).
 * RF-027: Los diseños pueden compartirse como plantillas comunitarias
 *         a través del microservicio Models3D.
 *
 * Captura de imagen del diseño (canvas.toDataURL):
 * El canvas de Three.js se captura como imagen PNG mediante el método
 * toDataURL("image/png") del elemento <canvas>. Esto permite descargar
 * el diseño, subirlo a Cloudinary o enviarlo al backend como parte del
 * pedido. La propiedad preserveDrawingBuffer: true en el Canvas de
 * Three.js asegura que el búfer esté disponible para la captura.
 */
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
