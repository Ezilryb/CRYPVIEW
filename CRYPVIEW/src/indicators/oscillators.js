// ============================================================
//  src/indicators/oscillators.js — CrypView V2
//  Oscillateurs et indicateurs de momentum.
//  Fonctions pures — aucun effet de bord.
//
//  Règle cursorrules : "Ne jamais laisser de variables non définies
//  dans les calculs d'indicateurs (ex: MACD)."
//  → Chaque accès optionnel est protégé par ?. ou || 0
// ============================================================

import { closes, ema } from './moving-averages.js';

/**
 * RSI — Relative Strength Index (Wilder smoothing).
 * @param {Candle[]} candles
 * @param {number}   [period=14]
 * @returns {{ time: number, value: number }[]}
 */
export function calcRSI(candles, period = 14) {
  const cl  = closes(candles);
  const out = [];
  let avgGain = 0;
  let avgLoss = 0;

  // Initialisation : moyenne des gains/pertes sur la première période
  for (let i = 1; i <= period; i++) {
    const diff = cl[i] - cl[i - 1];
    if (diff > 0) avgGain += diff;
    else          avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period; i < cl.length; i++) {
    if (i > period) {
      const diff = cl[i] - cl[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    }
    // Protection division par zéro : si avgLoss===0 → RSI=100
    out.push({
      time:  candles[i].time,
      value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss),
    });
  }
  return out;
}

/**
 * MACD — Moving Average Convergence/Divergence.
 * @param {Candle[]} candles
 * @param {number}   [fast=12]
 * @param {number}   [slow=26]
 * @param {number}   [signal=9]
 * @returns {{ macd: Point[], signal: Point[], hist: HistPoint[] }}
 */
export function calcMACD(candles, fast = 12, slow = 26, signal = 9) {
  const cl     = closes(candles);
  const fastEma = ema(cl, fast);
  const slowEma = ema(cl, slow);

  // Mappe les EMA rapides par index pour alignement
  const fastMap = new Map(fastEma.map((x) => [x.i, x.v]));

  // Ligne MACD = EMA_rapide - EMA_lente
  const macdLine = [];
  slowEma.forEach(({ i, v }) => {
    if (fastMap.has(i)) macdLine.push({ i, v: fastMap.get(i) - v });
  });

  // Signal = EMA du MACD
  const signalEma = ema(macdLine.map((x) => x.v), signal);

  const macdOut   = [];
  const signalOut = [];
  const histOut   = [];

  signalEma.forEach(({ i: si, v: sv }) => {
    const m = macdLine[si];
    // Protection : m peut être undefined si l'index dépasse le tableau
    if (!m) return;
    const h = m.v - sv;
    macdOut.push({ time: candles[m.i].time, value: m.v });
    signalOut.push({ time: candles[m.i].time, value: sv });
    histOut.push({
      time:  candles[m.i].time,
      value: h,
      color: h >= 0 ? '#00ff8870' : '#ff3d5a70',
    });
  });

  return { macd: macdOut, signal: signalOut, hist: histOut };
}

/**
 * Stochastique (Fast %K et %D lissé).
 * @param {Candle[]} candles
 * @param {number}   [kPeriod=14]
 * @param {number}   [dPeriod=3]
 * @returns {{ k: Point[], d: Point[] }}
 */
export function calcStoch(candles, kPeriod = 14, dPeriod = 3) {
  const k = [];
  for (let i = kPeriod - 1; i < candles.length; i++) {
    const slice = candles.slice(i - kPeriod + 1, i + 1);
    const lo    = Math.min(...slice.map((c) => c.low));
    const hi    = Math.max(...slice.map((c) => c.high));
    k.push({
      time:  candles[i].time,
      value: hi === lo ? 50 : (candles[i].close - lo) / (hi - lo) * 100,
    });
  }

  const d = [];
  for (let i = dPeriod - 1; i < k.length; i++) {
    d.push({
      time:  k[i].time,
      value: (k[i].value + k[i - 1].value + k[i - 2].value) / 3,
    });
  }
  return { k, d };
}

/**
 * CCI — Commodity Channel Index.
 * @param {Candle[]} candles
 * @param {number}   [period=20]
 * @returns {{ time: number, value: number }[]}
 */
export function calcCCI(candles, period = 20) {
  const out = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const tp    = slice.map((c) => (c.high + c.low + c.close) / 3);
    const mean  = tp.reduce((a, b) => a + b) / period;
    const md    = tp.reduce((a, b) => a + Math.abs(b - mean), 0) / period;
    // Protection division par zéro sur md
    out.push({
      time:  candles[i].time,
      value: md ? (tp[tp.length - 1] - mean) / (0.015 * md) : 0,
    });
  }
  return out;
}

/**
 * ADX + DI+/DI- (Average Directional Index avec smoothing de Wilder).
 * @param {Candle[]} candles
 * @param {number}   [period=14]
 * @returns {{ diP: Point[], diN: Point[], adx: Point[] }}
 */
export function calcADX(candles, period = 14) {
  const dmP = [], dmN = [], tr = [];

  for (let i = 1; i < candles.length; i++) {
    const upMove   = candles[i].high  - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    dmP.push(upMove > downMove && upMove > 0 ? upMove : 0);
    dmN.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low  - candles[i - 1].close),
    ));
  }

  // Smoothed TR / DM+ / DM- (Wilder)
  const smTR = [], smDMP = [], smDMN = [];
  let t  = tr.slice(0, period).reduce((a, b) => a + b, 0);
  let dp = dmP.slice(0, period).reduce((a, b) => a + b, 0);
  let dn = dmN.slice(0, period).reduce((a, b) => a + b, 0);
  smTR.push(t); smDMP.push(dp); smDMN.push(dn);

  for (let i = period; i < tr.length; i++) {
    t  = t  - t  / period + tr[i];
    dp = dp - dp / period + dmP[i];
    dn = dn - dn / period + dmN[i];
    smTR.push(t); smDMP.push(dp); smDMN.push(dn);
  }

  const diP = [], diN = [];
  smTR.forEach((t, i) => {
    const p = t ? 100 * smDMP[i] / t : 0;
    const n = t ? 100 * smDMN[i] / t : 0;
    diP.push({ time: candles[i + period].time, value: p });
    diN.push({ time: candles[i + period].time, value: n });
  });

  const adx = [];
  for (let i = period - 1; i < diP.length; i++) {
    const slice = diP.slice(i - period + 1, i + 1);
    const dx = slice.map((x, j) => {
      const s = x.value + diN[i - period + 1 + j].value;
      return s ? 100 * Math.abs(x.value - diN[i - period + 1 + j].value) / s : 0;
    });
    adx.push({ time: diP[i].time, value: dx.reduce((a, b) => a + b, 0) / period });
  }

  return { diP, diN, adx };
}

/**
 * Williams %R.
 * @param {Candle[]} candles
 * @param {number}   [period=14]
 * @returns {{ time: number, value: number }[]}
 */
export function calcWilliamsR(candles, period = 14) {
  const out = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const hi    = Math.max(...slice.map((c) => c.high));
    const lo    = Math.min(...slice.map((c) => c.low));
    out.push({
      time:  candles[i].time,
      value: hi === lo ? -50 : (candles[i].close - hi) / (hi - lo) * 100,
    });
  }
  return out;
}

/**
 * MFI — Money Flow Index.
 * @param {Candle[]} candles
 * @param {number}   [period=14]
 * @returns {{ time: number, value: number }[]}
 */
export function calcMFI(candles, period = 14) {
  const out = [];
  for (let i = period; i < candles.length; i++) {
    let posFlow = 0;
    let negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const tp     = (candles[j].high + candles[j].low + candles[j].close) / 3;
      const prevTp = (candles[j - 1].high + candles[j - 1].low + candles[j - 1].close) / 3;
      const mf     = tp * candles[j].volume;
      if (tp > prevTp) posFlow += mf;
      else             negFlow += mf;
    }
    // Protection division par zéro
    const ratio = negFlow ? posFlow / negFlow : 100;
    out.push({ time: candles[i].time, value: 100 - 100 / (1 + ratio) });
  }
  return out;
}

/**
 * Momentum brut (close[i] - close[i-period]).
 * @param {Candle[]} candles
 * @param {number}   [period=10]
 * @returns {{ time: number, value: number, color: string }[]}
 */
export function calcMom(candles, period = 10) {
  return candles.slice(period).map((c, i) => ({
    time:  c.time,
    value: c.close - candles[i].close,
    color: c.close - candles[i].close >= 0 ? 'rgba(176,255,92,.7)' : 'rgba(255,61,90,.7)',
  }));
}
