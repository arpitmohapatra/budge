import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/budge/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon/*.png', 'favicon/*.ico'],
      manifest: {
        name: 'Budge — family money',
        short_name: 'Budge',
        description: 'Family budgeting: accounts, cards, paydays, bills, budgets, investments and a cash forecast.',
        theme_color: '#ECECEE',
        background_color: '#ECECEE',
        display: 'standalone',
        start_url: '/budge/',
        scope: '/budge/',
        icons: [
          { src: '/budge/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/budge/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/budge/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Add expense', url: '/budge/#/activity' },
          { name: 'Forecast', url: '/budge/#/forecast' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'] },
    }),
  ],
  test: { environment: 'node' },
});
