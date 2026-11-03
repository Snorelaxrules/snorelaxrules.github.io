import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// User site (Snorelaxrules.github.io) is served from the domain root.
// If this ever moves to a project repo, change base to '/<repo>/'.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
