import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// /api goes to server/proxy.mjs, which holds the food and model API keys.
export default defineConfig({
  plugins: [react()],
  // The watcher must stay out of release/: on Windows a watched folder cannot be renamed, which breaks the exe build.
  server: { port: 5180, proxy: { '/api': 'http://localhost:8797' }, watch: { ignored: ['**/release/**', '**/build/**', '**/electron/**'] } },
})
