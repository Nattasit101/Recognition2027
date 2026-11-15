import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// API ของ backend ที่ให้ Vite ส่งต่อ (frontend เรียกแบบ relative เช่น fetch("/random?round=A"))
const API_PATHS = ['/random', '/pool', '/all', '/api']

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.VITE_BACKEND_URL || 'http://localhost:4000'
  const proxy = Object.fromEntries(
    API_PATHS.map((path) => [path, { target: backend, changeOrigin: true }]),
  )

  return {
    plugins: [react()],
    server: { port: 5173, proxy },
    preview: { proxy },
  }
})
