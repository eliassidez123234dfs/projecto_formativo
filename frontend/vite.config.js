import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }
  const apiUrl = process.env.VITE_API_URL || '/api/'
  const backendHost = apiUrl.startsWith('http')
    ? apiUrl.replace(/\/api\/?$/, '')
    : (process.env.VITE_BACKEND_URL || 'http://localhost:8000')

  return defineConfig({
    plugins: [react()],
    server: {
      host: '0.0.0.0',
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
