// ============================================================
//  src/features/Backtester.js — CrypView V3.4
//  Moteur de Backtesting sur historique de bougies.
//
//  Principe :
//    1. Calcule les indicateurs demandés sur les candles fournies
//    2. Évalue les conditions d'entrée/sortie bougie par bougie
//    3. Simule une position fictive (frais, SL, TP inclus)
//    4. Retourne métriques + trades + courbe equity
//
//  Stratégies disponibles (combinables en AND/OR) :
//    rsi_below / rsi_above        → croisement de seuil RSI
//    macd_cross_up / macd_cross_down → croisement MACD/Signal
//    ma_cross_up / ma_cross_down  → croisement MA20 > MA50
//    price_above_vwap / price_below_vwap
//    bb_breakout_up / bb_breakout_down → prix sort des bandes
//    momentum_positive / momentum_negative
// ============================================================

import {
  calcRSI, calcMACD, calcMom,
} from '../indicators/oscillators.js';
import {
  calcMA, calcVWAP, calcBB,
} from '../indicators/index.js';

export const SIGNAL_TYPES = [
  { id: 'rsi_below',          label: 'RSI ≤ seuil (survente)',     hasValue: true,  defaultValue: 30 },
  { id: 'rsi_above',          label: 'RSI ≥ seuil (surachat)',     hasValue: true,  defaultValue: 70 },
  { id: 'macd_cross_up',      label: 'Croisement MACD ↑ (bullish)', hasValue: false, defaultValue: null },
  { id: 'macd_cross_down',    label: 'Croisement MACD ↓ (bearish)', hasValue: false, defaultValue: null },
  { id: 'ma_cross_up',        label: 'Golden Cross (MA20 > MA50)',  hasValue: false, defaultValue: null },
  { id: 'ma_cross_down',      label: 'Death Cross (MA20 < MA50)',   hasValue: false, defaultValue: null },
  { id: 'price_above_vwap',   label: 'Prix au-dessus du VWAP',     hasValue: false, defaultValue: null },
  { id: 'price_below_vwap',   label: 'Prix en-dessous du VWAP',    hasValue: false, defaultValue: null },
  { id: 'bb_breakout_up',     label: 'Breakout Bollinger haut',    hasValue: false, defaultValue: null },
  { id: 'bb_breakout_down',   label: 'Breakout Bollinger bas',     hasValue: false, defaultValue: null },
  { id: 'momentum_positive',  label: 'Momentum positif',           hasValue: false, defaultValue: null },
  { id: 'momentum_negative',  label: 'Momentum négatif',           hasValue: false, defaultValue: null },
];

const TAKER_FEE = 0.001;

/**
 * @typedef {object} BacktestConfig
 * @property {string}   side           — 'long' | 'short'
 * @property {object[]} entryConditions — [{ type, value?, logic }]
 * @property {object[]} exitConditions  — [{ type, value?, logic }]
 * @property {'AND'|'OR'} entryLogic
 * @property {'AND'|'OR'} exitLogic
 * @property {number}   stopLossPct     — % depuis entrée (0 = off)
 * @property {number}   takeProfitPct   — % depuis entrée (0 = off)
 * @property {number}   capitalPct      — % du capital engagé par trade (ex: 10)
 * @property {number}   initialBalance
 */

/**
 * @typedef {object} BacktestResult
 * @property {object[]} trades
 * @property {object[]} equity
 * @property {object}   metrics
 */

export class Backtester {
  /**
   * Lance le backtest.
   * @param {Candle[]}       candles
   * @param {BacktestConfig} config
   * @returns {BacktestResult}
   */
  static run(candles, config) {
    if (candles.length < 60) {
      return { trades: [], equity: [], metrics: { error: 'Historique insuffisant (min. 60 bougies).' } };
    }

    // ── 1. Pré-calcul des indicateurs ────────────────────────
    const indicators = Backtester.#buildIndicatorCache(candles);

    // ── 2. Simulation bougie par bougie ──────────────────────
    const trades     = [];
    const equity     = [];
    let balance      = config.initialBalance ?? 10_000;
    let openTrade    = null;

    for (let i = 1; i < candles.length; i++) {
      const c    = candles[i];
      const prev = candles[i - 1];
      const ind  = indicators[i];
      const indP = indicators[i - 1];

      // Mise à jour equity courante
      if (openTrade) {
        const pnl = config.side === 'long'
          ? (c.close - openTrade.entry) * openTrade.qty
          : (openTrade.entry - c.close) * openTrade.qty;
        openTrade.unrealized = pnl;

        // Stop-Loss
        if (config.stopLossPct > 0) {
          const sl = config.side === 'long'
            ? openTrade.entry * (1 - config.stopLossPct / 100)
            : openTrade.entry * (1 + config.stopLossPct / 100);
          const hit = config.side === 'long' ? c.low <= sl : c.high >= sl;
          if (hit) {
            balance = Backtester.#closeTrade(openTrade, sl, 'sl', balance, trades, config.side);
            openTrade = null;
            equity.push({ time: c.time, value: balance });
            continue;
          }
        }

        // Take-Profit
        if (config.takeProfitPct > 0) {
          const tp = config.side === 'long'
            ? openTrade.entry * (1 + config.takeProfitPct / 100)
            : openTrade.entry * (1 - config.takeProfitPct / 100);
          const hit = config.side === 'long' ? c.high >= tp : c.low <= tp;
          if (hit) {
            balance = Backtester.#closeTrade(openTrade, tp, 'tp', balance, trades, config.side);
            openTrade = null;
            equity.push({ time: c.time, value: balance });
            continue;
          }
        }
      }

      // Signal d'entrée (pas de position ouverte)
      if (!openTrade) {
        const entry = Backtester.#evalConditions(
          config.entryConditions, config.entryLogic,
          c, prev, ind, indP
        );
        if (entry) {
          const usdtSize = balance * (config.capitalPct / 100);
          const fee      = usdtSize * TAKER_FEE;
          const qty      = (usdtSize - fee) / c.close;
          balance       -= (usdtSize + fee);
          openTrade = {
            id:         `bt_${i}`,
            time:       c.time,
            entry:      c.close,
            qty,
            fee,
            unrealized: 0,
          };
        }
      }
      // Signal de sortie (position ouverte)
      else {
        const exit = Backtester.#evalConditions(
          config.exitConditions, config.exitLogic,
          c, prev, ind, indP
        );
        if (exit) {
          balance   = Backtester.#closeTrade(openTrade, c.close, 'close', balance, trades, config.side);
          openTrade = null;
        }
      }

      equity.push({ time: c.time, value: balance + (openTrade?.unrealized ?? 0) });
    }

    // Ferme la position restante à la dernière bougie
    if (openTrade) {
      const last = candles.at(-1);
      balance = Backtester.#closeTrade(openTrade, last.close, 'close', balance, trades, config.side);
      equity.push({ time: last.time, value: balance });
    }

    return {
      trades,
      equity,
      metrics: Backtester.#calcMetrics(trades, equity, config.initialBalance ?? 10_000),
    };
  }

  // ── Privé — calcul indicateurs ────────────────────────────

  static #buildIndicatorCache(candles) {
    const n     = candles.length;
    const cache = new Array(n).fill(null).map(() => ({}));

    // Map time → index (Number() pour absorber string/number selon la source)
    const timeToIdx = new Map(candles.map((c, i) => [Number(c.time), i]));
    const byTime    = pt => timeToIdx.get(Number(pt.time)) ?? -1;

    // RSI
    try {
      calcRSI(candles, 14).forEach(pt => {
        const i = byTime(pt); if (i >= 0) cache[i].rsi = pt.value;
      });
    } catch (_) {}

    // MACD
    try {
      const { macd, signal } = calcMACD(candles);
      macd.forEach((pt, k) => {
        const i = byTime(pt);
        if (i >= 0) { cache[i].macd = pt.value; cache[i].signal = signal[k]?.value; }
      });
    } catch (_) {}

    // MA20 / MA50
    try {
      const { ma20, ma50 } = calcMA(candles);
      ma20.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].ma20 = pt.value; });
      ma50.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].ma50 = pt.value; });
    } catch (_) {}

    // VWAP — aligné par index (les valeurs ne portent pas forcément de time)
    try {
      calcVWAP(candles).forEach((pt, k) => { if (k < n) cache[k].vwap = pt.value; });
    } catch (_) {}

    // Bollinger
    try {
      const { upper, lower } = calcBB(candles, 20, 2);
      upper.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].bbUpper = pt.value; });
      lower.forEach(pt => { const i = byTime(pt); if (i >= 0) cache[i].bbLower = pt.value; });
    } catch (_) {}

    // Momentum
    try {
      calcMom(candles, 10).forEach(pt => {
        const i = byTime(pt); if (i >= 0) cache[i].momentum = pt.value;
      });
    } catch (_) {}

    return cache;
  }

  // ── Privé — évaluation des conditions ────────────────────

  static #evalConditions(conditions, logic, c, prev, ind, indP) {
    if (!conditions?.length) return false;
    const results = conditions.map(cond => {
      switch (cond.type) {
        case 'rsi_below':
          return ind.rsi != null && ind.rsi <= (cond.value ?? 30);
        case 'rsi_above':
          return ind.rsi != null && ind.rsi >= (cond.value ?? 70);
        case 'macd_cross_up':
          return indP.macd != null && ind.macd != null
            && indP.macd <= indP.signal && ind.macd > ind.signal;
        case 'macd_cross_down':
          return indP.macd != null && ind.macd != null
            && indP.macd >= indP.signal && ind.macd < ind.signal;
        case 'ma_cross_up':
          return indP.ma20 != null && ind.ma20 != null
            && indP.ma20 <= indP.ma50 && ind.ma20 > ind.ma50;
        case 'ma_cross_down':
          return indP.ma20 != null && ind.ma20 != null
            && indP.ma20 >= indP.ma50 && ind.ma20 < ind.ma50;
        case 'price_above_vwap':
          return ind.vwap != null && c.close > ind.vwap;
        case 'price_below_vwap':
          return ind.vwap != null && c.close < ind.vwap;
        case 'bb_breakout_up':
          return ind.bbUpper != null && c.close > ind.bbUpper;
        case 'bb_breakout_down':
          return ind.bbLower != null && c.close < ind.bbLower;
        case 'momentum_positive':
          return ind.momentum != null && ind.momentum > 0;
        case 'momentum_negative':
          return ind.momentum != null && ind.momentum < 0;
        default:
          return false;
      }
    });
    return logic === 'OR' ? results.some(Boolean) : results.every(Boolean);
  }

  // ── Privé — clôture de trade ──────────────────────────────

  static #closeTrade(open, closePrice, reason, balance, trades, side = 'long') {
    const isLong = side !== 'short';
    // PnL brut : positif si la direction est correcte
    const pnl    = open.qty * (isLong
      ? (closePrice - open.entry)   // long  : gain si prix monte
      : (open.entry - closePrice)); // short : gain si prix baisse
    const fee    = open.qty * closePrice * TAKER_FEE;
    // Restitution du capital engagé (qty * entry) + PnL - frais de sortie
    // Pour long  : qty*entry + qty*(close-entry) - fee = qty*close - fee  ✓
    // Pour short : qty*entry + qty*(entry-close) - fee = qty*(2*entry-close) - fee ✓
    const recv   = open.qty * open.entry + pnl - fee;
    const newBal = balance + recv;
    trades.push({
      id:         open.id,
      entryTime:  open.time,
      exitTime:   Date.now(),
      entry:      open.entry,
      exit:       closePrice,
      qty:        open.qty,
      pnl:        parseFloat(pnl.toFixed(4)),
      pnlPct:     parseFloat((pnl / (open.qty * open.entry) * 100).toFixed(2)),
      fee:        open.fee + fee,
      reason,
    });
    return parseFloat(newBal.toFixed(4));
  }

  // ── Privé — calcul des métriques ──────────────────────────

  static #calcMetrics(trades, equity, initial) {
    if (!trades.length) return { trades: 0, message: 'Aucun trade déclenché sur cette période.' };

    const wins    = trades.filter(t => t.pnl > 0);
    const losses  = trades.filter(t => t.pnl < 0);
    const totalPnl = trades.reduce((a, t) => a + t.pnl, 0);
    const finalEq  = equity.at(-1)?.value ?? initial;

    // Max Drawdown
    let peak = initial, maxDD = 0;
    for (const pt of equity) {
      if (pt.value > peak) peak = pt.value;
      const dd = (peak - pt.value) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }

    // Profit Factor
    const grossProfit = wins.reduce((a, t) => a + t.pnl, 0);
    const grossLoss   = Math.abs(losses.reduce((a, t) => a + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Sharpe approximé (annualisé, risk-free = 0)
    const rets = equity.map((pt, i) => i === 0 ? 0 : (pt.value - equity[i - 1].value) / equity[i - 1].value);
    const mean = rets.reduce((a, r) => a + r, 0) / rets.length;
    const std  = Math.sqrt(rets.reduce((a, r) => a + (r - mean) ** 2, 0) / rets.length);
    const sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : 0;

    return {
      trades:         trades.length,
      wins:           wins.length,
      losses:         losses.length,
      winRate:        parseFloat((wins.length / trades.length * 100).toFixed(1)),
      totalPnl:       parseFloat(totalPnl.toFixed(2)),
      totalPnlPct:    parseFloat(((finalEq - initial) / initial * 100).toFixed(2)),
      finalBalance:   parseFloat(finalEq.toFixed(2)),
      maxDrawdown:    parseFloat(maxDD.toFixed(2)),
      profitFactor:   parseFloat(profitFactor.toFixed(2)),
      sharpe:         parseFloat(sharpe.toFixed(2)),
      avgWin:         wins.length  ? parseFloat((grossProfit / wins.length).toFixed(2))   : 0,
      avgLoss:        losses.length ? parseFloat((grossLoss / losses.length).toFixed(2))  : 0,
    };
  }
}
