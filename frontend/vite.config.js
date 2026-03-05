import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy API calls to rate-limiter when running locally without Docker
    proxy: {
      '/request': 'http://localhost:4000',
      '/burst':   'http://localhost:4000',
      '/reset':   'http://localhost:4000',
      '/health':  'http://localhost:4000',
    },
  },
})
