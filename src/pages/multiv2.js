// ============================================================
//  src/pages/multiv2.js — CrypView V2
//  Vue 2 graphiques empilés verticalement.
// ============================================================

import { MultiChartView } from './multi.js';

new MultiChartView({
  count:    2,
  defaults: [
    { tf: '1h' },
    { tf: '4h' },
  ],
  stateKey: 'crypview_multiv2_state_v1',
  drawKey:  'crypview_drawings_multiv2_v2',
  badge:    '↕ V2',
  navLinks: { single: true, multi2: true, multi4: true },
}).init();
