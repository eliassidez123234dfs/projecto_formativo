import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSnapshot } from "valtio";

import state from "../store";
import { reader, uploadCanvasToCloudinary, createModel3D } from "../config/helpers";
import { EditorTabs, FilterTabs, DecalTypes } from "../config/constants";
import { fadeAnimation, slideAnimation } from "../config/motion";
import { ColorPicker, FilePicker, Tab } from "../components";

const Customizer = ({ onOrderCreated }) => {
  const snap = useSnapshot(state);

  const [file, setFile] = useState("");
  const [activeEditorTab, setActiveEditorTab] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState({
    logoShirt: true,
    stylishShirt: false,
  });
  const [cloudinaryUrl, setCloudinaryUrl] = useState("");
  const [cloudinaryStatus, setCloudinaryStatus] = useState("");
  const [isUploadingToCloudinary, setIsUploadingToCloudinary] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  return (
    <AnimatePresence>
      {!snap.intro && (
        <>
          <motion.button
            type="button"
            className="editor-back-btn"
            onClick={() => {
              window.location.href = 'http://localhost:5173/admin';
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <span aria-hidden="true">←</span>
            <span>Volver al dashboard</span>
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
              title="Enviar diseño"
              onClick={async () => {
                if (isUploadingToCloudinary) return;
                setCloudinaryStatus("Subiendo a Cloudinary...");
                setIsUploadingToCloudinary(true);
                try {
                  const result = await uploadCanvasToCloudinary({ folder: "tshirtify_designs" });
                  const uploadedUrl = result.secure_url || result.url || "";
                  setCloudinaryUrl(uploadedUrl);
                  setCloudinaryStatus("Subida completada");

                  try {
                    setCloudinaryStatus("Guardando en Models3D...");
                    const saved = await createModel3D({
                      name: `TshirtDesign ${Date.now()}`,
                      description: "Diseño generado desde Tshirt3D",
                      cloudinary_url: uploadedUrl,
                      cloudinary_public_id: result.public_id || null,
                      file_type: "png",
                      file_size: result.bytes || null,
                      is_active: true,
                      is_approved: false,
                    });
                    setCloudinaryStatus("Guardado en Models3D: id " + (saved.id || "(sin id)"));
                    setShowSuccessModal(true);
                  } catch (backendError) {
                    setCloudinaryStatus(backendError.message || "Error guardando en Models3D");
                    setShowSuccessModal(true);
                  }
                } catch (error) {
                  setCloudinaryStatus(error.message || "Error al subir a Cloudinary");
                } finally {
                  setIsUploadingToCloudinary(false);
                }
              }}
              disabled={isUploadingToCloudinary}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3/5 h-3/5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </motion.div>

          {/* Modal / Notificación Superior Izquierda */}
          <AnimatePresence>
            {showSuccessModal && (
              <motion.div
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -50, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="fixed top-4 left-4 z-50 max-w-sm rounded-2xl p-4 shadow-2xl glassmorphism border border-emerald-500/40 bg-slate-900/90 text-white backdrop-blur-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                    ✓
                  </div>
                  <div className="flex-1 pr-1">
                    <h4 className="text-sm font-bold text-emerald-400">Diseño enviado satisfactoriamente</h4>
                    <p className="text-xs text-slate-300 mt-1">El diseño 3D ha sido subido y guardado correctamente.</p>
                    {cloudinaryUrl && (
                      <a
                        href={cloudinaryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block text-[11px] text-cyan-300 hover:underline mt-2 break-all"
                      >
                        Ver en Cloudinary →
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => setShowSuccessModal(false)}
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