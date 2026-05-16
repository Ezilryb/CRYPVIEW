// ============================================================
//  src/features/PaperTrading.js — CrypView V3.4
//  Moteur de Paper Trading (simulation sans risque).
//
//  Philosophie "no-backend" :
//    - Tout en mémoire + localStorage (clé crypview_paper_v1)
//    - Comparaison tick-à-tick sur flux WS existant (check())
//    - Zéro dépendance externe
//
//  Modèle simplifié Spot :
//    - Ordres Market immédiats au prix courant
//    - Stop-Loss et Take-Profit optionnels sur chaque position
//    - Frais de 0.1% par trade (configurable via TAKER_FEE)
//    - Courbe equity mise à jour à chaque check()
// ============================================================

import { showToast }          from '../utils/toast.js';
import { fmtPrice, fmtTime } from '../utils/format.js';

const STORAGE_KEY  = 'crypview_paper_v1';
const DEFAULT_BALANCE = 10_000;
const TAKER_FEE       = 0.001;
const MAX_EQUITY_PTS  = 500;

/**
 * @typedef {object} PaperPosition
 * @property {string}      id
 * @property {string}      symbol
 * @property {'long'|'short'} side
 * @property {number}      qty
 * @property {number}      entryPrice
 * @property {number}      stopLoss
 * @property {number}      takeProfit
 * @property {number}      openedAt
 * @property {number}      pnl
 * @property {number}      pnlPct
 */

/**
 * @typedef {object} PaperTrade
 * @property {string}      id
 * @property {string}      symbol
 * @property {'long'|'short'} side
 * @property {'open'|'close'|'sl'|'tp'} action
 * @property {number}      qty
 * @property {number}      price
 * @property {number}      fee
 * @property {number}      pnl
 * @property {number}      timestamp
 */

/**
 * @typedef {object} EquityPoint
 * @property {number} time
 * @property {number} value
 */

export class PaperTradingEngine {
  /** @type {number}*/
  #balance  = DEFAULT_BALANCE;

  /** @type {PaperPosition[]} */
  #positions = [];

  /** @type {PaperTrade[]} */
  #trades    = [];

  /** @type {EquityPoint[]} */
  #equity    = [];

  #lastPrices = new Map();

  #peakEquity = DEFAULT_BALANCE;

  onUpdate = () => {};

  constructor() {
    this.#load();
  }

  /**
   * @param {'long'|'short'} side
   * @param {string} symbol
   * @param {number} price
   * @param {number} usdtAmount
   * @param {number} [stopLoss=0]
   * @param {number} [takeProfit=0]
   * @returns {PaperPosition|null}
   */
  openPosition(side, symbol, price, usdtAmount, stopLoss = 0, takeProfit = 0) {
    if (usdtAmount <= 0 || price <= 0) return null;
    if (usdtAmount > this.#balance) {
      showToast('Solde insuffisant.', 'error');
      return null;
    }

    const fee = usdtAmount * TAKER_FEE;
    const qty = (usdtAmount - fee) / price;

    this.#balance -= (usdtAmount + fee);

    const pos = {
      id:         `pos_${Date.now()}`,
      symbol:     symbol.toUpperCase(),
      side,
      qty,
      entryPrice: price,
      stopLoss:   stopLoss  ?? 0,
      takeProfit: takeProfit ?? 0,
      openedAt:   Date.now(),
      pnl:        0,
      pnlPct:     0,
    };
    this.#positions.push(pos);

    const trade = {
      id:        `tr_${Date.now()}`,
      symbol:    pos.symbol,
      side,
      action:    'open',
      qty,
      price,
      fee,
      pnl:       0,
      timestamp: Date.now(),
    };
    this.#trades.unshift(trade);

    this.#save();
    this.onUpdate();

    showToast(
      `📈 ${side.toUpperCase()} ouvert — ${pos.symbol} @ ${fmtPrice(price)}`,
      'success', 3_000
    );
    return pos;
  }

  /**
   * @param {string} posId
   * @param {number} price
   * @param {'close'|'sl'|'tp'} [reason='close']
   * @returns {number}
   */
  closePosition(posId, price, reason = 'close') {
    const idx = this.#positions.findIndex(p => p.id === posId);
    if (idx === -1) return 0;
    const pos  = this.#positions[idx];
    const pnl  = this.#calcUnrealizedPnl(pos, price);
    const fee  = pos.qty * price * TAKER_FEE;
    const recv = pos.qty * price - fee;

    this.#balance += recv;
    this.#positions.splice(idx, 1);

    const trade = {
      id:        `tr_${Date.now()}`,
      symbol:    pos.symbol,
      side:      pos.side,
      action:    reason,
      qty:       pos.qty,
      price,
      fee,
      pnl,
      timestamp: Date.now(),
    };
    this.#trades.unshift(trade);
    if (this.#trades.length > 200) this.#trades.pop();

    this.#save();
    this.onUpdate();

    const icon   = reason === 'sl' ? '🛑' : reason === 'tp' ? '🎯' : '📤';
    const color  = pnl >= 0 ? 'success' : 'error';
    showToast(
      `${icon} Position fermée ${pos.symbol} — P&L : ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`,
      color, 4_000
    );
    return pnl;
  }

  /**
   * @param {string} symbol
   * @param {number} price
   */
  check(symbol, price) {
    const sym = symbol.toUpperCase();
    this.#lastPrices.set(sym, price);

    let changed = false;
    for (const pos of [...this.#positions]) {
      if (pos.symbol !== sym) continue;

      pos.pnl    = this.#calcUnrealizedPnl(pos, price);
      pos.pnlPct = (pos.pnl / (pos.entryPrice * pos.qty)) * 100;
      changed    = true;

      if (pos.stopLoss > 0) {
        const hit = pos.side === 'long'
          ? price <= pos.stopLoss
          : price >= pos.stopLoss;
        if (hit) { this.closePosition(pos.id, price, 'sl'); continue; }
      }

      if (pos.takeProfit > 0) {
        const hit = pos.side === 'long'
          ? price >= pos.takeProfit
          : price <= pos.takeProfit;
        if (hit) { this.closePosition(pos.id, price, 'tp'); continue; }
      }
    }

    if (changed) {
      this.#pushEquityPoint();
      this.onUpdate();
    }
  }

  reset() {
    this.#balance   = DEFAULT_BALANCE;
    this.#positions = [];
    this.#trades    = [];
    this.#equity    = [{ time: Date.now(), value: DEFAULT_BALANCE }];
    this.#peakEquity = DEFAULT_BALANCE;
    this.#save();
    this.onUpdate();
    showToast('Paper Trading réinitialisé', 'info');
  }

  get balance()   { return this.#balance; }
  get positions() { return [...this.#positions]; }
  get trades()    { return [...this.#trades]; }
  get equity()    { return [...this.#equity]; }

  get totalEquity() {
    const openVal = this.#positions.reduce((acc, p) => acc + p.pnl, 0);
    return this.#balance + openVal;
  }

  get realizedPnl() {
    return this.#trades
      .filter(t => t.action !== 'open')
      .reduce((a, t) => a + t.pnl, 0);
  }

  get maxDrawdown() {
    if (!this.#equity.length) return 0;
    let peak = this.#equity[0].value;
    let maxDD = 0;
    for (const pt of this.#equity) {
      if (pt.value > peak) peak = pt.value;
      const dd = (peak - pt.value) / peak * 100;
      if (dd > maxDD) maxDD = dd;
    }
    return maxDD;
  }

  get winRate() {
    const closed = this.#trades.filter(t => t.action !== 'open');
    if (!closed.length) return 0;
    return (closed.filter(t => t.pnl > 0).length / closed.length) * 100;
  }

  #calcUnrealizedPnl(pos, price) {
    const raw = pos.side === 'long'
      ? (price - pos.entryPrice) * pos.qty
      : (pos.entryPrice - price) * pos.qty;
    return parseFloat(raw.toFixed(4));
  }

  #pushEquityPoint() {
    const val = this.totalEquity;
    if (val > this.#peakEquity) this.#peakEquity = val;
    this.#equity.push({ time: Date.now(), value: val });
    if (this.#equity.length > MAX_EQUITY_PTS) this.#equity.shift();
  }

  #load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { this.#equity = [{ time: Date.now(), value: DEFAULT_BALANCE }]; return; }
      const d = JSON.parse(raw);
      this.#balance   = d.balance   ?? DEFAULT_BALANCE;
      this.#positions = d.positions ?? [];
      this.#trades    = d.trades    ?? [];
      this.#equity    = d.equity?.length ? d.equity : [{ time: Date.now(), value: this.#balance }];
    } catch (_) {
      this.#equity = [{ time: Date.now(), value: DEFAULT_BALANCE }];
    }
  }

  #save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance:   this.#balance,
        positions: this.#positions,
        trades:    this.#trades.slice(0, 100),
        equity:    this.#equity,
      }));
    } catch (_) {}
  }
}
