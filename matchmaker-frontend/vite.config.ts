import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  },
  optimizeDeps: {
    // Pre-bundle React and React Query so one copy is used (helps "invalid hook call" on some environments)
    include: ['react', 'react-dom', 'react/jsx-runtime', '@tanstack/react-query'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: process.env.BACKEND_URL || 'http://localhost:8000',
        ws: true,
      },
    },
  },
})
