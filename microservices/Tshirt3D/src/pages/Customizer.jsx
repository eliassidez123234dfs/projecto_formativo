import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSnapshot } from "valtio";

import state from "../store";
import { reader, uploadCanvasToCloudinary, createModel3D, addDesignToCart } from "../config/helpers";
import { EditorTabs, FilterTabs, DecalTypes } from "../config/constants";
import { fadeAnimation, slideAnimation } from "../config/motion";
import { ColorPicker, FilePicker, Tab } from "../components";

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

  const [file, setFile] = useState("");
  const [activeEditorTab, setActiveEditorTab] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState({
    logoShirt: true,
    stylishShirt: false,
  });
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveLockSeconds, setSaveLockSeconds] = useState(0);

  useEffect(() => {
    if (saveLockSeconds <= 0) return undefined;
    const id = setInterval(() => setSaveLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [saveLockSeconds]);

  // Función para cambiar tamaño
  const handleScale = (amount) => {
    state.logoScale = Math.max(0.05, Math.min(0.5, state.logoScale + amount));
  };

  const generateTabContent = () => {
    switch (activeEditorTab) {
      case "colorpicker": return <ColorPicker />;
      case "filepicker": return <FilePicker file={file} setFile={setFile} readFile={readFile} />;
      default: return null;
    }
  };

  const handleDecals = (type, result) => {
    const decalType = DecalTypes[type];
    state[decalType.stateProperty] = result;
    if (!activeFilterTab[decalType.filterTab]) handleActiveFilterTab(decalType.filterTab);
  };

  const handleActiveFilterTab = (tabName) => {
    switch (tabName) {
      case "logoShirt": state.isLogoTexture = !activeFilterTab[tabName]; break;
      case "stylishShirt": state.isFullTexture = !activeFilterTab[tabName]; break;
      default: state.isLogoTexture = true; state.isFullTexture = false; break;
    }
    setActiveFilterTab((prev) => ({ ...prev, [tabName]: !prev[tabName] }));
  };

  const readFile = (type) => {
    reader(file).then((result) => {
      handleDecals(type, result);
      setActiveEditorTab("");
    });
  };

  const friendlyError = (err) => {
    const msg = err?.message || "";
    return CUSTOMER_ERROR_MAP[msg] || "Ocurrió un error al guardar. Inténtalo de nuevo.";
  };

  return (
    <AnimatePresence>
      {!snap.intro && (
        <>
          <motion.button
            type="button"
            className="editor-back-btn"
            onClick={() => {
              window.location.href = `${FRONTEND_URL}/catalog`;
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

          <motion.div key="custom" className="absolute top-0 left-0 z-10" {...slideAnimation("left")}>
            <div className="flex items-center min-h-screen">
              <div className="editortabs-container tabs">
                {EditorTabs.map((tab) => (
                  <Tab key={tab.name} tab={tab} handleClick={() => setActiveEditorTab(tab.name)} />
                ))}
                {generateTabContent()}
              </div>
            </div>
          </motion.div>

          {/* PANEL DERECHO: tamaño (vertical, pegado al borde derecho) */}
          <motion.div className="absolute top-1/2 transform -translate-y-1/2 right-2 z-10 flex flex-col gap-4" {...fadeAnimation}>
            <div className="p-2 glassmorphism rounded-lg border-[2px] border-white flex flex-col items-center gap-3 w-14 h-40 justify-center">
              <p className="text-white text-[10px] font-black uppercase text-center">Tamaño</p>
              <button onClick={() => handleScale(0.02)} className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white font-bold transition-all">+</button>
              <button onClick={() => handleScale(-0.02)} className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white font-bold transition-all">-</button>
            </div>
          </motion.div>

          <motion.div className="filtertabs-container" {...slideAnimation("up")}>
            {FilterTabs.map((tab) => (
              <Tab key={tab.name} tab={tab} isFilterTab isActiveTab={activeFilterTab[tab.name]} handleClick={() => handleActiveFilterTab(tab.name)} />
            ))}
            <button
              className="download-btn"
              title="Guardar diseño"
              onClick={async () => {
                if (isSaving) return;
                setSaveStatus("Subiendo el diseño...");
                setIsSaving(true);
                try {
                  const result = await uploadCanvasToCloudinary({ folder: "tshirtify_designs" });
                  const uploadedUrl = result.secure_url || result.url || "";

                  setSaveStatus("Guardando modelo...");
                  try {
                    await createModel3D({
                      name: `TshirtDesign ${Date.now()}`,
                      description: "Diseño generado desde Tshirt3D",
                      cloudinary_url: uploadedUrl,
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
                    productId: state.productId,
                    variantId: state.variantId,
                    quantity: state.quantity,
                  });

                  setSaveOk(true);
                  setSaveMessage("El diseño se guardó y se agregó al carrito para imprimir.");
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

          {/* Modal / Notificación de resultado del guardado */}
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
