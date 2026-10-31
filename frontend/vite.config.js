import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const destinoApi = env.API_PROXY_TARGET?.trim() || 'http://localhost:5000'

  return {
    plugins: [react()],
    server: {
      // Con VITE_API_URL vacío el frontend llama a /api en el mismo origen.
      // En desarrollo, Vite reenvía esas peticiones al backend Flask local.
      proxy: {
        '/api': {
          target: destinoApi,
          changeOrigin: true,
        },
      },
    },
  }
})
