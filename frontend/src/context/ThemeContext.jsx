/**
 * ThemeContext.jsx  —  Proveedor de tema claro/oscuro
 * ────────────────────────────────────────────────────────────────────────
 * Lee y modifica el tema desde el store global de Zustand (appStore),
 * que a su vez persiste la preferencia en localStorage.
 *
 * Al cambiar el tema, actualiza el atributo data-theme en el elemento
 * <html>, lo que activa las variables CSS correspondientes definidas
 * en styles/theme.css.
 */
import React, { createContext, useContext, useEffect } from 'react'
import useAppStore from '../store/appStore'

const ThemeContext = createContext()

/** Proveedor que sincroniza el tema (claro/oscuro) con el DOM y el store persistido. */
export function ThemeProvider({ children }) {
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

/** Hook para acceder al tema y la función toggleTheme. Debe usarse dentro de ThemeProvider. */
export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme debe usarse dentro de un ThemeProvider')
  }
  return context
}
