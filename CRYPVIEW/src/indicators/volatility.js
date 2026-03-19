// ============================================================
//  src/indicators/volatility.js — CrypView V2
//  Indicateurs de volatilité.
//  Fonctions pures — aucun effet de bord.
// ============================================================

import { closes, sma, ema, stdev } from './moving-averages.js';

/**
 * Calcule le True Range pour chaque bougie à partir de la 2ème.
 * Fonction interne réutilisée par ATR, Keltner, SuperTrend.
 * @param {Candle[]} candles
 * @returns {number[]}
 */
function trueRange(candles) {
  return candles.slice(1).map((c, i) => Math.max(
    c.high - c.low,
    Math.abs(c.high - candles[i].close),
    Math.abs(c.low  - candles[i].close),
  ));
}

/**
 * Bollinger Bands.
 * @param {Candle[]} candles
 * @param {number}   [period=20]
 * @param {number}   [mult=2]
 * @returns {{ mid: Point[], upper: Point[], lower: Point[] }}
 */
export function calcBB(candles, period = 20, mult = 2) {
  const cl  = closes(candles);
  const m   = sma(cl, period);
  const std = stdev(cl, period);

  const mid = [], upper = [], lower = [];

  for (let k = 0; k < m.length; k++) {
    const i  = m[k].i;
    const mv = m[k].v;
    // Protection : std[k] peut ne pas exister si les tableaux ne s'alignent pas
    const sv = std[k]?.v || 0;
    mid.push({ time: candles[i].time, value: mv });
    upper.push({ time: candles[i].time, value: mv + mult * sv });
    lower.push({ time: candles[i].time, value: mv - mult * sv });
  }
  return { mid, upper, lower };
}

/**
 * ATR — Average True Range (smoothing de Wilder).
 * @param {Candle[]} candles
 * @param {number}   [period=14]
 * @returns {{ time: number, value: number }[]}
 */
export function calcATR(candles, period = 14) {
  const tr  = trueRange(candles);
  let   atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const out = [];

  for (let i = period; i < tr.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    out.push({ time: candles[i + 1].time, value: atr });
  }
  return out;
}

/**
 * Keltner Channels (EMA centrée + multiples ATR).
 * @param {Candle[]} candles
 * @param {number}   [period=20]
 * @param {number}   [mult=1.5]
 * @returns {{ mid: Point[], upper: Point[], lower: Point[] }}
 */
export function calcKeltner(candles, period = 20, mult = 1.5) {
  const cl  = closes(candles);
  const m   = ema(cl, period);

  // Calcule l'ATR de la même période pour le canal
  const tr  = trueRange(candles);
  let   a   = tr.slice(0, period).reduce((x, y) => x + y, 0) / period;
  const atrArr = [];
  for (let i = period; i < tr.length; i++) {
    a = (a * (period - 1) + tr[i]) / period;
    atrArr.push({ i: i + 1, v: a });
  }

  const mid = [], upper = [], lower = [];

  m.forEach(({ i, v }) => {
    const atrEntry = atrArr.find((x) => x.i === i);
    if (!atrEntry) return;
    mid.push({ time: candles[i].time, value: v });
    upper.push({ time: candles[i].time, value: v + mult * atrEntry.v });
    lower.push({ time: candles[i].time, value: v - mult * atrEntry.v });
  });

  return { mid, upper, lower };
}

/**
 * SuperTrend.
 * @param {Candle[]} candles
 * @param {number}   [period=10]
 * @param {number}   [mult=3]
 * @returns {{ trend: ColorPoint[], up: NullPoint[], dn: NullPoint[] }}
 */
export function calcSuperTrend(candles, period = 10, mult = 3) {
  // Calcule l'ATR smoothé
  const tr = trueRange(candles);
  let a = tr.slice(0, period).reduce((x, y) => x + y, 0) / period;
  const atr = [];
  for (let i = period; i < tr.length; i++) {
    a = (a * (period - 1) + tr[i]) / period;
    atr.push({ i: i + 1, v: a });
  }

  const up = [], dn = [], trend = [];
  let lastUp = 0, lastDn = 0, lastTrend = 1;

  atr.forEach(({ i, v }) => {
    const mid = (candles[i].high + candles[i].low) / 2;
    let upper  = mid - mult * v;
    let lower  = mid + mult * v;

    upper = Math.max(upper, i > 0 ? lastUp : upper);
    lower = Math.min(lower, i > 0 ? lastDn : lower);

    let t = 1;
    if (lastTrend === 1  && candles[i].close < upper) t = -1;
    else if (lastTrend === -1 && candles[i].close > lower) t = 1;
    else t = lastTrend;

    up.push({ time: candles[i].time, value: t === 1 ? upper : null });
    dn.push({ time: candles[i].time, value: t === -1 ? lower : null });
    trend.push({
      time:  candles[i].time,
      value: t === 1 ? upper : lower,
      color: t === 1 ? '#00ff88' : '#ff3d5a',
    });

    lastUp    = upper;
    lastDn    = lower;
    lastTrend = t;
  });

  return { trend, up, dn };
}
