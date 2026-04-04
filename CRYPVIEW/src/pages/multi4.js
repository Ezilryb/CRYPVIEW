// ============================================================
//  src/pages/multi4.js — CrypView V2
//  Vue 4 graphiques en grille 2×2.
//  Point d'entrée : 3 lignes de config + lancement.
// ============================================================

import { MultiChartView } from './multi.js';

new MultiChartView({
  count:    4,
  defaults: [
    { tf: '1m'  },
    { tf: '15m' },
    { tf: '1h'  },
    { tf: '4h'  },
  ],
  stateKey: 'crypview_multi4_state_v1',
  drawKey:  'crypview_drawings_multi4_v2',
  badge:    '🔲 MULTI 4',
  navLinks: { single: true, multi2: true },
}).init();
