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
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
})