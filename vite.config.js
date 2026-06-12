import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Automatically updates the service worker when new content is available
      includeAssets: ['ico.png', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Arcane Survival',
        short_name: 'ArcaneSurvival',
        description: 'Survive the magical elements in Arcane Survival!',
        theme_color: '#7c3aed', // Match this to your game's primary background color
        background_color: '#2e146a',
        display: 'standalone', // Makes it feel like a native app without browser borders
        orientation: 'portrait', // or 'landscape', depending on how your game is played
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Crucial for clean icon rendering on Android devices
          }
        ]
      }
    })
  ]
})