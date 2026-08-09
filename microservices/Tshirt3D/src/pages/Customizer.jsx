/**
 * Página de personalización del editor 3D (Customizer).
 *
 * Panel de control principal del diseño de la camiseta. Proporciona
 * las herramientas para modificar colores, logos, texturas y la
 * iluminación de la escena 3D en tiempo real.
 *
 * Funcionalidades:
 * - Selector de color (ColorPicker) con paleta predefinida.
 * - Subida de imágenes (FilePicker) para logos y texturas completas.
 * - Control de tamaño del logo (escala) con botones + / -.
 * - Control deslizante de intensidad de luz.
 * - Filtros para alternar entre logo y textura completa.
 * - Botón de "Restaurar diseño original".
 * - Subida a Cloudinary + guardado en Models3D (RF-027).
 *
 * La UI se compone de tres paneles animados con Framer Motion:
 * - Panel izquierdo (slideAnimation "left"): pestañas del editor
 *   (colorpicker, filepicker) que abren ColorPicker y FilePicker.
 * - Panel derecho (fadeAnimation): controles de tamaño del logo y
 *   deslizador de intensidad de luz (0-100).
 * - Panel inferior (slideAnimation "up"): filtros (logoShirt/
 *   stylishShirt), botón restaurar y botón de subida a Cloudinary.
 *
 * Comunicación con Valtio:
 * - Todas las interacciones mutan directamente el proxy de estado:
 *   state.color, state.logoScale, state.lightIntensity, etc.
 * - El canvas 3D (Shirt.jsx) reacciona automáticamente mediante
 *   useSnapshot para actualizar colores y texturas.
 *
 * RF-025: Interfaz del editor 3D interactivo.
 * RF-026: Personalización completa del diseño (colores, logos, texto).
 * RF-027: Los diseños pueden subirse a Cloudinary y compartirse como
 *         plantillas comunitarias a través de Models3D.
 *
 * Patrón de diseño: Microservicio frontend — este componente es la
 * UI de personalización, separada del canvas 3D y del store.
 */
import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSnapshot } from "valtio";

import state from "../store";
import { download } from "../assets";
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

          <motion.div className="absolute top-1/2 transform -translate-y-1/2 right-2 z-10 flex flex-col gap-4" {...fadeAnimation}>
            <div className="p-2 glassmorphism rounded-lg border-[2px] border-white flex flex-col items-center gap-3 w-14 h-40 justify-center">
              <p className="text-white text-[10px] font-black uppercase text-center">Tamaño</p>
              <button onClick={() => handleScale(0.02)} className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white font-bold transition-all">+</button>
              <button onClick={() => handleScale(-0.02)} className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white font-bold transition-all">-</button>
            </div>

            <div className="p-2 glassmorphism rounded-lg border-[2px] border-white flex flex-col items-center gap-2 w-14 h-40 justify-center">
              <p className="text-white text-[10px] font-black uppercase text-center">Luz</p>
              <input
                type="range"
                min="0"
                max="100"
                value={snap.lightIntensity}
                onChange={(e) => (state.lightIntensity = Number(e.target.value))}
                className="w-24 -rotate-90 origin-center mb-8"
              />
              <span className="text-white text-[10px] font-bold">{snap.lightIntensity}</span>
            </div>
          </motion.div>

          <motion.div className="filtertabs-container" {...slideAnimation("up")}>
            {FilterTabs.map((tab) => (
              <Tab key={tab.name} tab={tab} isFilterTab isActiveTab={activeFilterTab[tab.name]} handleClick={() => handleActiveFilterTab(tab.name)} />
            ))}
            <button
              className="text-white text-[10px] font-black uppercase bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition-all border border-white/30"
              onClick={() => {
                state.color = '#353934';
                state.isLogoTexture = true;
                state.isFullTexture = false;
                state.logoDecal = './superman_logo1.png';
                state.fullDecal = './circuit.png';
                state.logoPosition = [0, 0.04, 0.15];
                state.logoScale = 0.15;
                state.lightIntensity = 50;
                setFile("");
                setActiveEditorTab("");
                setActiveFilterTab({ logoShirt: true, stylishShirt: false });
              }}
            >
              Restaurar diseño original
            </button>
            <button
              className="download-btn"
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
                      file_type: "glb",
                      file_size: result.bytes || null,
                      is_active: true,
                      is_approved: false,
                    });
                    setCloudinaryStatus("Guardado en Models3D: id " + (saved.id || "(sin id)"));
                  } catch (backendError) {
                    setCloudinaryStatus(backendError.message || "Error guardando en Models3D");
                  }
                } catch (error) {
                  setCloudinaryStatus(error.message || "Error al subir a Cloudinary");
                } finally {
                  setIsUploadingToCloudinary(false);
                }
              }}
              disabled={isUploadingToCloudinary}
            >
              <img src={download} alt="upload" className="w-3/5 h-3/5 object-contain" />
            </button>
          </motion.div>
          {cloudinaryUrl && (
            <div className="mt-4 rounded-2xl bg-slate-900/90 p-4 text-xs text-slate-200">
              <p className="font-semibold text-slate-100">Cloudinary URL</p>
              <a href={cloudinaryUrl} target="_blank" rel="noreferrer" className="break-all text-cyan-300">
                {cloudinaryUrl}
              </a>
            </div>
          )}
          {cloudinaryStatus && !cloudinaryUrl && (
            <div className="mt-4 rounded-2xl bg-slate-900/90 p-4 text-xs text-slate-200">
              {cloudinaryStatus}
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default Customizer;