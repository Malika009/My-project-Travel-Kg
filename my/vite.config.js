import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // API_PROXY lets you point the dev server at another backend port.
      '/api': { target: process.env.API_PROXY || 'http://localhost:4000', changeOrigin: true },
    },
  },
})
