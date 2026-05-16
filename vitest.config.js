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

    globals: true,

    environment: 'node',

    include: ['tests/**/*.test.{js,ts}'],
    exclude: ['node_modules', 'dist'],

    coverage: {
      provider: 'v8',

      include: ['src/indicators/**/*.js'],
      exclude: ['src/indicators/index.js'],

      thresholds: {
        lines:      80,
        functions:  80,
        branches:   70,
        statements: 80,
      },

      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },

    testTimeout: 5_000,
  },
});
