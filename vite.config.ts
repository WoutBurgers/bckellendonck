import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In production the API (server/) serves the built site from dist/, so no hosting files are needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // In development the API runs separately (npm run dev:server) on port 3001.
      proxy: { '/api': { target: env.DEV_API_TARGET || 'http://localhost:3001', changeOrigin: false } },
    },
    preview: {
      proxy: { '/api': { target: env.DEV_API_TARGET || 'http://localhost:3001', changeOrigin: false } },
    },
  }
})
