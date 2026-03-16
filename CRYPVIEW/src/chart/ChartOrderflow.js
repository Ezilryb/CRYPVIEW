// ============================================================
//  src/chart/ChartOrderflow.js — CrypView V2
//  Engine Orderflow : Delta par bougie + CVD (Cumulative Volume Delta).
//
//  Deux rendus simultanés :
//    1. Overlay canvas (barres ask/bid + texte delta sur chaque bougie)
//    2. Sous-graphique LightweightCharts (histogramme delta + ligne CVD)
//
//  Le sous-graphique est géré par ChartIndicators (ind 'of').
//  Ce module gère uniquement les données, le WS, et l'overlay canvas.
// ============================================================

import { TF_TO_MS, RENDER_THROTTLE_MS } from '../config.js';
import { createAggTradeStream }          from '../api/binance.ws.js';

export class ChartOrderflow {
  #chart;
  #cSeries;
  #container;
  #getSymTf;

  #data          = new Map(); // Map<candleTime, { askVol, bidVol, delta, trades }>
  #ws            = null;
  #canvas        = null;
  #active        = false;
  #redrawPending = false;
  #redrawSubs    = false;

  /**
   * @param {IChartApi}   chart
   * @param {ISeriesApi}  cSeries
   * @param {HTMLElement} container  — div#chart-container
   * @param {function(): {symbol:string, timeframe:string}} getSymTf
   */
  constructor(chart, cSeries, container, getSymTf) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#container = container;
    this.#getSymTf  = getSymTf;
  }

  // ── API publique ──────────────────────────────────────────

  /**
   * Active l'Orderflow.
   * Le sous-graphique LW est déjà monté par ChartIndicators ;
   * on reçoit ses séries pour les alimenter en live.
   *
   * @param {Candle[]}   candles
   * @param {IndState}   indState  — état de l'indicateur 'of' (ind.s.deltaHist, ind.s.cvdLine)
   */
  activate(candles, indState) {
    if (this.#active) return;
    this.#active = true;
    this.#ensureCanvas();
    this.#seed(candles);
    this.#connectWS(candles, indState);
    this.#subscribeRedraws(candles);
    this.#draw(candles);
  }

  deactivate() {
    if (!this.#active) return;
    this.#active     = false;
    this.#redrawSubs = false;
    this.#ws?.destroy();
    this.#ws = null;
    this.#data.clear();

    if (this.#canvas) {
      this.#canvas.getContext('2d').clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#canvas.style.display = 'none';
    }
  }

  /** Reconstruit les données depuis un nouveau jeu de bougies. */
  reconnect(candles, indState) {
    this.#data.clear();
    this.#redrawSubs = false;
    this.#ws?.destroy();
    this.#ws = null;
    this.#seed(candles);
    this.#connectWS(candles, indState);
    this.#subscribeRedraws(candles);
    this.#draw(candles);
  }

  /**
   * Réalimente le sous-graphique LW avec les données de la Map courante.
   * Appeler après un chargement d'historique ou refresh.
   * @param {Candle[]} candles
   * @param {IndState} indState
   */
  pushToChart(candles, indState) {
    if (!indState?.s) return;
    const { cvdLine, deltaHist } = this.#buildCVDSeries(candles);
    try { indState.s.cvdLine?.setData(cvdLine); }   catch (_) {}
    try { indState.s.deltaHist?.setData(deltaHist); } catch (_) {}
  }

  redraw(candles) {
    if (this.#active) this.#draw(candles);
  }

  isActive() { return this.#active; }

  destroy() {
    this.deactivate();
    this.#canvas?.remove();
    this.#canvas = null;
  }

  // ── Seed historique ───────────────────────────────────────

  #seed(candles) {
    this.#data.clear();
    for (const c of candles) {
      const isBull  = c.close >= c.open;
      const range   = c.high - c.low || 1;
      const askFrac = isBull
        ? (c.close - c.open) / range * 0.6 + 0.35
        : 0.35 - (c.open - c.close) / range * 0.25;
      const askVol = c.volume * Math.max(0.1, Math.min(0.9, askFrac));
      const bidVol = c.volume - askVol;
      this.#data.set(c.time, { askVol, bidVol, delta: askVol - bidVol, trades: 1 });
    }
  }

  // ── WebSocket aggTrades ───────────────────────────────────

  #connectWS(candles, indState) {
    const { symbol } = this.#getSymTf();
    this.#ws = createAggTradeStream(symbol);

    this.#ws.onMessage = (data) => {
      if (!this.#active) return;
      this.#addTrade(parseFloat(data.p), parseFloat(data.q), !data.m, data.T);

      // Mise à jour live du sous-graphique LW
      if (indState?.s && candles.length) {
        const last = candles.at(-1);
        const d    = this.#data.get(last.time);
        if (d) {
          try {
            indState.s.deltaHist?.update({ time: last.time, value: d.delta, color: d.delta >= 0 ? 'rgba(0,255,136,0.65)' : 'rgba(255,61,90,0.65)' });
          } catch (_) {}
          try {
            let cvd = 0;
            candles.forEach(c => { const dd = this.#data.get(c.time); if (dd) cvd += dd.delta; });
            indState.s.cvdLine?.update({ time: last.time, value: cvd });
          } catch (_) {}
        }
      }
      this.#schedRedraw();
    };

    this.#ws.connect();
  }

  #addTrade(price, qty, isBuy, tradeTimeMs) {
    const { timeframe } = this.#getSymTf();
    const tfMs       = TF_TO_MS[timeframe] ?? 60_000;
    const candleTime = Math.floor(tradeTimeMs / tfMs) * (tfMs / 1000);

    if (!this.#data.has(candleTime)) this.#data.set(candleTime, { askVol: 0, bidVol: 0, delta: 0, trades: 0 });
    const d = this.#data.get(candleTime);
    if (isBuy) d.askVol += qty; else d.bidVol += qty;
    d.delta  = d.askVol - d.bidVol;
    d.trades++;
  }

  // ── Construction séries CVD ───────────────────────────────

  #buildCVDSeries(candles) {
    let cvd = 0;
    const cvdLine   = [];
    const deltaHist = [];
    for (const c of candles) {
      const d     = this.#data.get(c.time);
      const delta = d?.delta ?? 0;
      cvd += delta;
      cvdLine.push({ time: c.time, value: cvd });
      deltaHist.push({ time: c.time, value: delta, color: delta >= 0 ? 'rgba(0,255,136,0.65)' : 'rgba(255,61,90,0.65)' });
    }
    return { cvdLine, deltaHist };
  }

  // ── Overlay canvas ────────────────────────────────────────

  #draw(candles) {
    if (!this.#canvas || !candles.length) return;
    const W = this.#container.clientWidth;
    const H = this.#container.clientHeight;
    this.#canvas.width  = W;
    this.#canvas.height = H;

    const ctx = this.#canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    const visRange = this.#chart.timeScale().getVisibleRange();
    const logRange = this.#chart.timeScale().getVisibleLogicalRange();
    if (!visRange || !logRange) return;

    const barsVisible = Math.max(1, logRange.to - logRange.from);
    const barWidthPx  = W / barsVisible;
    if (barWidthPx < 6) return;

    for (const c of candles) {
      if (c.time < visRange.from - 2 || c.time > visRange.to + 2) continue;
      const d = this.#data.get(c.time);
      if (!d) continue;

      const xCenter = this.#chart.timeScale().timeToCoordinate(c.time);
      const yHigh   = this.#cSeries.priceToCoordinate(c.high);
      const yLow    = this.#cSeries.priceToCoordinate(c.low);
      if (xCenter == null || yHigh == null || yLow == null) continue;

      const candleH = Math.abs(yLow - yHigh);
      if (candleH < 4) continue;

      const halfW    = Math.min(barWidthPx * 0.38, 22);
      const total    = d.askVol + d.bidVol || 1;
      const askH     = candleH * (d.askVol / total);
      const bidH     = candleH * (d.bidVol / total);
      const barX     = xCenter + halfW * 0.1;
      const barW     = Math.max(3, halfW * 0.6);

      ctx.fillStyle = 'rgba(255,61,90,0.30)';
      ctx.fillRect(barX, yLow - bidH, barW, bidH);
      ctx.fillStyle = 'rgba(0,255,136,0.30)';
      ctx.fillRect(barX, yLow - bidH - askH, barW, askH);

      if (barWidthPx >= 36) {
        const absDelta = Math.abs(d.delta);
        const txt = absDelta >= 1000 ? (absDelta / 1000).toFixed(1) + 'k' : absDelta.toFixed(1);
        ctx.font      = 'bold 7px Space Mono,monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = d.delta >= 0 ? 'rgba(0,255,136,0.90)' : 'rgba(255,61,90,0.90)';
        const yText = Math.min(yLow - 2, Math.max(yHigh + 10, (yHigh + yLow) / 2));
        ctx.fillText((d.delta >= 0 ? '+' : '-') + txt, xCenter, yText);
      }

      // Absorption : pression contraire à la direction de la bougie
      const ratio   = (d.askVol - d.bidVol) / total;
      const isBull  = c.close >= c.open;
      if ((ratio < -0.35 && isBull) || (ratio > 0.35 && !isBull)) {
        ctx.strokeStyle = 'rgba(255,200,0,0.55)';
        ctx.lineWidth   = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(xCenter - halfW, yHigh, halfW * 2, candleH);
        ctx.setLineDash([]);
      }
    }
  }

  // ── Abonnements de redessins ──────────────────────────────

  #subscribeRedraws(candles) {
    if (this.#redrawSubs) return;
    this.#redrawSubs = true;

    const redraw = () => { if (this.#active) this.#draw(candles); };
    this.#chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    this.#chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    this.#chart.subscribeCrosshairMove(redraw);

    new ResizeObserver(() => { if (this.#active) { this.#canvas.width = 0; this.#draw(candles); } })
      .observe(this.#container);

    let raf = false;
    new MutationObserver(() => {
      if (raf || !this.#active) return;
      raf = true;
      requestAnimationFrame(() => { raf = false; this.#draw(candles); });
    }).observe(this.#container, { attributes: true, attributeFilter: ['style'], subtree: true });
  }

  #schedRedraw() {
    if (this.#redrawPending) return;
    this.#redrawPending = true;
    setTimeout(() => {
      this.#redrawPending = false;
      this.#container.dispatchEvent(new CustomEvent('crypview:of:redraw', { bubbles: true }));
    }, RENDER_THROTTLE_MS);
  }

  #ensureCanvas() {
    let c = document.getElementById('of-canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'of-canvas';
      c.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:4;display:block;';
      this.#container.appendChild(c);
    }
    c.style.display = 'block';
    this.#canvas = c;
  }
}
