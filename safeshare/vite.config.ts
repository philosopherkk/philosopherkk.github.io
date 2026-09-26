import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { APP_BASE } from './src/appBase.ts'
import {
  CONTENT_SECURITY_POLICY,
  PERMISSIONS_POLICY,
  REFERRER_POLICY,
} from './src/securityHeaders.ts'

const securityHeaders = {
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'Referrer-Policy': REFERRER_POLICY,
  'Permissions-Policy': PERMISSIONS_POLICY,
}

export default defineConfig({
  base: APP_BASE,
  plugins: [
    react(),
    VitePWA({
      injectRegister: null,
      registerType: 'autoUpdate',
      manifest: {
        name: 'SafeShare MD',
        short_name: 'SafeShare',
        description: 'Redact patient identifiers on your phone before you share a report.',
        lang: 'en-HK',
        start_url: APP_BASE,
        scope: APP_BASE,
        display: 'standalone',
        background_color: '#e7eef0',
        theme_color: '#0f4c57',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // App shell, workers, and language data only. No runtime cache of user images or text.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,gz,mjs,wasm,tflite,webmanifest,txt}'],
        globIgnores: ['**/*.map'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        runtimeCaching: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: { headers: securityHeaders },
  preview: { headers: securityHeaders },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
})
