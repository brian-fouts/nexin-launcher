import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.GAME_BACKEND_URL || 'http://localhost:8001',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.GAME_BACKEND_URL || 'http://localhost:8001',
        ws: true,
      },
    },
  },
})
