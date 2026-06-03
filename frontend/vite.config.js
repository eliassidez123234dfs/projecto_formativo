import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) }
  const backendHost = process.env.VITE_API_URL
    ? process.env.VITE_API_URL.replace(/\/api\/?$/, '')
    : 'http://localhost:8000'

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
