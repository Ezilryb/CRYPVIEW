// ============================================================
//  src/utils/lw.js — CrypView V2
//  Pont d'import vers LightweightCharts.
//
//  Avant (Phase 5) : la lib était chargée via un <script> CDN
//  et exposée comme variable globale window.LightweightCharts.
//
//  Depuis (Phase 6 / Vite) : elle est installée localement
//  (package.json → "lightweight-charts": "4.1.3") et importée
//  ici comme namespace ES module.
//
//  Les modules consommateurs (ChartCore, ChartIndicators, multi.js)
//  importent simplement :
//    import { LightweightCharts } from '../utils/lw.js';
//  puis utilisent LightweightCharts.createChart(...) comme avant.
// ============================================================

import * as LightweightCharts from 'lightweight-charts';

export { LightweightCharts };
