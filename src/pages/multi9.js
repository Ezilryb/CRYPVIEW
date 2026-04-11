// ============================================================
//  src/pages/multi9.js — CrypView V2
//  Vue 9 graphiques en grille 3×3.
// ============================================================

import { MultiChartView } from './multi.js';

new MultiChartView({
  count:    9,
  defaults: [
    { tf: '1m'  },
    { tf: '3m'  },
    { tf: '5m'  },
    { tf: '15m' },
    { tf: '30m' },
    { tf: '1h'  },
    { tf: '2h'  },
    { tf: '4h'  },
    { tf: '1d'  },
  ],
  stateKey: 'crypview_multi9_state_v1',
  drawKey:  'crypview_drawings_multi9_v2',
  badge:    '⊞ 3×3',
  navLinks: { single: true, multi2: true, multi4: true },
}).init();
