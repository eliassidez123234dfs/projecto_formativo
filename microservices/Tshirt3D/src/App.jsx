/**
 * Componente raíz (App) del microservicio Tshirt3D.
 *
 * Orquestra el flujo principal de la aplicación:
 * 1. Editor 3D (Header + Canvas + Customizer): el usuario diseña
 *    la camiseta en tiempo real sobre una escena Three.js.
 * 2. Previsualización (Preview): al crear un pedido, se muestra
 *    la imagen capturada del diseño y los detalles para confirmar.
 *
 * El estado `previewOrder` (React useState) controla la transición
 * entre el editor y la pantalla de previsualización. Cuando es `null`,
 * se muestra el editor; cuando tiene datos, se muestra Preview.
 *
 * Captura de imagen del diseño:
 * - `onOrderCreated={setPreviewOrder}` recibe un objeto con la imagen
 *   capturada (Data URL de canvas.toDataURL), color, texturas activas,
 *   escala del logo, etc.
 * - La Data URL se pasa a Preview que la muestra como <img> y la
 *   reenvía al backend Django al confirmar el pedido.
 *
 * Patrón de diseño: Microservicio frontend con separación clara
 * de responsabilidades — Canvas (renderizado 3D con R3F/Three.js),
 * Customizer (UI de personalización con Valtio para estado reactivo),
 * Preview (confirmación de pedido con comunicación REST a Django).
 *
 * RF-025: Editor de camisetas 3D interactivo.
 * RF-026: Personalización de diseño (colores, logos, textura).
 * RF-027: Los diseños pueden compartirse como plantillas comunitarias.
 */
import { useState } from "react";
import Canvas from "./canvas/index.jsx";
import Customizer from "./pages/Customizer.jsx";
import Header from "./components/Header.jsx";
import Preview from "./pages/Preview.jsx";

function App() {
  const [previewOrder, setPreviewOrder] = useState(null);

  return (
    <main className="app transition-all ease-in">
      {!previewOrder ? (
        <>
          <Header overlay={true} />
          <Canvas />
          <Customizer onOrderCreated={setPreviewOrder} />
        </>
      ) : (
        <Preview order={previewOrder} onBack={() => setPreviewOrder(null)} />
      )}
    </main>
  );
}

export default App;
