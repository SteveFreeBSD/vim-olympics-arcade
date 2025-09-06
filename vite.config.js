import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/vim-olympics-arcade/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    globals: true,
    css: true,
  },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Exclude heavy images from precache; handle via runtime cache
        globPatterns: ['**/*.{js,css,html,ico,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:png|jpg|jpeg|webp|avif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-images',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
      manifest: {
        name: 'Vim Olympics — Arcade',
        short_name: 'Vim Arcade',
        start_url: '/vim-olympics-arcade/',
        scope: '/vim-olympics-arcade/',
        display: 'standalone',
        theme_color: '#0b1220',
        background_color: '#020617',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
