/**
 * Componente de personalización de texto 3D para la camiseta.
 *
 * Permite al usuario:
 * - Escribir un texto personalizado (máx. 40 caracteres)
 * - Seleccionar tipografía de una lista predefinida
 * - Elegir color del texto con paleta rápida o selector nativo
 * - Activar/desactivar la capa de texto en el modelo 3D
 *
 * Flujo de datos:
 * - Los cambios se propagan al store de Valtio (state.customText, etc.)
 * - Shirt.jsx genera dinámicamente un CanvasTexture con el texto
 * - El Decal de Three.js aplica la textura sobre la superficie 3D
 *
 * Patrón Valtio: mutación directa del state dispara re-render
 * en componentes que usen useSnapshot(state).
 */
import { useSnapshot } from "valtio";
import state from "../store";

// ── Tipografías disponibles para el texto ──
const FONTS = [
  { id: "Impact", label: "Impact" },
  { id: "Arial", label: "Arial" },
  { id: "Helvetica", label: "Helvetica" },
  { id: "Times New Roman", label: "Times" },
  { id: "Courier New", label: "Courier" },
  { id: "Georgia", label: "Georgia" },
  { id: "Trebuchet MS", label: "Trebuchet" },
];

const PRESET_COLORS = [
  "#FFFFFF",
  "#000000",
  "#EF4444",
  "#F59E0B",
  "#10B981",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
];

const TextPicker = () => {
  const snap = useSnapshot(state);

  // ── Handlers de personalización ──
  // Cada mutación directa al store dispara la regeneración del CanvasTexture
  const handleTextChange = (e) => {
    state.customText = e.target.value;
    if (e.target.value.trim().length > 0) {
      state.isTextTexture = true;
    }
  };

  const handleFontChange = (fontId) => {
    state.textFont = fontId;
  };

  const handleColorChange = (hex) => {
    state.textColor = hex;
  };

  const toggleText = () => {
    state.isTextTexture = !state.isTextTexture;
  };

  const clearText = () => {
    state.customText = "";
    state.isTextTexture = false;
  };

  return (
    <div className="textpicker-container">
      <div className="flex justify-between items-center mb-2">
        <label htmlFor="custom-shirt-text" className="text-xs font-bold text-gray-800 uppercase tracking-wider">
          Texto en prenda
        </label>
        {snap.customText && (
          <button
            type="button"
            onClick={clearText}
            className="text-[10px] text-red-600 hover:text-red-700 font-semibold"
          >
            Limpiar
          </button>
        )}
      </div>

      {/* ── Input de texto ── */}
      <input
        id="custom-shirt-text"
        type="text"
        value={snap.customText}
        onChange={handleTextChange}
        placeholder="Escribe tu texto..."
        maxLength={40}
        className="w-full text-xs px-2.5 py-1.5 rounded-md border border-gray-300 bg-white/90 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2.5"
      />

      {/* ── Selector de Tipografía ── */}
      <div className="mb-2.5">
        <span className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
          Fuente
        </span>
        <select
          value={snap.textFont}
          onChange={(e) => handleFontChange(e.target.value)}
          className="w-full text-xs px-2 py-1 rounded-md border border-gray-300 bg-white/90 text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id} style={{ fontFamily: f.id }}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* ── Selector de Color del Texto ── */}
      <div className="mb-2.5">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-bold text-gray-700 uppercase">
            Color
          </span>
          <span className="text-[10px] font-mono text-gray-500">
            {snap.textColor}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleColorChange(c)}
              style={{ backgroundColor: c }}
              className={`w-5 h-5 rounded-full border border-gray-300 shadow-sm transition-transform ${
                snap.textColor === c ? "scale-125 ring-2 ring-blue-500 ring-offset-1" : "hover:scale-110"
              }`}
              title={c}
            />
          ))}
          <input
            type="color"
            value={snap.textColor}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-5 h-5 rounded-full p-0 border-0 cursor-pointer overflow-hidden"
            title="Elegir otro color"
          />
        </div>
      </div>

      {/* ── Botones de acción ── */}
      <div className="mt-auto pt-1 flex gap-1.5">
        <button
          type="button"
          onClick={toggleText}
          disabled={!snap.customText.trim()}
          className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-md transition-all ${
            !snap.customText.trim()
              ? "bg-gray-300/50 text-gray-400 cursor-not-allowed"
              : snap.isTextTexture
              ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              : "bg-gray-800 text-white shadow-sm hover:bg-gray-900"
          }`}
        >
          {snap.isTextTexture ? "✓ Activo en 3D" : "Aplicar al 3D"}
        </button>
      </div>
    </div>
  );
};

export default TextPicker;
