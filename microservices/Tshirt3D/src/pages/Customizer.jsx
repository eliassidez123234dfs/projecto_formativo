import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSnapshot } from "valtio";

import state from "../store";
import { download } from "../assets";
import { downloadCanvasToImage, reader } from "../config/helpers";
import { EditorTabs, FilterTabs, DecalTypes } from "../config/constants";
import { fadeAnimation, slideAnimation } from "../config/motion";
import { ColorPicker, CustomButton, FilePicker, Tab } from "../components";

const Customizer = () => {
  const snap = useSnapshot(state);

  const [file, setFile] = useState("");
  const [activeEditorTab, setActiveEditorTab] = useState("");
  const [activeFilterTab, setActiveFilterTab] = useState({
    logoShirt: true,
    stylishShirt: false,
  });

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

          {/* SOLO BOTONES DE TAMAÑO */}
          <motion.div className="absolute top-[40%] right-5 z-10 flex flex-col gap-2 p-3 glassmorphism rounded-lg border-[2px] border-white" {...fadeAnimation}>
            <p className="text-white text-[10px] font-black uppercase text-center">Tamaño</p>
            <button onClick={() => handleScale(0.02)} className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white font-bold transition-all">+</button>
            <button onClick={() => handleScale(-0.02)} className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white font-bold transition-all">-</button>
          </motion.div>

          <motion.div className="absolute z-10 top-5 right-5" {...fadeAnimation}>
            <CustomButton type="filled" title="Regresar" handleClick={() => (state.intro = true)} customStyles="w-fit px-4 py-2.5 font-bold text-sm" />
          </motion.div>

          <motion.div className="filtertabs-container" {...slideAnimation("up")}>
            {FilterTabs.map((tab) => (
              <Tab key={tab.name} tab={tab} isFilterTab isActiveTab={activeFilterTab[tab.name]} handleClick={() => handleActiveFilterTab(tab.name)} />
            ))}
            <button className="download-btn" onClick={downloadCanvasToImage}>
              <img src={download} alt="download" className="w-3/5 h-3/5 object-contain" />
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Customizer;