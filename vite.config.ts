import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const API_CACHE = 'tvmaze-api';
const IMAGES_CACHE = 'tvmaze-images';
const ONE_DAY_SECONDS = 24 * 60 * 60;
const THIRTY_DAYS_SECONDS = 30 * ONE_DAY_SECONDS;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'Epix — Series y TV',
        short_name: 'Epix',
        description:
          'PWA de series y TV con la API de TVmaze: búsqueda, agenda, favoritos e historial offline-first.',
        display: 'standalone',
        start_url: '/',
        background_color: '#0e0d13',
        theme_color: '#6C4CF1',
        lang: 'es',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.tvmaze\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: API_CACHE,
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 100, maxAgeSeconds: ONE_DAY_SECONDS },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/static\.tvmaze\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: IMAGES_CACHE,
              expiration: { maxEntries: 300, maxAgeSeconds: THIRTY_DAYS_SECONDS },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/uploads\/images\//,
            handler: 'CacheFirst',
            options: {
              cacheName: IMAGES_CACHE,
              expiration: { maxEntries: 300, maxAgeSeconds: THIRTY_DAYS_SECONDS },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
    coverage: { enabled: false },
  },
});
