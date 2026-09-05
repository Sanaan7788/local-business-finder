import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
// `--mode static` builds the GitHub Pages snapshot (see src/lib/env.ts): the app
// is served under the repo's base path and reads public/data instead of /api.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, 'VITE_')
  const isStatic = mode === 'static'

  return {
    base: isStatic ? env.VITE_BASE_PATH || '/local-business-finder/' : '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
        },
      },
    },
  }
})
