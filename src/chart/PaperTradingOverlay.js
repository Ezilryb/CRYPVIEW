// ============================================================
//  src/chart/PaperTradingOverlay.js — CrypView V3.4
//  Affiche les points d'entrée/sortie du Paper Trading
//  directement sur le graphique via LightweightCharts markers.
//
//  Markers :
//    LONG open   → arrowUp  vert  belowBar  "▲ BUY"
//    SHORT open  → arrowDown rouge aboveBar  "▼ SELL"
//    TP / close  → arrow opposé, couleur selon P&L
//    SL          → carré rouge  "⛔ SL"
//
//  Usage :
//    const overlay = new PaperTradingOverlay(cSeries);
//    overlay.syncFromTrades(engine.trades, 'BTCUSDT');
//    overlay.toggle();                 // → boolean (état visible)
//    overlay.setVisible(false);
//    overlay.updateSeries(newSeries);  // après reconnexion
//    overlay.clear();                  // efface tout
//    overlay.destroy();
// ============================================================

/** @typedef {{ time:number, position:string, color:string, shape:string, text:string, size:number }} LWMarker */

export class PaperTradingOverlay {
  /** @type {import('lightweight-charts').ISeriesApi<any>|null} */
  #cSeries  = null;
  /** @type {LWMarker[]} */
  #markers  = [];
  #visible  = true;

  /** @param {import('lightweight-charts').ISeriesApi<any>} cSeries */
  constructor(cSeries) {
    this.#cSeries = cSeries;
  }

  /**
   * @param {import('../features/PaperTrading').PaperTrade[]} trades
   * @param {string} [symbol]
   */
  syncFromTrades(trades, symbol) {
    const sym = symbol?.toUpperCase();

    this.#markers = trades
      .filter(t => !sym || t.symbol === sym)
      .map(t => this.#tradeToMarker(t))
      .filter(Boolean);

    this.#render();
  }

  /**
   * @returns {boolean} nouvel état
   */
  toggle() {
    this.#visible = !this.#visible;
    this.#render();
    return this.#visible;
  }

  /**
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.#visible = visible;
    this.#render();
  }

  /** @returns {boolean} */
  get visible() { return this.#visible; }

  /**
   */
  clear() {
    this.#markers = [];
    this.#render();
  }

  /**
   * @param {import('lightweight-charts').ISeriesApi<any>} cSeries
   */
  updateSeries(cSeries) {
    try { this.#cSeries?.setMarkers([]); } catch (_) {}
    this.#cSeries = cSeries;
    this.#render();
  }

  destroy() {
    try { this.#cSeries?.setMarkers([]); } catch (_) {}
    this.#cSeries = null;
    this.#markers = [];
  }

  /**
   * @param {import('../features/PaperTrading').PaperTrade} t
   * @returns {LWMarker|null}
   */
  #tradeToMarker(t) {
    const time = Math.floor(t.timestamp / 1_000);
    if (!time || !t.price) return null;

    const isOpen  = t.action === 'open';
    const isLong  = t.side   === 'long';

    if (isOpen) {
      return {
        time,
        position: isLong ? 'belowBar' : 'aboveBar',
        color:    isLong ? '#00ff88'  : '#ff3d5a',
        shape:    isLong ? 'arrowUp'  : 'arrowDown',
        text:     isLong ? '▲ BUY'   : '▼ SELL',
        size:     1,
      };
    }

    const label = t.action === 'sl' ? '⛔ SL'
                : t.action === 'tp' ? '🎯 TP'
                : '✕ CLOSE';
    const profitColor = t.pnl >= 0 ? '#00ff88' : '#ff3d5a';

    return {
      time,
      position: isLong ? 'aboveBar'  : 'belowBar',
      color:    t.action === 'sl' ? '#ff3d5a' : profitColor,
      shape:    isLong ? 'arrowDown' : 'arrowUp',
      text:     label,
      size:     1,
    };
  }

  #render() {
    if (!this.#cSeries) return;
    try {
      const toShow = this.#visible
        ? [...this.#markers].sort((a, b) => a.time - b.time)
        : [];
      this.#cSeries.setMarkers(toShow);
    } catch (_) {}
  }
}
