import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // Vite's dependency scanner treats `#` in the workspace path as a URL fragment.
  // Rolldown itself handles the path correctly, so skipping discovery keeps dev mode stable.
  optimizeDeps: { noDiscovery: true, include: [] },
})
