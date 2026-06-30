import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Global UI state: sidebar toggle, theme, and toast notifications — persisted to localStorage
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
