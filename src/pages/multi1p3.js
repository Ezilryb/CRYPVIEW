// ============================================================
//  src/pages/multi1p3.js — CrypView V2
//  Vue 1 grand panneau gauche + 3 petits à droite.
// ============================================================

import { MultiChartView } from './multi.js';

new MultiChartView({
  count:    4,
  defaults: [
    { tf: '1h'  },
    { tf: '5m'  },
    { tf: '15m' },
    { tf: '4h'  },
  ],
  stateKey: 'crypview_multi1p3_state_v1',
  drawKey:  'crypview_drawings_multi1p3_v2',
  badge:    '⬛ 1+3',
  navLinks: { single: true, multi2: true, multi4: true },
}).init();
