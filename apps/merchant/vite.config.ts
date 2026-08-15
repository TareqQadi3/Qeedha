import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      injectRegister: 'auto',
    }),
  ],
  server: {
    port: 3002,
    proxy: {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/transactions': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/merchants': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});