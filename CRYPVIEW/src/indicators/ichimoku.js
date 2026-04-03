// ============================================================
//  src/indicators/ichimoku.js — CrypView V2
//  Nuage Ichimoku (Tenkan 9, Kijun 26, Senkou B 52).
//  Fonction pure — aucun effet de bord.
//
//  Complexité : O(n) grâce aux helpers slidingMax / slidingMin
//  (déque monotone). Précédemment O(n²) avec Math.max(...slice).
// ============================================================

import { slidingMax, slidingMin } from './moving-averages.js';

/**
 * Calcule tous les composants du nuage Ichimoku.
 *
 * Principe des fenêtres glissantes :
 *   slidingMax(highs, k)[j]  = max de highs[j .. j+k-1]
 *   slidingMin(lows,  k)[j]  = min de lows [j .. j+k-1]
 *
 * Correspondance avec l'original :
 *   boucle « for i = k-1 » → index j = i - (k-1), donc candles[i] = candles[j + k - 1]
 *
 * @param {Candle[]} candles
 * @returns {{
 *   tenkan:  Point[],
 *   kijun:   Point[],
 *   senkouA: Point[],
 *   senkouB: Point[],
 *   chikou:  Point[],
 * }}
 */
export function calcIchimoku(candles) {
  const n     = candles.length;
  const highs = candles.map((c) => c.high);
  const lows  = candles.map((c) => c.low);

  // ── Fenêtres glissantes pré-calculées ─────────────────────
  // Chaque tableau a une longueur de (n - période + 1).
  // max9[j]  = max des hauts sur la fenêtre [j .. j+8]   (période 9)
  // max26[j] = max des hauts sur la fenêtre [j .. j+25]  (période 26)
  // max52[j] = max des hauts sur la fenêtre [j .. j+51]  (période 52)
  const max9  = slidingMax(highs, 9);
  const min9  = slidingMin(lows,  9);
  const max26 = slidingMax(highs, 26);
  const min26 = slidingMin(lows,  26);
  const max52 = slidingMax(highs, 52);
  const min52 = slidingMin(lows,  52);

  // ── Tenkan-sen (Conversion Line) — période 9 ──────────────
  // max9[j] couvre highs[j..j+8] → bougie de référence = candles[j+8]
  const tenkan = max9.map((h, j) => ({
    time:  candles[j + 8].time,
    value: (h + min9[j]) / 2,
  }));

  // ── Kijun-sen (Base Line) — période 26 ────────────────────
  // max26[j] couvre highs[j..j+25] → bougie de référence = candles[j+25]
  const kijun = max26.map((h, j) => ({
    time:  candles[j + 25].time,
    value: (h + min26[j]) / 2,
  }));

  // ── Senkou Span A (Leading Span A) — projeté 26 bougies en avant
  // Pour la bougie i (i ≥ 25) :
  //   tenkan_num = max9[i-8]   = max sur highs[i-8..i]
  //   kijun_num  = max26[i-25] = max sur highs[i-25..i]
  //   projection → candles[min(i+26, n-1)]
  const senkouA = [];
  for (let i = 25; i < n; i++) {
    const t         = (max9[i - 8]  + min9[i - 8])  / 2;
    const k         = (max26[i - 25] + min26[i - 25]) / 2;
    const futureIdx = Math.min(i + 26, n - 1);
    senkouA.push({ time: candles[futureIdx].time, value: (t + k) / 2 });
  }

  // ── Senkou Span B (Leading Span B) — période 52, projeté 26 en avant
  // max52[j] couvre highs[j..j+51] → bougie de référence = candles[j+51]
  //   projection → candles[min(j+51+26, n-1)] = candles[min(j+77, n-1)]
  const senkouB = max52.map((h, j) => {
    const futureIdx = Math.min(j + 51 + 26, n - 1);
    return { time: candles[futureIdx].time, value: (h + min52[j]) / 2 };
  });

  // ── Chikou Span (Lagging Span) — close décalé 26 bougies en arrière
  const chikou = [];
  for (let i = 0; i < n - 26; i++) {
    chikou.push({ time: candles[i].time, value: candles[i + 26].close });
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}
