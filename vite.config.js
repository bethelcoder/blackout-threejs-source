import { defineConfig } from 'vite';

// IMPORTANT: base must stay relative ('./'), not '/'.
// The CGV brief (section 6.2) is explicit that the game will be served
// from https://<server>/<your-group-folder>/, not the domain root.
// An absolute base would 404 every asset the moment it's hosted.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split Three.js into its own chunk so it downloads in parallel
        // and stays cached when only game code changes.
        manualChunks: {
          three: ['three']
        }
      }
    }
  }
});