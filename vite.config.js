import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import packageJson from './package.json'

if (fs.existsSync(process.cwd()) && process.cwd() !== fs.realpathSync(process.cwd())) {
  process.chdir(fs.realpathSync(process.cwd()));
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version)
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: [
        'sw-push-handler.js',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'icon-512.png',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'favicon-48x48.png',
        'apple-touch-icon.png',
        'logo-header.png',
        'logo-clean-original.png',
        'site-bg-watermark.png',
        'og-image.png'
      ],
      manifestFilename: 'manifest.json',
      manifest: {
        id: '/',
        name: 'منظومة إدارة المجمدات والتوزيع',
        short_name: 'المجمدات',
        description: 'منظومة إدارة مخازن التبريد والتوريدات والموزعين والخزائن - AXONID',
        theme_color: '#991b1b',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        dir: 'rtl',
        lang: 'ar-EG',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        globIgnores: ['**/version.json'],
        importScripts: ['/sw-push-handler.js'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 3
            }
          },
          {
            urlPattern: ({ url }) => /version\.json.*/i.test(url.pathname),
            handler: 'NetworkOnly'
          },
          {
            urlPattern: ({ url }) => /\/(sw|registerSW)\.js.*/i.test(url.pathname),
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  server: {
    port: 8182,
    strictPort: true,
    host: true
  }
})
