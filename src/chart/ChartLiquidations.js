// ============================================================
//  src/chart/ChartLiquidations.js — CrypView V3.7
//  Heatmap des liquidations en temps réel.
//
//  Source : Binance Futures WebSocket @forceOrder (zéro API key)
//  URL    : wss://fstream.binance.com/stream?streams=btcusdt@forceOrder
//
//  Principe :
//    1. Subscribe au stream forceOrder de Binance Futures
//    2. Accumule les liquidations dans des buckets de prix (N ticks)
//    3. Affiche un heatmap canvas overlay sur le chart principal
//       - Barres horizontales à gauche : hauteur ∝ USD liquidés
//       - Rouge  = longs liquidés (prix a baissé)
//       - Vert   = shorts liquidés (prix a monté)
//    4. Panneau de texte : flux des dernières liquidations
//
//  Cycle de vie :
//    const liq = new ChartLiquidations();
//    liq.activate(chart, cSeries, container, symbol);
//    liq.deactivate();
//    liq.destroy();
// ============================================================

import { RENDER_THROTTLE_MS } from '../config.js';

const FSTREAM_BASE  = 'wss://fstream.binance.com/stream?streams=';
const PING_TIMEOUT  = 35_000;
const BACKOFF_BASE  = 1_000;
const BACKOFF_MAX   = 30_000;
const MAX_BUCKETS   = 200;  // nombre max de niveaux de prix
const RETENTION_MS  = 4 * 60 * 60 * 1_000; // garder 4h de données
const RECENT_MAX    = 30;   // flux live affiché

/** Nombre de buckets de prix visibles simultanément */
const VISIBLE_RANGE_FACTOR = 0.30; // 30% de la range visible

export class ChartLiquidations {
  #chart;
  #cSeries;
  #container;
  #symbol;

  /** Map<number, LiqBucket> : key = prix arrondi au bucket */
  #buckets = new Map();

  /** Dernières liquidations pour le flux live */
  #recent  = [];

  #canvas  = null;
  #active  = false;

  #ws         = null;
  #pingTimer  = null;
  #retryTimer = null;
  #retries    = 0;
  #destroyed  = false;

  #redrawPending = false;
  #resizeObs     = null;

  // ── API publique ──────────────────────────────────────────

  /**
   * Active la heatmap sur le chart courant.
   * @param {IChartApi}   chart
   * @param {ISeriesApi}  cSeries
   * @param {HTMLElement} container
   * @param {string}      symbol
   */
  activate(chart, cSeries, container, symbol) {
    if (this.#active) return;
    this.#chart     = chart;
    this.#cSeries   = cSeries;
    this.#container = container;
    this.#symbol    = symbol.toLowerCase();
    this.#active    = true;

    this.#ensureCanvas();
    this.#connectWS();
    this.#subscribeRedraws();
  }

  /** Met à jour le symbole (reconnexion WS). */
  setSymbol(symbol) {
    if (!this.#active) return;
    this.#symbol  = symbol.toLowerCase();
    this.#buckets.clear();
    this.#recent  = [];
    this.#disconnectWS();
    this.#connectWS();
  }

  deactivate() {
    if (!this.#active) return;
    this.#active = false;
    this.#disconnectWS();
    this.#resizeObs?.disconnect();
    this.#resizeObs = null;
    if (this.#canvas) {
      this.#canvas.getContext('2d').clearRect(0, 0, this.#canvas.width, this.#canvas.height);
      this.#canvas.style.display = 'none';
    }
    this.#removeFluxPanel();
  }

  destroy() {
    this.#destroyed = true;
    this.deactivate();
    this.#canvas?.remove();
    this.#canvas = null;
    this.#buckets.clear();
    this.#recent = [];
  }

  isActive() { return this.#active; }

  /** @returns {Map<number, LiqBucket>} copie des buckets courants */
  getBuckets() { return new Map(this.#buckets); }

  // ── WebSocket Binance @forceOrder ─────────────────────────

  #connectWS() {
    if (this.#destroyed) return;
    const stream = `${this.#symbol}@forceOrder`;
    this.#ws     = new WebSocket(`${FSTREAM_BASE}${stream}`);

    this.#ws.onopen = () => {
      this.#retries = 0;
      this.#resetPing();
    };

    this.#ws.onmessage = ({ data }) => {
      this.#resetPing();
      try {
        const msg = JSON.parse(data);
        // @forceOrder : msg.data.o contient l'ordre liquidé
        const o = msg?.data?.o;
        if (o) this.#handleLiquidation(o);
      } catch (_) {}
    };

    this.#ws.onerror = () => {};
    this.#ws.onclose = () => {
      this.#clearPing();
      if (this.#active && !this.#destroyed) this.#scheduleRetry();
    };
  }

  #disconnectWS() {
    this.#clearPing();
    if (this.#retryTimer !== null) { clearTimeout(this.#retryTimer); this.#retryTimer = null; }
    if (this.#ws) {
      this.#ws.onopen = this.#ws.onmessage = this.#ws.onerror = this.#ws.onclose = null;
      try { this.#ws.close(); } catch (_) {}
      this.#ws = null;
    }
  }

  #resetPing() {
    this.#clearPing();
    this.#pingTimer = setTimeout(() => {
      if (this.#ws) try { this.#ws.close(); } catch (_) {}
    }, PING_TIMEOUT);
  }
  #clearPing() {
    if (this.#pingTimer !== null) { clearTimeout(this.#pingTimer); this.#pingTimer = null; }
  }

  #scheduleRetry() {
    const delay = Math.min(BACKOFF_MAX, BACKOFF_BASE * Math.pow(2, this.#retries++));
    this.#retryTimer = setTimeout(() => this.#connectWS(), delay);
  }

  // ── Traitement d'une liquidation ─────────────────────────

  /**
   * @param {{ S: string, q: string, ap: string, T: number }} o — order liquidation
   *   S   = side BUY (long liq) | SELL (short liq)
   *   q   = qty
   *   ap  = average filled price
   *   T   = timestamp ms
   */
  #handleLiquidation(o) {
    const side  = o.S;        // 'BUY' = shorts liquidés | 'SELL' = longs liquidés
    const price = parseFloat(o.ap || o.p);
    const qty   = parseFloat(o.q);
    const usd   = price * qty;
    const ts    = o.T ?? Date.now();

    if (!price || !qty || usd < 1) return;

    // Nettoie les données trop anciennes
    this.#pruneOld(ts);

    // Calcule le bucket de prix
    const tick   = this.#tickSize(price);
    const bucket = Math.floor(price / tick) * tick;

    if (!this.#buckets.has(bucket)) {
      this.#buckets.set(bucket, { price: bucket, longs: 0, shorts: 0, total: 0, ts: [] });
    }
    const b = this.#buckets.get(bucket);
    b.total += usd;
    b.ts.push(ts);

    if (side === 'SELL') {
      // Longs liquidés : le prix a baissé → rouge
      b.longs += usd;
    } else {
      // Shorts liquidés : le prix a monté → vert
      b.shorts += usd;
    }

    // Flux live
    this.#recent.unshift({
      ts,
      price,
      usd,
      side,
      sym: this.#symbol.replace('usdt', '').toUpperCase(),
    });
    if (this.#recent.length > RECENT_MAX) this.#recent.pop();

    this.#schedRedraw();
    this.#updateFluxPanel();
  }

  #pruneOld(now) {
    const cutoff = now - RETENTION_MS;
    for (const [key, b] of this.#buckets) {
      b.ts = b.ts.filter(t => t > cutoff);
      if (!b.ts.length) this.#buckets.delete(key);
    }
    if (this.#buckets.size > MAX_BUCKETS) {
      const oldest = [...this.#buckets.keys()].sort((a, b) => a - b)[0];
      this.#buckets.delete(oldest);
    }
  }

  // ── Rendu Canvas ─────────────────────────────────────────

  #draw() {
    if (!this.#canvas || !this.#cSeries || !this.#chart) return;

    const W = this.#container.clientWidth;
    const H = this.#container.clientHeight;
    this.#canvas.width  = W;
    this.#canvas.height = H;

    const ctx = this.#canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    if (!this.#buckets.size) return;

    // ── Calcul de l'échelle ───────────────────────────────
    const allUSD = [...this.#buckets.values()].map(b => b.total);
    const maxUSD = Math.max(...allUSD, 1);

    const BAR_MAX_W = Math.min(W * 0.14, 80); // Largeur max d'une barre

    for (const [, b] of this.#buckets) {
      const yTop = this.#cSeries.priceToCoordinate(b.price + this.#tickSize(b.price));
      const yBot = this.#cSeries.priceToCoordinate(b.price);
      if (yTop == null || yBot == null) continue;

      const h     = Math.max(1, Math.abs(yBot - yTop));
      const y     = Math.min(yTop, yBot);
      const ratio = b.total / maxUSD;

      // Intensité en fonction du montant
      const alpha = 0.15 + ratio * 0.75;
      const wBar  = ratio * BAR_MAX_W;

      // Background total (gris)
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.08})`;
      ctx.fillRect(0, y, wBar, h);

      // Portion longs (rouge)
      if (b.longs > 0) {
        const wLong = (b.longs / b.total) * wBar;
        ctx.fillStyle = `rgba(255,61,90,${alpha})`;
        ctx.fillRect(0, y, wLong, h);
      }

      // Portion shorts (vert)
      if (b.shorts > 0) {
        const wShort = (b.shorts / b.total) * wBar;
        const xShort  = (b.longs / b.total) * wBar;
        ctx.fillStyle = `rgba(0,255,136,${alpha})`;
        ctx.fillRect(xShort, y, wShort, h);
      }

      // Label montant (si visible et assez grand)
      if (h >= 8 && wBar >= 20 && ratio > 0.1) {
        const label = this.#fmtUSD(b.total);
        ctx.font = 'bold 7px Space Mono,monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = `rgba(255,255,255,${0.7 * alpha})`;
        ctx.fillText(label, wBar + 3, y + h / 2 + 3);
      }
    }
  }

  // ── Panneau flux live ─────────────────────────────────────

  #updateFluxPanel() {
    let panel = document.getElementById('liq-flux-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'liq-flux-panel';
      panel.setAttribute('aria-label', 'Flux des liquidations en temps réel');
      panel.style.cssText = [
        'position:absolute', 'top:8px', 'right:8px', 'z-index:25',
        'background:rgba(7,10,15,0.82)',
        'border:1px solid var(--border)',
        'border-radius:6px', 'padding:5px 8px',
        'max-height:160px', 'overflow:hidden',
        'font-family:\'Space Mono\',monospace',
        'font-size:9px', 'width:170px',
        'pointer-events:none',
        'box-shadow:0 4px 16px rgba(0,0,0,.7)',
      ].join(';');
      this.#container.appendChild(panel);
    }

    panel.innerHTML = `
      <div style="font-size:8px;color:var(--muted);text-transform:uppercase;
                  letter-spacing:.8px;margin-bottom:4px;">
        🔥 Liquidations live
      </div>
      ${this.#recent.slice(0, 8).map(l => {
        const isLong  = l.side === 'SELL'; // SELL = longs liquidés
        const color   = isLong ? '#ff3d5a' : '#00ff88';
        const icon    = isLong ? '🔴' : '🟢';
        const label   = isLong ? 'LONG' : 'SHORT';
        const usdStr  = this.#fmtUSD(l.usd);
        const priceStr = l.price > 1000
          ? l.price.toFixed(1)
          : l.price.toFixed(4);
        return `<div style="display:flex;align-items:center;gap:5px;
                            padding:2px 0;border-bottom:1px solid rgba(28,35,51,.5);">
          <span>${icon}</span>
          <span style="color:${color};font-weight:700;flex-shrink:0;">${label}</span>
          <span style="color:var(--muted);flex:1;text-align:right;">${priceStr}</span>
          <span style="color:var(--yellow);flex-shrink:0;">${usdStr}</span>
        </div>`;
      }).join('')}
    `;
  }

  #removeFluxPanel() {
    document.getElementById('liq-flux-panel')?.remove();
  }

  // ── Abonnements de redessins ──────────────────────────────

  #subscribeRedraws() {
    const redraw = () => { if (this.#active) this.#draw(); };
    this.#chart.timeScale().subscribeVisibleTimeRangeChange(redraw);
    this.#chart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
    this.#chart.subscribeCrosshairMove(redraw);

    this.#resizeObs = new ResizeObserver(() => {
      if (this.#active) this.#draw();
    });
    this.#resizeObs.observe(this.#container);
  }

  #schedRedraw() {
    if (this.#redrawPending) return;
    this.#redrawPending = true;
    setTimeout(() => {
      this.#redrawPending = false;
      if (this.#active) this.#draw();
    }, RENDER_THROTTLE_MS);
  }

  // ── Helpers ───────────────────────────────────────────────

  #ensureCanvas() {
    let c = this.#container.querySelector('#liq-canvas');
    if (!c) {
      c = document.createElement('canvas');
      c.id = 'liq-canvas';
      c.setAttribute('aria-hidden', 'true');
      c.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:6;';
      this.#container.appendChild(c);
    }
    c.style.display = 'block';
    this.#canvas = c;
  }

  #tickSize(price) {
    if (price >= 10_000) return 50;
    if (price >= 1_000)  return 5;
    if (price >= 100)    return 0.5;
    if (price >= 10)     return 0.05;
    return 0.001;
  }

  #fmtUSD(v) {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M$';
    if (v >= 1_000)     return (v / 1_000).toFixed(1) + 'k$';
    return v.toFixed(0) + '$';
  }
}

/**
 * @typedef {object} LiqBucket
 * @property {number}   price
 * @property {number}   longs   — USD de longs liquidés
 * @property {number}   shorts  — USD de shorts liquidés
 * @property {number}   total   — longs + shorts
 * @property {number[]} ts      — timestamps des événements
 */
