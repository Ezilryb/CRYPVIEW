// ============================================================
//  src/indicators/volatility.js — CrypView V2
//  Indicateurs de volatilité.
//  Fonctions pures — aucun effet de bord.
// ============================================================

import { closes, sma, ema, stdev, slidingMax, slidingMin } from './moving-averages.js';

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

/**
 * Donchian Channels — hauts/bas sur N périodes glissantes.
 * Utilise slidingMax/slidingMin (O(n)) déjà dispo dans moving-averages.js.
 * @param {Candle[]} candles
 * @param {number}  [period=20]
 * @returns {{ upper: Point[], mid: Point[], lower: Point[] }}
 */
export function calcDonchian(candles, period = 20) {
  const highs = candles.map(c => c.high);
  const lows  = candles.map(c => c.low);
  const maxH  = slidingMax(highs, period);
  const minL  = slidingMin(lows,  period);

  const upper = [], lower = [], mid = [];
  maxH.forEach((hi, j) => {
    const lo = minL[j];
    const t  = candles[j + period - 1].time;
    upper.push({ time: t, value: hi });
    lower.push({ time: t, value: lo });
    mid.push({ time: t, value: (hi + lo) / 2 });
  });
  return { upper, lower, mid };
}

/**
 * Parabolic SAR — Stop And Reverse.
 * Renvoie un seul tableau avec couleur par point (LW 4.x supporte per-point colors).
 *
 * @param {Candle[]} candles
 * @param {number}  [step=0.02]   — incrément du facteur d'accélération (AF)
 * @param {number}  [maxAF=0.2]   — AF maximum
 * @returns {{ time: number, value: number, color: string }[]}
 */
export function calcParabolicSAR(candles, step = 0.02, maxAF = 0.2) {
  if (candles.length < 2) return [];
  const out = [];
  let bull = true;
  let sar  = candles[0].low;
  let ep   = candles[0].high;
  let af   = step;

  for (let i = 1; i < candles.length; i++) {
    const c    = candles[i];
    const prev = candles[i - 1];

    sar = sar + af * (ep - sar);

    if (bull) {
      // SAR ne peut pas dépasser les deux plus bas précédents
      sar = Math.min(sar, prev.low, i > 1 ? candles[i - 2].low : prev.low);
      if (c.low < sar) {
        // Retournement baissier
        bull = false; sar = ep; ep = c.low; af = step;
      } else if (c.high > ep) {
        ep = c.high;
        af = Math.min(af + step, maxAF);
      }
    } else {
      // SAR ne peut pas être inférieur aux deux plus hauts précédents
      sar = Math.max(sar, prev.high, i > 1 ? candles[i - 2].high : prev.high);
      if (c.high > sar) {
        // Retournement haussier
        bull = true; sar = ep; ep = c.high; af = step;
      } else if (c.low < ep) {
        ep = c.low;
        af = Math.min(af + step, maxAF);
      }
    }

    out.push({ time: c.time, value: sar, color: bull ? '#00ff88' : '#ff3d5a' });
  }
  return out;
}

/**
 * Pivot Points Standard — calculés sur la dernière bougie fermée.
 * PP = (H+L+C)/3 · R1/S1 = 2×PP−L/H · R2/S2 = PP±(H−L) · R3/S3 extrêmes.
 * Renvoie des segments horizontaux sur les N dernières bougies visibles.
 *
 * @param {Candle[]} candles
 * @returns {{ pp, r1, r2, r3, s1, s2, s3: Point[] } | null}
 */
export function calcPivotPoints(candles) {
  if (candles.length < 2) return null;
  const ref = candles.at(-2);              // avant-dernière bougie (complète)
  const { high: h, low: l, close: c } = ref;
  const pp    = (h + l + c) / 3;
  const span  = Math.min(50, candles.length);
  const t0    = candles.at(-span).time;
  const t1    = candles.at(-1).time;
  const line  = v => [{ time: t0, value: v }, { time: t1, value: v }];

  return {
    pp: line(pp),
    r1: line(2 * pp - l),         s1: line(2 * pp - h),
    r2: line(pp + (h - l)),        s2: line(pp - (h - l)),
    r3: line(h + 2 * (pp - l)),   s3: line(l - 2 * (h - pp)),
  };
}

/**
 * Canal de Régression Linéaire — régression des closes sur N bougies.
 * Renvoie le canal central ± mult × écart-type des résidus.
 *
 * @param {Candle[]} candles
 * @param {number}  [period=50]
 * @param {number}  [mult=2]
 * @returns {{ mid: Point[], upper: Point[], lower: Point[] }}
 */
export function calcLinReg(candles, period = 50, mult = 2) {
  const out = { mid: [], upper: [], lower: [] };
  if (candles.length < period) return out;

  for (let i = period - 1; i < candles.length; i++) {
    const n = period;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let j = 0; j < n; j++) {
      const y = candles[i - n + 1 + j].close;
      sumX += j; sumY += y; sumXY += j * y; sumXX += j * j;
    }
    const denom = n * sumXX - sumX * sumX;
    if (!denom) continue;
    const m    = (n * sumXY - sumX * sumY) / denom;
    const b    = (sumY - m * sumX) / n;
    const yEnd = m * (n - 1) + b;   // valeur projetée à la dernière bougie

    let resSum = 0;
    for (let j = 0; j < n; j++) {
      resSum += (candles[i - n + 1 + j].close - (m * j + b)) ** 2;
    }
    const sd = Math.sqrt(resSum / n);

    out.mid.push({   time: candles[i].time, value: yEnd });
    out.upper.push({ time: candles[i].time, value: yEnd + mult * sd });
    out.lower.push({ time: candles[i].time, value: yEnd - mult * sd });
  }
  return out;
}

/**
 * Squeeze Momentum (LazyBear simplifié).
 * Détecte la compression BB < KC (squeeze) et quantifie le momentum.
 * Couleurs : translucides = squeeze actif, opaques = squeeze libéré.
 *
 * @param {Candle[]} candles
 * @param {number}  [bbPeriod=20]
 * @param {number}  [bbMult=2]
 * @param {number}  [kcPeriod=20]
 * @param {number}  [kcMult=1.5]
 * @returns {{ time: number, value: number, color: string }[]}
 */
export function calcSqueeze(candles, bbPeriod = 20, bbMult = 2, kcPeriod = 20, kcMult = 1.5) {
  const { upper: bbU, lower: bbL } = calcBB(candles, bbPeriod, bbMult);
  const { upper: kcU, lower: kcL } = calcKeltner(candles, kcPeriod, kcMult);

  // Aligne par timestamp pour éviter les décalages de longueur entre BB et KC
  const kcMap     = new Map(kcU.map((u, j) => [u.time, { u: u.value, l: kcL[j].value }]));
  const closeMap  = new Map(candles.map(c => [c.time, c.close]));

  return bbU.map((u, j) => {
    const t  = u.time;
    const kc = kcMap.get(t);
    if (!kc) return null;

    const bb  = { u: u.value, l: bbL[j].value };
    const sqz = bb.u < kc.u && bb.l > kc.l;         // BB entièrement dans KC
    const mid = (bb.u + bb.l + kc.u + kc.l) / 4;
    const mom = (closeMap.get(t) ?? 0) - mid;

    return {
      time:  t,
      value: mom,
      color: sqz
        ? (mom >= 0 ? '#00ff8855' : '#ff3d5a55')     // squeeze : translucide
        : (mom >= 0 ? '#00ff88'   : '#ff3d5a'),       // libéré  : opaque
    };
  }).filter(Boolean);
}