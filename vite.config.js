import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'usc.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'USC Procurement Admin Assistant',
        short_name: 'USC Procurement',
        description: 'USC Procurement Department — Browse items, place orders, manage inventory',
        theme_color: '#5eb76a',
        background_color: '#FAF8F3',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }
            }
          }
        ]
      }
    }),
  ],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  optimizeDeps: {
    include: ['normalize-wheel'],
  },
})
