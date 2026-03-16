// ============================================================
//  src/indicators/moving-averages.js — CrypView V2
//  Fonctions pures de calcul des moyennes mobiles.
//  Toutes les fonctions sont sans effet de bord (pas de DOM, pas d'état).
// ============================================================

// ── Primitives internes ───────────────────────────────────────

/**
 * Extrait le tableau des prix de clôture depuis un tableau de bougies.
 * @param {Candle[]} candles
 * @returns {number[]}
 */
export const closes = (candles) => candles.map((c) => c.close);

/**
 * Simple Moving Average sur un tableau de nombres.
 * @param {number[]} values
 * @param {number}   period
 * @returns {{ i: number, v: number }[]}  — index + valeur
 */
export function sma(values, period) {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - j];
    result.push({ i, v: sum / period });
  }
  return result;
}

/**
 * Exponential Moving Average sur un tableau de nombres.
 * @param {number[]} values
 * @param {number}   period
 * @returns {{ i: number, v: number }[]}
 */
export function ema(values, period) {
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((x, y) => x + y, 0) / period;
  const result = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) continue;
    if (i === period - 1) {
      e = values.slice(0, period).reduce((x, y) => x + y, 0) / period;
    } else {
      e = values[i] * k + e * (1 - k);
    }
    result.push({ i, v: e });
  }
  return result;
}

/**
 * Weighted Moving Average sur un tableau de nombres.
 * @param {number[]} values
 * @param {number}   period
 * @returns {{ i: number, v: number }[]}
 */
export function wma(values, period) {
  const w = period * (period + 1) / 2;
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += values[i - j] * (period - j);
    result.push({ i, v: sum / w });
  }
  return result;
}

/**
 * Écart-type sur un tableau de nombres.
 * @param {number[]} values
 * @param {number}   period
 * @returns {{ i: number, v: number }[]}
 */
export function stdev(values, period) {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((x, y) => x + y) / period;
    result.push({ i, v: Math.sqrt(slice.reduce((x, y) => x + (y - mean) ** 2, 0) / period) });
  }
  return result;
}

// ── Indicateurs exportés ──────────────────────────────────────

/**
 * Calcule les 3 moyennes mobiles simples (MA 20, 50, 200).
 * @param {Candle[]} candles
 * @returns {{ ma20: Point[], ma50: Point[], ma200: Point[] }}
 */
export function calcMA(candles) {
  const cl = closes(candles);
  // Convertit les résultats {i,v} en points LightweightCharts {time, value}
  const ts = (arr) => arr.map(({ i, v }) => ({ time: candles[i].time, value: v }));
  return {
    ma20:  ts(sma(cl, 20)),
    ma50:  ts(sma(cl, 50)),
    ma200: ts(sma(cl, 200)),
  };
}

/**
 * Hull Moving Average — moins de lag que EMA.
 * Couleur dynamique selon la direction (vert = hausse, rouge = baisse).
 * @param {Candle[]} candles
 * @param {number}   [period=20]
 * @returns {{ time: number, value: number, color: string }[]}
 */
export function calcHMA(candles, period = 20) {
  const cl   = closes(candles);
  const half = wma(cl, Math.floor(period / 2));
  const full = wma(cl, period);

  const fm  = new Map(full.map((x) => [x.i, x.v]));
  const raw = half
    .filter((x) => fm.has(x.i))
    .map((x) => ({ i: x.i, v: 2 * x.v - fm.get(x.i) }));

  const sq  = Math.round(Math.sqrt(period));
  const hma = wma(raw.map((x) => x.v), sq);

  return hma.map(({ i, v }) => ({
    time:  candles[raw[i].i].time,
    value: v,
    color: v > (hma[i - 1]?.v ?? v) ? '#00ff88' : '#ff3d5a',
  }));
}

/**
 * VWAP — Volume Weighted Average Price (cumulatif depuis le début de l'historique).
 * @param {Candle[]} candles
 * @returns {{ time: number, value: number }[]}
 */
export function calcVWAP(candles) {
  let cumPV = 0;
  let cumV  = 0;
  return candles.map((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    cumPV += tp * c.volume;
    cumV  += c.volume;
    return { time: c.time, value: cumV ? cumPV / cumV : c.close };
  });
}
