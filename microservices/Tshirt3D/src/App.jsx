import { useState } from "react";
import Canvas from "./canvas/index.jsx";
import Customizer from "./pages/Customizer.jsx";
import Preview from "./pages/Preview.jsx";

function App() {
  const [previewOrder, setPreviewOrder] = useState(null);

  return (
    <main className="app transition-all ease-in">
      {!previewOrder ? (
        <>
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
