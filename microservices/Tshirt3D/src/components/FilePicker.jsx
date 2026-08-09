/**
 * Componente de selección de archivos para subir imágenes.
 *
 * Permite al usuario seleccionar una imagen desde su dispositivo
 * y aplicarla como logo o textura completa en la camiseta 3D.
 *
 * Flujo de carga de imagen:
 * 1. El usuario selecciona un archivo en el input type="file".
 * 2. Se llama a la función `reader()` (FileReader API) que convierte
 *    el archivo a una Data URL (base64).
 * 3. Esa Data URL se asigna al store de Valtio como logoDecal o
 *    fullDecal (según el botón presionado: "Logo" o "Full").
 * 4. Shirt.jsx consume la textura con useTexture(snap.logoDecal) y
 *    la aplica a la malla 3D mediante <Decal map={logoTexture}>.
 *
 * - Input de tipo file con aceptación de imágenes (accept="image/*").
 * - Botón "Logo": aplica la imagen como calcomanía parcial (logo).
 * - Botón "Full": aplica la imagen como textura de cuerpo completo.
 *
 * RF-026: Permite la personalización con imágenes propias del usuario
 *         subidas desde su dispositivo local.
 */
import React from "react";
import PropTypes from "prop-types";

import CustomButton from "./CustomButton";

const FilePicker = ({ file, setFile, readFile }) => {
  return (
    <div className="filepicker-container">
      <div className="flex-1 flex flex-col">
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <label htmlFor="file-upload" className="filepicker-label">
          Upload File
        </label>

        <p className="mt-2 text-gray-500 text-xs truncate">
          {file === "" ? "No file selected" : file.name}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <CustomButton
          type="outline"
          title="Logo"
          handleClick={() => readFile("logo")}
          customStyles="text-xs"
        />
        <CustomButton
          type="filled"
          title="Full"
          handleClick={() => readFile("full")}
          customStyles="text-xs"
        />
      </div>
    </div>
  );
};

FilePicker.propTypes = {
  file: PropTypes.object,
  setFile: PropTypes.func.isRequired,
  readFile: PropTypes.func.isRequired,
};

export default FilePicker;
