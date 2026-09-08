/**
 * Página principal del editor 3D de camisetas.
 *
 * Orquesta la interfaz de personalización con tres paneles:
 * 1. Panel izquierdo: herramientas de edición (ColorPicker, FilePicker, TextPicker)
 * 2. Panel derecho: controles de rotación 360° y escala del diseño
 * 3. Panel inferior: filtros de capas (logo, texto, textura) y botón de guardar
 *
 * Flujo de guardado:
 * 1. Captura vistas frontal/posterior del canvas 3D
 * 2. Sube ambas a Cloudinary
 * 3. Guarda el modelo 3D en el microservicio Models3D (RF-027)
 * 4. Agrega el diseño al carrito de compras
 *
 * Patrones de Framer Motion:
 * - AnimatePresence: transiciones de entrada/salida de componentes
 * - motion.div: envoltorios animados con slideAnimation/fadeAnimation
 * - Los botones usan whileHover/whileTap para micro-interacciones
 */
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSnapshot } from "valtio";

import state from "../store";
import { reader, uploadCanvasToCloudinary, createModel3D, addDesignToCart } from "../config/helpers";
import { EditorTabs, FilterTabs, DecalTypes } from "../config/constants";
import { fadeAnimation, slideAnimation } from "../config/motion";
import { ColorPicker, FilePicker, TextPicker, Tab } from "../components";

// ── Mapa de errores amigables para el usuario ──
const CUSTOMER_ERROR_MAP = {
  "Falta configuración de Cloudinary. Define VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET.":
    "Error de configuración del editor. Contacta al administrador.",
  "No se encontró el canvas para subir a Cloudinary.":
    "No se pudo capturar el diseño. Intenta recargar la página.",
  "No se pudo capturar el canvas como imagen.":
    "Error al capturar la imagen. Intenta de nuevo.",
};

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

const Customizer = () => {
  const snap = useSnapshot(state);

  // ── Estado local de la UI del editor ──
  const [file, setFile] = useState("");                    // Archivo seleccionado para logo/full
  const [activeEditorTab, setActiveEditorTab] = useState(""); // Pestaña activa del panel izquierdo
  const [activeFilterTab, setActiveFilterTab] = useState({   // Estado de los filtros de capa
    logoShirt: true,
    textShirt: false,
    stylishShirt: false,
  });
  const [saveStatus, setSaveStatus] = useState("");        // Mensaje de progreso al guardar
  const [isSaving, setIsSaving] = useState(false);        // Lock contra clics múltiples
  const [showResultModal, setShowResultModal] = useState(false); // Modal de resultado
  const [saveOk, setSaveOk] = useState(false);             // Éxito/error del guardado
  const [saveMessage, setSaveMessage] = useState("");      // Mensaje del resultado
  const [saveLockSeconds, setSaveLockSeconds] = useState(0); // Cooldown tras error

  // ── Sincronización de filtros con el store ──
  useEffect(() => {
    setActiveFilterTab((prev) => ({
      ...prev,
      textShirt: Boolean(snap.isTextTexture),
    }));
  }, [snap.isTextTexture]);

  useEffect(() => {
    if (saveLockSeconds <= 0) return undefined;
    const id = setInterval(() => setSaveLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [saveLockSeconds]);

  // ── Escala del diseño (logo + texto) ──
  const handleScale = (amount) => {
    state.logoScale = Math.max(0.05, Math.min(0.5, state.logoScale + amount));
    state.textScale = Math.max(0.05, Math.min(0.5, state.textScale + amount));
  };

  // ── Renderizado condicional del contenido del panel izquierdo ──
  const generateTabContent = () => {
    switch (activeEditorTab) {
      case "colorpicker": return <ColorPicker />;
      case "filepicker": return <FilePicker file={file} setFile={setFile} readFile={readFile} />;
      case "textpicker": return <TextPicker />;
      default: return null;
    }
  };

  // ── Gestión de calcomanías (decals): asigna imagen al store ──
  const handleDecals = (type, result) => {
    const decalType = DecalTypes[type];
    state[decalType.stateProperty] = result;
    if (!activeFilterTab[decalType.filterTab]) handleActiveFilterTab(decalType.filterTab);
  };

  // ── Toggle de capas de visualización ──
  const handleActiveFilterTab = (tabName) => {
    switch (tabName) {
      case "logoShirt":
        state.isLogoTexture = !activeFilterTab[tabName];
        break;
      case "textShirt":
        state.isTextTexture = !activeFilterTab[tabName];
        break;
      case "stylishShirt":
        state.isFullTexture = !activeFilterTab[tabName];
        break;
      default:
        state.isLogoTexture = true;
        state.isFullTexture = false;
        break;
    }
    setActiveFilterTab((prev) => ({ ...prev, [tabName]: !prev[tabName] }));
  };

  // ── Lectura y aplicación de archivo seleccionado ──
  const readFile = (type) => {
    reader(file).then((result) => {
      handleDecals(type, result);
      setActiveEditorTab("");
    });
  };

  // ── Traducción de errores técnicos a mensajes amigables ──
  const friendlyError = (err) => {
    const msg = err?.message || "";
    return CUSTOMER_ERROR_MAP[msg] || "Ocurrió un error al guardar. Inténtalo de nuevo.";
  };

  return (
    <AnimatePresence>
      {!snap.intro && (
        <>
          {/* ── Botón "Volver al catálogo" ── */}
          <motion.button
            type="button"
            className="editor-back-btn"
            onClick={() => {
              window.location.href = import.meta.env.VITE_FRONTEND_URL || (
                import.meta.env.DEV ? 'http://127.0.0.1:5173/catalog' : '/catalog'
              );
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span aria-hidden="true">←</span>
            <span>Volver al catálogo</span>
          </motion.button>

          {/* ── Panel izquierdo: herramientas de edición (ColorPicker, FilePicker, TextPicker) ── */}
          <motion.div key="custom" className="absolute top-0 left-0 z-10" {...slideAnimation("left")}>
            <div className="flex items-center min-h-screen">
              <div className="editortabs-container tabs">
                {EditorTabs.map((tab) => (
                  <Tab
                    key={tab.name}
                    tab={tab}
                    handleClick={() => {
                      if (activeEditorTab === tab.name) {
                        setActiveEditorTab("");
                      } else {
                        setActiveEditorTab(tab.name);
                      }
                    }}
                  />
                ))}
                {generateTabContent()}
              </div>
            </div>
          </motion.div>

          {/* PANEL DERECHO: controles de rotación 360° y tamaño */}
          <motion.div className="absolute top-1/2 transform -translate-y-1/2 right-2 z-10 flex flex-col gap-3" {...fadeAnimation}>
            {/* Controles de Rotación 360° */}
            <div className="p-2 glassmorphism rounded-xl border-[1.5px] border-white/40 flex flex-col items-center gap-2 w-16 shadow-xl backdrop-blur-md">
              <p className="text-white text-[9px] font-black uppercase text-center tracking-wider">360° Giro</p>
              
              <button
                type="button"
                onClick={() => {
                  state.autoRotate = false;
                  state.targetRotationY = 0;
                }}
                className={`w-12 py-1 px-1 rounded-md text-[10px] font-bold transition-all ${
                  Math.abs(snap.targetRotationY % (2 * Math.PI)) < 0.2
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
                title="Vista Frontal (0°)"
              >
                Frente
              </button>

              <button
                type="button"
                onClick={() => {
                  state.autoRotate = false;
                  state.targetRotationY = Math.PI;
                }}
                className={`w-12 py-1 px-1 rounded-md text-[10px] font-bold transition-all ${
                  Math.abs((snap.targetRotationY % (2 * Math.PI)) - Math.PI) < 0.2
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : "bg-white/20 hover:bg-white/30 text-white"
                }`}
                title="Vista Posterior (180°)"
              >
                Atrás
              </button>

              <div className="flex gap-1 w-full justify-center">
                <button
                  type="button"
                  onClick={() => {
                    state.autoRotate = false;
                    state.targetRotationY -= Math.PI / 4;
                  }}
                  className="w-5 h-7 bg-white/20 hover:bg-white/40 rounded text-white font-bold text-xs flex items-center justify-center transition-all"
                  title="Girar 45° a la izquierda"
                >
                  ⟲
                </button>
                <button
                  type="button"
                  onClick={() => {
                    state.autoRotate = false;
                    state.targetRotationY += Math.PI / 4;
                  }}
                  className="w-5 h-7 bg-white/20 hover:bg-white/40 rounded text-white font-bold text-xs flex items-center justify-center transition-all"
                  title="Girar 45° a la derecha"
                >
                  ⟳
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  state.autoRotate = !state.autoRotate;
                }}
                className={`w-12 py-1 px-1 rounded-md text-[9px] font-bold transition-all ${
                  snap.autoRotate
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 animate-pulse"
                    : "bg-white/20 hover:bg-white/30 text-white/90"
                }`}
                title="Activar/Desactivar giro automático continuo"
              >
                {snap.autoRotate ? "Pausa" : "Auto"}
              </button>
            </div>

            {/* Controles de Escala / Tamaño */}
            <div className="p-2 glassmorphism rounded-xl border-[1.5px] border-white/40 flex flex-col items-center gap-2 w-16 shadow-xl backdrop-blur-md">
              <p className="text-white text-[9px] font-black uppercase text-center tracking-wider">Tamaño</p>
              <button
                type="button"
                onClick={() => handleScale(0.02)}
                className="w-10 h-8 bg-white/20 hover:bg-white/40 rounded-lg text-white font-bold transition-all text-sm flex items-center justify-center"
                title="Agrandar diseño"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => handleScale(-0.02)}
                className="w-10 h-8 bg-white/20 hover:bg-white/40 rounded-lg text-white font-bold transition-all text-sm flex items-center justify-center"
                title="Reducir diseño"
              >
                -
              </button>
            </div>
          </motion.div>

          {/* ── Panel inferior: filtros de capa + botón guardar ── */}
          <motion.div className="filtertabs-container" {...slideAnimation("up")}>
            {FilterTabs.map((tab) => (
              <Tab
                key={tab.name}
                tab={tab}
                isFilterTab
                isActiveTab={activeFilterTab[tab.name]}
                handleClick={() => handleActiveFilterTab(tab.name)}
              />
            ))}
            {/* ── Botón de guardado: captura → Cloudinary → Models3D → Carrito ── */}
            <button
              className="download-btn"
              title="Guardar diseño y capturar vistas front/back"
              onClick={async () => {
                if (isSaving) return;
                setSaveStatus("Capturando vistas frente y atrás...");
                setIsSaving(true);
                try {
                  const result = await uploadCanvasToCloudinary({ folder: "tshirtify_designs" });
                  const frontUrl = result.front_url || result.secure_url || result.url || "";
                  const backUrl = result.back_url || "";

                  setSaveStatus("Guardando modelo...");
                  try {
                    await createModel3D({
                      name: `TshirtDesign ${Date.now()}`,
                      description: "Diseño generado con vistas frente y reverso 3D",
                      cloudinary_url: frontUrl,
                      cloudinary_public_id: result.public_id || null,
                      file_type: "png",
                      file_size: result.bytes || null,
                      is_active: true,
                      is_approved: false,
                    });
                  } catch (backendError) {
                    // Continuar aunque falle el backend
                  }

                  setSaveStatus("Agregando al carrito...");
                  await addDesignToCart({
                    designPreviewUrl: frontUrl,
                    designData: {
                      frontPreviewUrl: frontUrl,
                      backPreviewUrl: backUrl,
                      designColor: state.color,
                      colorName: state.colorName,
                      size: state.size,
                      logoTexture: state.logoDecal,
                      fullTexture: state.fullDecal,
                      logoScale: state.logoScale,
                      customText: state.customText,
                      textColor: state.textColor,
                      textFont: state.textFont,
                      textScale: state.textScale,
                    },
                  });

                  setSaveOk(true);
                  setSaveMessage("El diseño se guardó (vistas frente y atrás) y se agregó al carrito para imprimir.");
                } catch (error) {
                  setSaveOk(false);
                  setSaveMessage(friendlyError(error));
                  setSaveLockSeconds(10);
                } finally {
                  setIsSaving(false);
                  setSaveStatus("");
                  setShowResultModal(true);
                }
              }}
              disabled={isSaving}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3/5 h-3/5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
            {saveLockSeconds > 0 && (
              <span className="text-white/90 text-[11px] font-semibold bg-red-900/80 backdrop-blur-md rounded-full px-3 py-1.5 border border-red-400/40">
                Espera {saveLockSeconds}s para reintentar
              </span>
            )}
            {saveStatus && (
              <span className="text-white/90 text-[11px] font-semibold bg-slate-900/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20">
                {saveStatus}
              </span>
            )}
          </motion.div>

          {/* ── Modal de notificación de resultado ── */}
          <AnimatePresence>
            {showResultModal && (
              <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={
                  "fixed top-4 right-4 z-50 max-w-sm rounded-2xl p-4 shadow-2xl glassmorphism border backdrop-blur-md " +
                  (saveOk
                    ? "border-emerald-500/40 bg-slate-900/90 text-white"
                    : "border-red-500/40 bg-red-950/90 text-white")
                }
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg " +
                      (saveOk
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400")
                    }
                  >
                    {saveOk ? "✓" : "✕"}
                  </div>
                  <div className="flex-1 pr-1">
                    <h4
                      className={
                        "text-sm font-bold " +
                        (saveOk ? "text-emerald-400" : "text-red-300")
                      }
                    >
                      {saveOk
                        ? "Modelo guardado con éxito"
                        : "No se pudo guardar el modelo"}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      {saveMessage}
                      {saveOk && state.productId && (
                        <span className="block mt-1">
                          Producto #{state.productId}
                          {state.size ? ` · Talla ${state.size}` : ""}
                          {state.colorName ? ` · ${state.colorName}` : ""}
                        </span>
                      )}
                    </p>
                    {saveOk && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        <a
                          href={`${FRONTEND_URL}/cart`}
                          className="inline-block text-[11px] font-semibold text-emerald-300 border border-emerald-400/40 rounded-full px-3 py-1 hover:bg-emerald-400/10"
                        >
                          Ver carrito →
                        </a>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowResultModal(false)}
                    className="text-slate-400 hover:text-white text-lg font-bold leading-none px-1 py-0.5 rounded"
                    title="Cerrar"
                  >
                    ×
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default Customizer;
