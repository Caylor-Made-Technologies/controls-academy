import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { routePreload } from './scripts/route-preload';
import { analyze } from './scripts/analyze';

const base = '/controls-academy/';

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0') },
  plugins: [
    react(),
    tailwindcss(),
    routePreload(),
    analyze(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'fonts/*.woff2', 'brand/*.png'],
      manifest: {
        name: 'Controls Academy — Caylor Made Technologies',
        short_name: 'Controls Academy',
        description: 'Learn PLCs and industrial controls from zero. Free, offline, hands-on.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0f14',
        theme_color: '#0b0f14',
        categories: ['education', 'productivity'],
        id: base,
        lang: 'en',
        // Long-press the installed icon to jump straight to a section.
        shortcuts: [
          { name: 'Simulator', short_name: 'Simulator', url: base + '#/sim', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Fault Hunt', short_name: 'Fault Hunt', url: base + '#/troubleshoot', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Reference', short_name: 'Reference', url: base + '#/reference', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],
        navigateFallback: base + 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: false },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    coverage: { include: ['src/engine/**'], reporter: ['text-summary'] },
  },
} as never);
