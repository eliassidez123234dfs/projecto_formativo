/**
 * Utilidad para traducir y formatear errores de DRF / Backend a español claro y no técnico.
 */

const TRANSLATIONS = {
  'product with this name already exists.': 'Ya existe un producto con este nombre.',
  'A product with this name already exists.': 'Ya existe un producto con este nombre.',
  'No se pudo validar la imagen.': 'La imagen seleccionada no es válida o está dañada. Formatos aceptados: JPG, PNG, WEBP.',
  'This field is required.': 'Este campo es obligatorio.',
  'This field may not be null.': 'Este campo no puede estar vacío.',
  'This field may not be blank.': 'Este campo no puede estar en blanco.',
  'Enter a valid email address.': 'Ingrese una dirección de correo electrónico válida.',
  'A user with that username already exists.': 'Ya existe un usuario registrado con este nombre.',
  'Invalid token.': 'La sesión ha expirado o el token no es válido.',
  'Token is invalid or expired': 'El enlace o código de acceso ha expirado.',
  'Given token not valid for any token type': 'Sesión caducada. Por favor inicie sesión de nuevo.',
  'User is inactive': 'La cuenta de usuario se encuentra inactiva.',
}

/**
 * Traduce una cadena técnica a español amigable.
 * @param {string} text
 * @returns {string}
 */
export function translateMessage(text) {
  if (!text || typeof text !== 'string') return ''
  
  // Si contiene el patrón ErrorDetail de DRF, extraer el contenido de string='...'
  if (text.includes('ErrorDetail(')) {
    const match = text.match(/string=['"](.*?)['"]/)?.[1]
    if (match) text = match
  }

  // Si viene con prefijos de log tipo DRF-400 | ValidationError | ...
  if (text.includes('DRF-400') || text.includes('ValidationError')) {
    const parts = text.split('|')
    for (const part of parts) {
      const clean = part.trim()
      if (clean && !clean.startsWith('DRF-') && !clean.includes('ValidationError') && !clean.startsWith('202') && !clean.startsWith('WARNING') && !clean.includes('[object')) {
        text = clean
        break
      }
    }
  }

  const cleanText = text.trim()
  if (TRANSLATIONS[cleanText]) return TRANSLATIONS[cleanText]

  // Reemplazos de subcadenas comunes
  if (cleanText.toLowerCase().includes('already exists') || cleanText.toLowerCase().includes('ya existe')) {
    if (cleanText.toLowerCase().includes('name') || cleanText.toLowerCase().includes('nombre')) {
      return 'Ya existe un registro con este nombre.'
    }
    return 'Ya existe un registro con estos datos.'
  }

  if (cleanText.toLowerCase().includes('validar la imagen') || cleanText.toLowerCase().includes('invalid image')) {
    return 'La imagen seleccionada no es válida. Por favor elige una imagen JPG, PNG o WEBP de menos de 10 MB.'
  }

  return cleanText
}

/**
 * Formatea cualquier objeto de error (Axios error, DRF error dict, log string) en un mensaje comprensible.
 * @param {any} error 
 * @param {string} fallback 
 * @returns {string}
 */
export function formatError(error, fallback = 'Ocurrió un error inesperado. Por favor inténtalo de nuevo.') {
  if (!error) return fallback

  // Si es un string directo
  if (typeof error === 'string') {
    return translateMessage(error) || fallback
  }

  // Si es una respuesta Axios
  const responseData = error?.response?.data || error?.data
  if (responseData) {
    if (typeof responseData === 'string') {
      return translateMessage(responseData) || fallback
    }

    if (responseData.error && typeof responseData.error === 'string') {
      return translateMessage(responseData.error)
    }

    if (responseData.detail && typeof responseData.detail === 'string') {
      return translateMessage(responseData.detail)
    }

    if (responseData.status && typeof responseData.status === 'string') {
      return translateMessage(responseData.status)
    }

    if (typeof responseData === 'object') {
      const messages = []
      for (const [key, value] of Object.entries(responseData)) {
        if (Array.isArray(value)) {
          const valStr = value.map(v => (typeof v === 'object' ? v.string || JSON.stringify(v) : String(v))).join(', ')
          messages.push(translateMessage(valStr))
        } else if (typeof value === 'string') {
          messages.push(translateMessage(value))
        }
      }
      if (messages.length > 0) {
        return messages.join(' | ')
      }
    }
  }

  if (error.message && typeof error.message === 'string') {
    return translateMessage(error.message) || fallback
  }

  return fallback
}

export default formatError
