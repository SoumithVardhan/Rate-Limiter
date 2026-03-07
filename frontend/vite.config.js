import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load .env file from the frontend directory.
  // loadEnv(mode, cwd, prefix) — empty prefix '' loads ALL vars (not just VITE_)
  const env = loadEnv(mode, process.cwd(), '')

  // Where the rate-limiter is running during local dev.
  // Set RATE_LIMITER_DEV_URL in frontend/.env to override.
  const rateLimiterUrl = env.RATE_LIMITER_DEV_URL || 'http://localhost:4000'

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.FRONTEND_DEV_PORT) || 3000,
      // Proxy API calls to rate-limiter when running locally (npm run dev)
      // In Docker / cloud, nginx handles this proxy instead — vite proxy is dev-only.
      proxy: {
        '/request': rateLimiterUrl,
        '/burst':   rateLimiterUrl,
        '/reset':   rateLimiterUrl,
        '/health':  rateLimiterUrl,
      },
    },
  }
})
