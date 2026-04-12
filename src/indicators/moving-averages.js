// ============================================================
//  src/indicators/moving-averages.js — CrypView V2
//  Fonctions pures de calcul des moyennes mobiles.
//  Toutes les fonctions sont sans effet de bord (pas de DOM, pas d'état).
//
//  Note : calcVWAP a été retiré de ce fichier.
//  Il est désormais importé exclusivement depuis ./vwap.js,
//  qui implémente le reset journalier 00:00 UTC correct.
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

// ── Fenêtre glissante O(n) ────────────────────────────────────
//
// Implémentation classique avec déque monotone (tableau d'indices).
// Chaque élément entre et sort de la déque au plus une fois → O(n).
//
// Utilisés par :
//   - calcIchimoku  (high/low sur 9, 26, 52 bougies)
//   - calcStoch     (high/low sur kPeriod bougies)
//   - calcWilliamsR (high/low sur period bougies)
//
// Interface : l'élément result[k] est le max/min de values[k .. k+period-1].
// Le tableau résultant a donc une longueur de (n - period + 1).

/**
 * Maximum glissant sur une fenêtre de taille `period` — O(n).
 *
 * @param {number[]} values
 * @param {number}   period
 * @returns {number[]}  tableau de longueur (values.length - period + 1)
 */
export function slidingMax(values, period) {
  const n      = values.length;
  const result = new Array(n - period + 1);
  // déque : stocke les indices dans l'ordre décroissant des valeurs
  const deque  = [];

  for (let i = 0; i < n; i++) {
    // 1. Expulse les indices hors fenêtre (front de la déque)
    if (deque.length && deque[0] < i - period + 1) deque.shift();

    // 2. Retire depuis le fond tous les indices dont la valeur est
    //    ≤ à la valeur courante (ils ne pourront jamais être le max)
    while (deque.length && values[deque[deque.length - 1]] <= values[i]) deque.pop();

    deque.push(i);

    // 3. Le front de la déque est le max de la fenêtre courante
    if (i >= period - 1) result[i - period + 1] = values[deque[0]];
  }
  return result;
}

/**
 * Minimum glissant sur une fenêtre de taille `period` — O(n).
 *
 * @param {number[]} values
 * @param {number}   period
 * @returns {number[]}  tableau de longueur (values.length - period + 1)
 */
export function slidingMin(values, period) {
  const n      = values.length;
  const result = new Array(n - period + 1);
  // déque : stocke les indices dans l'ordre croissant des valeurs
  const deque  = [];

  for (let i = 0; i < n; i++) {
    if (deque.length && deque[0] < i - period + 1) deque.shift();

    while (deque.length && values[deque[deque.length - 1]] >= values[i]) deque.pop();

    deque.push(i);

    if (i >= period - 1) result[i - period + 1] = values[deque[0]];
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

// ── Nouvelles fonctions ───────────────────────────────────────

/**
 * EMA multi-périodes (8, 13, 21 par défaut).
 * Utilise la primitive ema() déjà disponible dans ce fichier.
 * @param {Candle[]} candles
 * @param {number[]} [periods=[8, 13, 21]]
 * @returns {Record<string, Point[]>}
 */
export function calcEMAMulti(candles, periods = [8, 13, 21]) {
  const cl = closes(candles);
  const result = {};
  for (const p of periods) {
    result[`ema${p}`] = ema(cl, p).map(({ i, v }) => ({ time: candles[i].time, value: v }));
  }
  return result;
}

/**
 * Double Exponential MA — DEMA = 2 × EMA(n) − EMA(EMA(n)).
 * Réduit le lag par rapport à l'EMA simple.
 *
 * Alignement :
 *   e1[k] → candle[k + (period-1)]
 *   e2[k] → candle[k + 2*(period-1)]
 *   DEMA[k] = 2*e1[k+(period-1)].v − e2[k].v  au temps de candle[k+2*(period-1)]
 *
 * @param {Candle[]} candles
 * @param {number}  [period=20]
 * @returns {Point[]}
 */
export function calcDEMA(candles, period = 20) {
  const cl = closes(candles);
  const e1 = ema(cl, period);
  const e2 = ema(e1.map(x => x.v), period);

  return e2.map(({ v }, k) => ({
    time:  candles[k + 2 * (period - 1)].time,
    value: 2 * e1[k + period - 1].v - v,
  }));
}