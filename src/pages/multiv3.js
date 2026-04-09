// ============================================================
//  src/pages/multiv3.js — CrypView V2
//  Vue 3 graphiques empilés verticalement.
// ============================================================

import { MultiChartView } from './multi.js';

new MultiChartView({
  count:    3,
  defaults: [
    { tf: '15m' },
    { tf: '1h'  },
    { tf: '4h'  },
  ],
  stateKey: 'crypview_multiv3_state_v1',
  drawKey:  'crypview_drawings_multiv3_v2',
  badge:    '↕ V3',
  navLinks: { single: true, multi2: true, multi4: true },
}).init();
