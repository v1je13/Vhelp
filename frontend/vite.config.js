import { defineConfig } from 'vite'; 
import react from '@vitejs/plugin-react'; 

export default defineConfig({ 
  plugins: [react()], 
  build: { 
    outDir: 'dist',
    target: 'es2015', // Более широкая поддержка старых WebView на Android
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vkui: ['@vkontakte/vkui', '@vkontakte/icons', '@vkontakte/vk-bridge'],
          react: ['react', 'react-dom'],
        },
      },
    },
  }, 
  // Для локальной разработки с Pages Functions 
  server: { 
    port: 5173,
    proxy: { 
      '/api': { 
        target: 'http://localhost:8788', 
        changeOrigin: true 
      } 
    } 
  } 
});
