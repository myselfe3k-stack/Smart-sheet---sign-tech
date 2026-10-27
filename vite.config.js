import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import chatApi from './server/chatApi.js'

export default defineConfig(({ mode }) => {
  // Expose server-only secrets from .env / .env.local to the chat endpoint (never to the browser bundle).
  const env = loadEnv(mode, process.cwd(), 'ANTHROPIC_')
  for (const [key, value] of Object.entries(env)) if (!process.env[key]) process.env[key] = value

  return {
    plugins: [react(), tailwindcss(), chatApi()],
  }
})
