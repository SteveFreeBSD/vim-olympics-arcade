import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/vim-olympics-arcade/',

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Vim Olympics — Arcade',
        short_name: 'Vim Arcade',
        start_url: '/vim-olympics-arcade/',
        scope: '/vim-olympics-arcade/',
        display: 'standalone',
        theme_color: '#0b1220',
        background_color: '#020617',
        icons: [
          { src: '/favicon.svg', sizes: '512x512', type: 'image/svg+xml' }
        ]
      }
    })
  ]
})

