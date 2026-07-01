/**
 * appStore.js  —  Store global de UI con Zustand + persist
 * ────────────────────────────────────────────────────────────────────────
 * Contiene el estado global de la interfaz: apertura del sidebar,
 * tema claro/oscuro y notificaciones toast.
 *
 * ─── ZUSTAND ───
 * Biblioteca minimalista de gestión de estado. create() define un store
 * con estado inicial y acciones que modifican ese estado mediante set().
 * Los componentes se suscriben a fragmentos específicos del store con
 * selectores (ej: useAppStore(s => s.theme)) para evitar re-renders
 * innecesarios.
 *
 * ─── MIDDLEWARE persist ───
 * El middleware persist guarda y restaura automáticamente ciertas
 * propiedades del store en localStorage bajo la clave 'app-store'.
 * partialize selecciona qué campos persistir (sidebarOpen y theme,
 * excluyendo toast que es efímero).
 *
 * ─── ESTADO ───
 * - sidebarOpen : boolean  →  Panel lateral expandido/colapsado
 * - theme       : string   →  'light' | 'dark'
 * - toast       : object?  →  { message, type } o null
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      toast: null,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
      },
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark'
          document.documentElement.setAttribute('data-theme', next)
          return { theme: next }
        }),

      showToast: (toast) => set({ toast }),
      dismissToast: () => set({ toast: null }),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ sidebarOpen: state.sidebarOpen, theme: state.theme }),
    }
  )
)

export default useAppStore
