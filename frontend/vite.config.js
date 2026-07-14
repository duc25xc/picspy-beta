import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Đọc PORT từ backend/.env để không cần hardcode ở bất kỳ đâu
function getBackendPort() {
  try {
    const envPath = path.resolve(__dirname, '../backend/.env')
    const content = fs.readFileSync(envPath, 'utf-8')
    const match = content.match(/^PORT=(\d+)/m)
    return match ? match[1] : '5000'
  } catch {
    return '5000'
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load frontend .env (nếu có)
  const frontendEnv = loadEnv(mode, process.cwd(), '')

  const BACKEND_PORT = getBackendPort()
  const BACKEND_URL = `http://localhost:${BACKEND_PORT}`

  // Ưu tiên: frontend .env > tự động đọc từ backend PORT
  const VITE_API_URL = frontendEnv.VITE_API_URL || `${BACKEND_URL}/v1`
  const VITE_SOCKET_URL = frontendEnv.VITE_SOCKET_URL || BACKEND_URL

  console.log(`[vite.config] BACKEND_PORT = ${BACKEND_PORT}`)
  console.log(`[vite.config] VITE_API_URL  = ${VITE_API_URL}`)
  console.log(`[vite.config] VITE_SOCKET_URL = ${VITE_SOCKET_URL}`)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        'react-hot-toast': path.resolve(__dirname, './src/utils/toast.js')
      }
    },
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(VITE_API_URL),
      'import.meta.env.VITE_SOCKET_URL': JSON.stringify(VITE_SOCKET_URL),
    }
  }
})

