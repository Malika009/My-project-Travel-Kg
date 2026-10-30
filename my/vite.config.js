import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom/client', 'react-router-dom', 'axios', 'i18next', 'react-i18next', 'recharts'],
  },
  server: {
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
