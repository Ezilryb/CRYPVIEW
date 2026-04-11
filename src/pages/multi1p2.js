// ============================================================
//  src/pages/multi1p2.js — CrypView V2
//  Vue 1 grand panneau gauche + 2 petits à droite.
// ============================================================

import { MultiChartView } from './multi.js';

new MultiChartView({
  count:    3,
  defaults: [
    { tf: '1h'  },
    { tf: '15m' },
    { tf: '4h'  },
  ],
  stateKey: 'crypview_multi1p2_state_v1',
  drawKey:  'crypview_drawings_multi1p2_v2',
  badge:    '⬛ 1+2',
  navLinks: { single: true, multi2: true, multi4: true },
}).init();
