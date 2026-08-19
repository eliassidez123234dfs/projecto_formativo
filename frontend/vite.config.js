import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, repoRoot) }
  const apiUrl = process.env.VITE_API_URL || '/api/'
  const backendHost = apiUrl.startsWith('http')
    ? apiUrl.replace(/\/api\/?$/, '')
    : (process.env.VITE_BACKEND_URL || 'http://localhost:8000')

  return defineConfig({
    plugins: [react()],
    envDir: repoRoot,
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
