import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Prevent Vite from pre-bundling onnxruntime-web (it has WASM files
    // that must be loaded at runtime, not bundled)
    exclude: ['onnxruntime-web'],
  },
  server: {
    headers: {
      // Required for SharedArrayBuffer (onnxruntime-web multi-threaded WASM)
      // Note: These may need to be removed if cross-origin API issues arise
      // on certain hosting platforms (Vercel/Netlify handle this automatically)
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    // Allow access from any host (needed for tunnels, previews, etc.)
    allowedHosts: 'all',
  },
})