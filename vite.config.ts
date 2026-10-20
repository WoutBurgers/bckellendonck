import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Hosting files written after each build:
 * - _redirects (Netlify): proxies /api/* to the backend (BACKEND_URL) so the site and API share
 *   one domain, and sends every other path to index.html for client-side routing.
 * - 404.html: copy of index.html for GitHub Pages and similar hosts.
 */
function hostingFiles(backendUrl: string | undefined): Plugin {
  return {
    name: 'hosting-files',
    apply: 'build',
    closeBundle() {
      const outDir = resolve(import.meta.dirname, 'dist')
      const lines = []
      if (backendUrl) lines.push(`/api/*  ${backendUrl.replace(/\/$/, '')}/api/:splat  200!`)
      lines.push('/*  /index.html  200')
      writeFileSync(resolve(outDir, '_redirects'), lines.join('\n') + '\n')
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.BACKEND_URL || process.env.BACKEND_URL
  return {
    plugins: [react(), tailwindcss(), hostingFiles(backendUrl)],
    server: {
      // In development the API runs separately (npm run dev:server) on port 3001.
      proxy: { '/api': { target: env.DEV_API_TARGET || 'http://localhost:3001', changeOrigin: false } },
    },
    preview: {
      proxy: { '/api': { target: env.DEV_API_TARGET || 'http://localhost:3001', changeOrigin: false } },
    },
  }
})
