// frontend/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    target: 'esnext', // Современные браузеры (VK Mini Apps)
    minify: 'terser'
  },
  server: {
    port: 5173,
    open: false
  }
});
