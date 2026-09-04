import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, repoRoot) }
  const apiUrl = process.env.VITE_API_URL || '/api/'
  const backendHost = apiUrl.startsWith('http')
    ? apiUrl.replace(/\/api\/?$/, '')
    : (process.env.VITE_BACKEND_URL || 'http://localhost:8000')

  const isAnalyze = process.env.ANALYZE === 'true'

  return defineConfig({
    plugins: [
      react(),
      isAnalyze && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    ].filter(Boolean),
    envDir: repoRoot,
    build: {
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) {
              return 'react'
            }
            if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
              return 'three'
            }
            if (id.includes('node_modules/bootstrap') || id.includes('node_modules/react-hot-toast')) {
              return 'ui'
            }
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: backendHost,
          changeOrigin: true,
        },
        '/media': {
          target: backendHost,
          changeOrigin: true,
        }
      }
    }
  })
}
