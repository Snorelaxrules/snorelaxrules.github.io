import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// User site (Snorelaxrules.github.io) is served from the domain root.
// If this ever moves to a project repo, change base to '/<repo>/'.
export default defineConfig({
  base: '/',
  plugins: [react()],
  build: {
    // the lazy Map chunk (MapLibre) is ~1.1 MB minified, three.js core ~700 kB
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks cache across deploys; site code changes often.
        // maplibre-gl is deliberately not listed: it stays in the lazy Map chunk.
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 30 },
            {
              name: 'r3f',
              test: /node_modules[\\/](@react-three|its-fine|suspend-react|zustand|react-use-measure)[\\/]/,
              priority: 20,
            },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|cookie|set-cookie-parser|scheduler)[\\/]/, priority: 25 },
            { name: 'motion', test: /node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/, priority: 20 },
          ],
        },
      },
    },
  },
})
