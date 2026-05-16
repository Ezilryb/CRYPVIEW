// ============================================================
//  vite.config.js — CrypView V2
//  Application multi-pages : une entrée HTML par vue.
//
//  v2.10 : Ajout du plugin VitePWA (Fix #7)
//    - Service Worker généré via Workbox (generateSW)
//    - Précache des assets statiques (.js, .css, .html, .svg…)
//    - Runtime cache des polices Google (CacheFirst, 1 an)
//    - Données Binance (REST + WS) JAMAIS mises en cache
//    - manifest: false → on conserve public/manifest.json existant
//    - navigateFallback: null → multi-page app, pas de SPA fallback
//
//  Fix manifest 404 : publicDir explicite pour garantir que
//  public/manifest.json est servi à /manifest.json dans tous
//  les environnements (Vite dev, preview et build).
// ============================================================

import { defineConfig } from 'vite';
import { VitePWA }      from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',

  publicDir: 'public',

  build: {
    outDir:      'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index:    'index.html',
        page:     'page.html',
        multi2:   'multi2.html',
        multi4:   'multi4.html',
        multi1p2: 'multi1p2.html',
        multi1p3: 'multi1p3.html',
        multi9:   'multi9.html',
        multiv2:  'multiv2.html',
        multiv3:  'multiv3.html',
      },
    },
  },

  server: {
    port: 5173,
    open: 'index.html',

    proxy: {
      '/api/gecko': {
        target:       'https://api.geckoterminal.com',
        changeOrigin: true,
        secure:       true,
        rewrite:      (path) => path.replace(/^\/api\/gecko/, ''),
      },
    },
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',

      manifest: false,

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],

        navigateFallback: null,

        runtimeCaching: [
          {
            urlPattern:   /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler:      'CacheFirst',
            options: {
              cacheName: 'crypview-google-fonts',
              expiration: {
                maxEntries:    20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern:   /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler:      'CacheFirst',
            options: {
              cacheName: 'crypview-gstatic-fonts',
              expiration: {
                maxEntries:    30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
