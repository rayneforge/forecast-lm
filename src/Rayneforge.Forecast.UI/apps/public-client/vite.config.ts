import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Forecast LM',
        short_name: 'Forecast LM',
        description: 'Spatial news intelligence — canvas, narrative analysis, and XR visualization',
        display: 'standalone',
        background_color: '#0B0E14',
        theme_color: '#0B0E14',
        orientation: 'any',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  clearScreen: false,
  server: {
    host: true,
    port: parseInt(process.env.PORT ?? "5173"),
    strictPort: true, // Fail if port is in use, Aspire needs this
  },
  envPrefix: ['VITE_'],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  }
});
