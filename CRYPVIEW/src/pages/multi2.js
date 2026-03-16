// ============================================================
//  src/pages/multi2.js — CrypView V2
//  Vue 2 graphiques côte à côte.
//  Point d'entrée : 3 lignes de config + lancement.
// ============================================================

import { MultiChartView } from './multi.js';

new MultiChartView({
  count:    2,
  defaults: [
    { tf: '5m' },
    { tf: '1h' },
  ],
  stateKey: 'crypview_multi2_state_v1',
  drawKey:  'crypview_drawings_multi2_v2',
  badge:    '🔲 MULTI 2',
  navLinks: { single: true, multi4: true },
}).init();
