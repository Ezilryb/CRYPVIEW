// ============================================================
//  vite.config.js — CrypView V2
//  Application multi-pages : une entrée HTML par vue.
// ============================================================
import { defineConfig } from 'vite';

export default defineConfig({
  // Toutes les ressources statiques (styles/, src/) sont résolues
  // depuis la racine du projet — identique au comportement actuel.
  root: '.',

  build: {
    outDir:   'dist',
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
});
