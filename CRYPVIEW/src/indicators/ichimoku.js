// ============================================================
//  src/indicators/ichimoku.js — CrypView V2
//  Nuage Ichimoku (Tenkan 9, Kijun 26, Senkou B 52).
//  Fonction pure — aucun effet de bord.
// ============================================================

/**
 * Calcule tous les composants du nuage Ichimoku.
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
  const high = (slice) => Math.max(...slice.map((c) => c.high));
  const low  = (slice) => Math.min(...slice.map((c) => c.low));

  const tenkan  = [];
  const kijun   = [];
  const senkouA = [];
  const senkouB = [];
  const chikou  = [];

  // Tenkan-sen (Conversion Line) — période 9
  for (let i = 8; i < candles.length; i++) {
    const slice = candles.slice(i - 8, i + 1);
    tenkan.push({ time: candles[i].time, value: (high(slice) + low(slice)) / 2 });
  }

  // Kijun-sen (Base Line) — période 26
  for (let i = 25; i < candles.length; i++) {
    const slice = candles.slice(i - 25, i + 1);
    kijun.push({ time: candles[i].time, value: (high(slice) + low(slice)) / 2 });
  }

  // Senkou Span A (Leading Span A) — projeté 26 bougies en avant
  for (let i = 25; i < candles.length; i++) {
    const t = (high(candles.slice(i - 8, i + 1))  + low(candles.slice(i - 8, i + 1)))  / 2;
    const k = (high(candles.slice(i - 25, i + 1)) + low(candles.slice(i - 25, i + 1))) / 2;
    const futureIdx = Math.min(i + 26, candles.length - 1);
    senkouA.push({ time: candles[futureIdx].time, value: (t + k) / 2 });
  }

  // Senkou Span B (Leading Span B) — période 52, projeté 26 bougies en avant
  for (let i = 51; i < candles.length; i++) {
    const slice     = candles.slice(i - 51, i + 1);
    const futureIdx = Math.min(i + 26, candles.length - 1);
    senkouB.push({ time: candles[futureIdx].time, value: (high(slice) + low(slice)) / 2 });
  }

  // Chikou Span (Lagging Span) — close décalé 26 bougies en arrière
  for (let i = 0; i < candles.length - 26; i++) {
    chikou.push({ time: candles[i].time, value: candles[i + 26].close });
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}
