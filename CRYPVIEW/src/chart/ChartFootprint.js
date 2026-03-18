// ============================================================
//  src/chart/ChartFootprint.js — CrypView V2
//  Engine Footprint Chart (ask/bid par niveau de prix).
//
//  Cycle de vie :
//    new ChartFootprint(chart, cSeries, container, getSymTf)
//    .activate(candles)   → seed historique + WS + canvas
//    .deactivate()        → coupe WS + efface canvas + observers
//    .redraw(candles)     → redessine sur demande
//    .destroy()           → libère tout
// ============================================================

import { TF_TO_MS, RENDER_THROTTLE_MS } from '../config.js';
import { createAggTradeStream }          from '../api/binance.ws.js';

export class ChartFootprint {
  #chart;
  #cSeries;
  #container;
  #getSymTf;    // () => { symbol, timeframe }

  #data     = new Map(); // Map<candleTime, Map<bucketKey, Bucket>>
  #ws       = null;
  #canvas   = null;
  #active   = false;
  #redrawPending = false;
  #redrawSubs    = false;

  // ── Observers — stockés pour pouvoir les déconnecter ─────
  #resizeObs2 = null;   // ResizeObserver créé dans #subscribeRedraws()
  #mutObs     = null;   // MutationObserver créé dans #subscribeRedraws()

  /**
   * @param {IChartApi}   chart
   * @param {ISeriesApi}  cSeries
   * @param {HTMLElement} container   — div#chart-container
   * @param {function(): {symbol:string, timeframe:string}} getSymTf
   */
  constructor(chart, cSeries, container, getSymTf) {
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#container = container;
    this.#getSymTf  = getSymTf;
  }

  // ── API publique ──────────────────────────────────────────

  activate(candles) {
    if (this.#active) return;
    this.#active = true;
    this.#ensureCanvas();
    document.getElementById('fp-legend')?.classList.add('visible');

    this.#seed(candles);
    this.#connectWS();
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

    // ── Nettoyage des observers ───────────────────────────
    this.#resizeObs2?.disconnect();
    this.#resizeObs2 = null;
    this.#mutObs?.disconnect();
    this.#mutObs = null;

    document.getElementById('fp-legend')?.classList.remove('visible');
    if (this.#canvas) {
      this.#canvas.getContext('2d').clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#canvas.style.display = 'none';
    }
  }

  redraw(candles) {
    if (this.#active) this.#draw(candles);
  }

  /** Reconnexion complète après changement de symbole/TF. */
  reconnect(candles) {
    this.#data.clear();
    this.#redrawSubs = false;

    // Déconnecte les anciens observers avant de les recréer
    this.#resizeObs2?.disconnect();
    this.#resizeObs2 = null;
    this.#mutObs?.disconnect();
    this.#mutObs = null;

    this.#ws?.destroy();
    this.#ws = null;
    this.#seed(candles);
    this.#connectWS();
    this.#subscribeRedraws(candles);
    this.#draw(candles);
  }

  isActive() { return this.#active; }

  destroy() {
    this.deactivate();      // déconnecte WS + observers + efface canvas
    this.#canvas?.remove();
    this.#canvas = null;
  }

  // ── Seed historique ───────────────────────────────────────

  /**
   * Approxime les données Footprint depuis les bougies OHLCV.
   * Ask concentré en haut (bougie haussière), bid en bas (baissière).
   */
  #seed(candles) {
    this.#data.clear();
    for (const c of candles) {
      const tick    = this.#tickSize(c.close);
      const nBkts   = Math.max(1, Math.ceil((c.high - c.low) / tick));
      const step    = (c.high - c.low) / nBkts;
      const isBull  = c.close >= c.open;
      const map     = new Map();

      for (let i = 0; i < nBkts; i++) {
        const priceLo  = c.low + i * step;
        const priceHi  = priceLo + step;
        const priceMid = (priceLo + priceHi) / 2;
        const ratio    = (priceMid - c.low) / ((c.high - c.low) || 1);
        const askRatio = isBull ? 0.3 + ratio * 0.7 : 0.7 - ratio * 0.4;
        const vol      = c.volume / nBkts;
        const key      = parseFloat(priceLo.toFixed(10));
        map.set(key, {
          priceLo: key,
          priceHi: parseFloat(priceHi.toFixed(10)),
          askVol:  vol * askRatio,
          bidVol:  vol * (1 - askRatio),
        });
      }
      this.#data.set(c.time, map);
    }
  }

  // ── WebSocket aggTrades ───────────────────────────────────

  #connectWS() {
    const { symbol } = this.#getSymTf();
    this.#ws = createAggTradeStream(symbol);
    this.#ws.onMessage = (data) => {
      if (!this.#active) return;
      this.#addTrade(parseFloat(data.p), parseFloat(data.q), !data.m, data.T);
      this.#schedRedraw();
    };
    this.#ws.connect();
  }

  #addTrade(price, qty, isBuy, tradeTimeMs) {
    const { timeframe } = this.#getSymTf();
    const tfMs       = TF_TO_MS[timeframe] ?? 60_000;
    const candleTime = Math.floor(tradeTimeMs / tfMs) * (tfMs / 1000);
    const tick       = this.#tickSize(price);
    const bucketKey  = parseFloat((Math.floor(price / tick) * tick).toFixed(10));

    if (!this.#data.has(candleTime)) this.#data.set(candleTime, new Map());
    const buckets = this.#data.get(candleTime);

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, { priceLo: bucketKey, priceHi: bucketKey + tick, askVol: 0, bidVol: 0 });
    }
    const b = buckets.get(bucketKey);
    if (isBuy) b.askVol += qty; else b.bidVol += qty;
  }

  // ── Dessin canvas ─────────────────────────────────────────

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
    const showText    = barWidthPx >= 28;
    const FONT_SIZE   = 8;
    ctx.font      = `bold ${FONT_SIZE}px Space Mono,monospace`;
    ctx.textAlign = 'center';

    for (const candle of candles) {
      if (candle.time < visRange.from - 2 || candle.time > visRange.to + 2) continue;
      const buckets = this.#data.get(candle.time);
      if (!buckets?.size) continue;

      const xCenter = this.#chart.timeScale().timeToCoordinate(candle.time);
      const yHigh   = this.#cSeries.priceToCoordinate(candle.high);
      const yLow    = this.#cSeries.priceToCoordinate(candle.low);
      if (xCenter == null || yHigh == null || yLow == null) continue;

      const candleH = Math.abs(yLow - yHigh);
      if (candleH < 2) continue;

      let maxVol = 0;
      buckets.forEach(b => { const t = b.askVol + b.bidVol; if (t > maxVol) maxVol = t; });
      if (maxVol === 0) continue;

      const halfBar = Math.min(barWidthPx * 0.45, 28);

      buckets.forEach(b => {
        const yTop = this.#cSeries.priceToCoordinate(b.priceHi);
        const yBot = this.#cSeries.priceToCoordinate(b.priceLo);
        if (yTop == null || yBot == null) return;

        const y     = Math.min(yTop, yBot);
        const h     = Math.max(1, Math.abs(yBot - yTop) - 0.5);
        const total = b.askVol + b.bidVol;
        const delta = b.askVol - b.bidVol;
        const ratio = total > 0 ? delta / total : 0;

        ctx.fillStyle = ratio > 0
          ? `rgba(0,255,136,${Math.min(0.35, ratio * 0.35)})`
          : `rgba(255,61,90,${Math.min(0.35, -ratio * 0.35)})`;
        ctx.fillRect(xCenter - halfBar, y, halfBar * 2, h);

        const isImb = (b.bidVol > 0 && b.askVol / b.bidVol >= 3) || (b.askVol > 0 && b.bidVol / b.askVol >= 3);
        if (isImb) {
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth   = 0.8;
          ctx.strokeRect(xCenter - halfBar + 0.5, y + 0.5, halfBar * 2 - 1, h - 1);
        }

        if (showText && h >= 8) {
          const fmt = v => v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(1);
          ctx.fillStyle = 'rgba(0,255,136,0.9)';
          ctx.fillText(fmt(b.askVol), xCenter - halfBar / 2, y + h / 2 + FONT_SIZE / 3);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth   = 0.5;
          ctx.beginPath(); ctx.moveTo(xCenter, y); ctx.lineTo(xCenter, y + h); ctx.stroke();
          ctx.fillStyle = 'rgba(255,61,90,0.9)';
          ctx.fillText(fmt(b.bidVol), xCenter + halfBar / 2, y + h / 2 + FONT_SIZE / 3);
        } else if (!showText) {
          ctx.fillStyle = 'rgba(0,255,136,0.55)';
          ctx.fillRect(xCenter - halfBar, y + 1, (b.askVol / maxVol) * halfBar, h - 2);
          ctx.fillStyle = 'rgba(255,61,90,0.55)';
          ctx.fillRect(xCenter, y + 1, (b.bidVol / maxVol) * halfBar, h - 2);
        }
      });
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

    // ── ResizeObserver — stocké pour disconnect() dans deactivate() ──
    this.#resizeObs2 = new ResizeObserver(() => {
      if (this.#active) { this.#canvas.width = 0; this.#draw(candles); }
    });
    this.#resizeObs2.observe(this.#container);

    // ── MutationObserver — stocké pour disconnect() dans deactivate() ──
    let raf = false;
    this.#mutObs = new MutationObserver(() => {
      if (raf || !this.#active) return;
      raf = true;
      requestAnimationFrame(() => { raf = false; this.#draw(candles); });
    });
    this.#mutObs.observe(this.#container, {
      attributes:      true,
      attributeFilter: ['style'],
      subtree:         true,
    });
  }

  #schedRedraw() {
    if (this.#redrawPending) return;
    this.#redrawPending = true;
    setTimeout(() => {
      this.#redrawPending = false;
      this.#container.dispatchEvent(new CustomEvent('crypview:fp:redraw', { bubbles: true }));
    }, RENDER_THROTTLE_MS);
  }

  // ── Helpers ───────────────────────────────────────────────

  #tickSize(price) {
    if (price >= 10000) return 10;
    if (price >= 1000)  return 1;
    if (price >= 100)   return 0.1;
    if (price >= 10)    return 0.01;
    if (price >= 1)     return 0.001;
    return 0.0001;
  }

  #ensureCanvas() {
    let c = document.getElementById('fp-canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'fp-canvas';
      c.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:3;';
      this.#container.appendChild(c);
    }
    c.style.display = 'block';
    this.#canvas = c;
  }
}
