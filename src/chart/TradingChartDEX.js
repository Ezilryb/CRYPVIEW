// ============================================================
//  src/chart/TradingChartDEX.js — CrypView V3.7
//  Adaptateur DEX : charge les OHLCV depuis GeckoTerminal
//  et les expose via la même interface que TradingChart.
//
//  Limitations vs TradingChart :
//    - Pas de WebSocket live (données statiques polling)
//    - Rafraîchissement toutes les 60s (rate limit GT)
//    - Pas de stream de trades / ticker 24h
//    - Timeframes limités : minute, hour, day
//
//  Usage :
//    const chart = new TradingChartDEX(container, pool, '1h');
//    await chart.start();
//    chart.destroy();
// ============================================================

import { LightweightCharts } from '../utils/lw.js';
import {
  COLORS, MAX_CANDLES_IN_MEMORY, baseChartOptions, CHART_THEMES,
} from '../config.js';
import {
  fetchDEXOHLCV,
  SUPPORTED_NETWORKS,
} from '../api/geckoterminal.js';
import { showToast } from '../utils/toast.js';
import { fmtPrice }  from '../utils/format.js';

const REFRESH_INTERVAL_MS = 60_000; // GeckoTerminal rate limit : ~30 req/min

export class TradingChartDEX {
  symbol;      // format "dex:network:address"
  timeframe;
  candles = [];

  chart   = null;
  cSeries = null;
  vSeries = null;

  /** Pool DEX courant */
  #pool;

  #refreshTimer   = null;
  #resizeObserver = null;
  #container      = null;
  #themeHandler   = null;
  #lastPrice      = null;
  #badge = null;

  /** @param {HTMLElement}      container */
  /** @param {DEXPool}          pool */
  /** @param {string}           [timeframe='1h'] */
  constructor(container, pool, timeframe = '1h') {
    this.#container = container;
    this.#pool      = pool;
    this.symbol     = `dex:${pool.network}:${pool.address}`;
    this.timeframe  = timeframe;
    this.#initChart();
  }

  // ── API publique ──────────────────────────────────────────

  async start() {
    this.#emitStatus('loading');
    await this.#load();
    this.#startRefresh();
  }

  async changeTimeframe(tf) {
    this.timeframe = tf;
    this.candles   = [];
    await this.#load();
  }

  get poolName()    { return this.#pool.name; }
  get poolNetwork() { return this.#pool.network; }
  get isLive()      { return false; } // DEX = polling uniquement

  destroy() {
    document.removeEventListener('crypview:theme:change', this.#themeHandler);
    this.#stopRefresh();
    this.#resizeObserver?.disconnect();
    this.#badge?.remove();      // ← ajout
    this.#badge = null;         // ← ajout
    try { this.chart?.remove(); } catch (_) {}
    this.chart   = null;
    this.cSeries = null;
    this.vSeries = null;
    this.candles = [];
  }

  // ── Privé ─────────────────────────────────────────────────

  #initChart() {
    if (this.chart) { try { this.chart.remove(); } catch (_) {} }

    const opts = baseChartOptions(this.#container);
    opts.rightPriceScale.scaleMargins = { top: 0.08, bottom: 0.22 };
    this.chart = LightweightCharts.createChart(this.#container, opts);

    this.cSeries = this.chart.addCandlestickSeries({
      upColor:         COLORS.GREEN,
      downColor:       COLORS.RED,
      borderUpColor:   COLORS.GREEN,
      borderDownColor: COLORS.RED,
      wickUpColor:     COLORS.GREEN_MID,
      wickDownColor:   COLORS.RED_MID,
    });

    this.vSeries = this.chart.addHistogramSeries({
      priceFormat:  { type: 'volume' },
      priceScaleId: 'vol',
    });
    this.chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.83, bottom: 0 },
    });

    // Badge DEX visible sur le chart
    this.#addDEXBadge();

    // Thème
    const initTheme = localStorage.getItem('crypview-theme') ?? 'dark';
    this.chart.applyOptions(CHART_THEMES[initTheme] ?? CHART_THEMES.dark);

    this.#themeHandler = ({ detail }) => {
      this.chart?.applyOptions(CHART_THEMES[detail.theme] ?? CHART_THEMES.dark);
    };
    document.addEventListener('crypview:theme:change', this.#themeHandler);

    // Resize
    this.#resizeObserver = new ResizeObserver(() => {
      this.chart?.applyOptions({
        width:  this.#container.clientWidth,
        height: this.#container.clientHeight,
      });
    });
    this.#resizeObserver.observe(this.#container);
  }

  async #load() {
    try {
      const raw = await fetchDEXOHLCV(
        this.#pool.network,
        this.#pool.address,
        this.timeframe,
        MAX_CANDLES_IN_MEMORY,
      );

      if (!raw.length) {
        showToast(`${this.#pool.name} — aucune donnée OHLCV`, 'warning');
        return;
      }

      this.candles = raw;
      this.cSeries.setData(raw.map(c => ({
        time: c.time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));
      this.vSeries.setData(raw.map(c => ({
        time:  c.time,
        value: c.volume,
        color: c.close >= c.open ? COLORS.GREEN_ALPHA : COLORS.RED_ALPHA,
      })));

      this.#lastPrice = raw.at(-1)?.close ?? null;
      this.#emitStatus('live');
      this.#emitHistoryLoaded();
      this.#updatePriceDisplay(this.#lastPrice);

    } catch (err) {
      showToast(`DEX OHLCV erreur : ${err.message}`, 'error');
      this.#emitStatus('offline');
    }
  }

  #startRefresh() {
    this.#stopRefresh();
    this.#refreshTimer = setInterval(() => this.#load(), REFRESH_INTERVAL_MS);
  }

  #stopRefresh() {
    if (this.#refreshTimer !== null) {
      clearInterval(this.#refreshTimer);
      this.#refreshTimer = null;
    }
  }

  #addDEXBadge() {
    this.#badge?.remove();
    
    const badge = document.createElement('div');
    badge.style.cssText = `
      position:absolute; bottom:8px; right:8px; z-index:20;
      background:rgba(224,64,251,.12); border:1px solid rgba(224,64,251,.3);
      border-radius:4px; padding:3px 8px;
      font-family:'Space Mono',monospace; font-size:8px;
      color:#e040fb; letter-spacing:.5px; pointer-events:none;
    `;
    const net = SUPPORTED_NETWORKS[this.#pool.network];
    badge.textContent = `🔗 DEX ${net?.label ?? this.#pool.network} · ${this.#pool.dex?.toUpperCase() ?? 'AMM'} · ⟳ 60s`;
    this.#container.style.position = 'relative';
    this.#container.appendChild(badge);
    this.#badge = badge;
  }

  #updatePriceDisplay(price) {
    if (!price) return;
    const direction = this.#lastPrice === null ? 'neutral'
      : price > this.#lastPrice ? 'up'
      : price < this.#lastPrice ? 'down'
      : 'neutral';

    this.#container.dispatchEvent(new CustomEvent('crypview:price:display', {
      bubbles: true,
      detail: {
        price,
        priceFormatted: fmtPrice(price),
        direction,
        pctChange:    this.#pool.priceChange24h,
        pctFormatted: (this.#pool.priceChange24h >= 0 ? '+' : '') +
                       this.#pool.priceChange24h.toFixed(2) + '%',
      },
    }));
  }

  #emitStatus(state) {
    this.#container.dispatchEvent(new CustomEvent('crypview:status', {
      bubbles: true,
      detail: { state, symbol: this.symbol, timeframe: this.timeframe },
    }));
  }

  #emitHistoryLoaded() {
    this.#container.dispatchEvent(new CustomEvent('crypview:history:loaded', {
      bubbles: true,
      detail: { candles: this.candles },
    }));
  }
}

/** @typedef {import('../api/geckoterminal.js').DEXPool} DEXPool */
