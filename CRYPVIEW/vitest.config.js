// ============================================================
//  vitest.config.js — CrypView V2
//  Configuration explicite de Vitest.
//
//  Sans ce fichier, Vitest hérite des defaults Vite :
//    - pas de globals (describe/it/expect non injectés)
//    - environnement "node" → pas de DOM
//    - couverture non configurée
//
//  Stratégie :
//    - globals: true    → describe/it/expect sans import manuel
//    - environment: 'node' → les indicateurs sont des fonctions
//      pures, aucun accès DOM requis dans les tests actuels
//    - include : cible uniquement tests/**
//    - coverage v8 : seuils minimaux par fichier d'indicateur
// ============================================================

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // ── Globals ────────────────────────────────────────────
    // Injecte describe / it / expect / beforeEach / afterEach
    // sans import explicite dans chaque fichier de test.
    globals: true,

    // ── Environnement ──────────────────────────────────────
    // Les indicateurs sont des fonctions pures (pas de DOM).
    // 'node' est plus rapide que 'jsdom' et suffit ici.
    // Changer en 'jsdom' si des tests de composants UI sont ajoutés.
    environment: 'node',

    // ── Fichiers de tests ──────────────────────────────────
    include: ['tests/**/*.test.{js,ts}'],
    exclude: ['node_modules', 'dist'],

    // ── Couverture (v8) ────────────────────────────────────
    coverage: {
      provider: 'v8',

      // Fichiers analysés — uniquement les fonctions pures d'indicateurs
      include: ['src/indicators/**/*.js'],
      exclude: ['src/indicators/index.js'], // barrel file, pas de logique

      // Seuils minimaux globaux (bloquants en CI)
      thresholds: {
        lines:      80,
        functions:  80,
        branches:   70,
        statements: 80,
      },

      // Formats de rapport
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },

    // ── Timeout ────────────────────────────────────────────
    // Les calculs d'indicateurs sur 200 bougies restent < 100 ms.
    // Un timeout serré détecte les régressions de performance.
    testTimeout: 5_000,
  },
});
