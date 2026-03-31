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
  // Toutes les ressources statiques (styles/, src/) sont résolues
  // depuis la racine du projet — identique au comportement actuel.
  root: '.',

  // Déclaration explicite du dossier public pour éviter le 404
  // sur manifest.json, favicon.svg, icons/ etc.
  publicDir: 'public',

  build: {
    outDir:      'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index:  'index.html',
        page:   'page.html',
        multi2: 'multi2.html',
        multi4: 'multi4.html',
      },
    },
  },

  server: {
    // Résout le problème CORS file:// du TODO — le serveur dev
    // sert l'app sur http://localhost:5173 (ou port libre).
    port: 5173,
    open: 'index.html',
  },

  plugins: [
    VitePWA({
      registerType: 'autoUpdate',

      // On garde public/manifest.json géré manuellement
      // (les balises <link rel="manifest"> dans les HTML y pointent déjà).
      manifest: false,

      workbox: {
        // ── Assets statiques précachés au build ───────────────────
        // Couvre tous les artefacts Vite produits dans dist/.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],

        // Multi-page app : pas de fallback vers une SPA route.
        // Chaque page HTML est une entrée indépendante dans le précache.
        navigateFallback: null,

        // ── Cache runtime (réseau externe) ────────────────────────
        runtimeCaching: [
          {
            // Polices Google (feuilles de style) — CacheFirst, 1 an
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
            // Fichiers de polices binaires (gstatic) — CacheFirst, 1 an
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
          // ⚠️  Binance REST (api.binance.com) et WebSocket (stream.binance.com)
          // NE SONT PAS mis en cache — données temps réel uniquement réseau.
        ],
      },
    }),
  ],
});
